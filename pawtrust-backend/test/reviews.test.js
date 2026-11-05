import request from "supertest";
import { expect } from "chai";
import jwt from "jsonwebtoken";
import mongodb from "mongodb";
import app from "../server.js";
import { testDb } from "./setup.js";

const { ObjectId } = mongodb;

const OWNER_ID = new ObjectId().toString();
const OTHER_OWNER_ID = new ObjectId().toString();
const SITTER_ID = new ObjectId().toString();
const OTHER_SITTER_ID = new ObjectId().toString();

const tokenFor = (id, userType, options = {}) =>
  jwt.sign({ sub: id, userType }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "1d", ...options });
const auth = (token) => ({ Authorization: `Bearer ${token}` });
const OWNER = auth(tokenFor(OWNER_ID, "owner"));
const OTHER_OWNER = auth(tokenFor(OTHER_OWNER_ID, "owner"));
const SITTER = auth(tokenFor(SITTER_ID, "sitter"));
const OTHER_SITTER = auth(tokenFor(OTHER_SITTER_ID, "sitter"));
const EXPIRED = auth(tokenFor(OWNER_ID, "owner", { expiresIn: -10 }));

async function insertTask(overrides = {}) {
  const now = new Date();
  const { insertedId } = await testDb.collection("tasks").insertOne({
    ownerId: new ObjectId(OWNER_ID),
    petType: "Dog",
    description: "Walk Max",
    date: now,
    duration: 1,
    location: "Seattle",
    status: "finished",
    acceptedSitterId: new ObjectId(SITTER_ID),
    reviewed: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
  return insertedId.toString();
}

const postReview = (headers, body) => request(app).post("/pawtrust/reviews").set(headers).send(body);

function itRejectsBadTokens(send) {
  for (const [label, headers] of [
    ["no token", {}],
    ["invalid token", auth("not.a.jwt")],
    ["expired token", EXPIRED],
  ]) {
    it(`401 with ${label}`, async () => {
      const res = await send(headers);
      expect(res.status).to.equal(401);
      expect(res.body).to.deep.equal({ error: "Unauthorized" });
    });
  }
}

describe("Reviews API", () => {
  beforeEach(async () => {
    await testDb.collection("tasks").deleteMany({});
    await testDb.collection("reviews").deleteMany({});
  });

  describe("POST /pawtrust/reviews", () => {
    let taskId;
    beforeEach(async () => {
      taskId = await insertTask();
    });

    it("creates a review for the accepted sitter and marks the task reviewed", async () => {
      const res = await postReview(OWNER, {
        taskId,
        rating: 4,
        comment: "  Great with Max  ",
        ownerId: OTHER_OWNER_ID,
        sitterId: OTHER_SITTER_ID,
      });
      expect(res.status).to.equal(201);
      expect(res.body).to.include({ taskId, ownerId: OWNER_ID, sitterId: SITTER_ID, rating: 4, comment: "Great with Max" });
      expect(res.body).to.have.property("createdAt");

      const task = await testDb.collection("tasks").findOne({ _id: new ObjectId(taskId) });
      expect(task.reviewed).to.equal(true);
      const stored = await testDb.collection("reviews").findOne({ taskId: new ObjectId(taskId) });
      expect(stored.ownerId.toString()).to.equal(OWNER_ID); // body ownerId ignored
      expect(stored.sitterId.toString()).to.equal(SITTER_ID); // body sitterId ignored
    });

    it("accepts a missing comment and a 500-character comment", async () => {
      expect((await postReview(OWNER, { taskId, rating: 5 })).body.comment).to.equal("");
      const other = await insertTask();
      expect((await postReview(OWNER, { taskId: other, rating: 1, comment: "a".repeat(500) })).status).to.equal(201);
    });

    describe("invalid input → 400", () => {
      const cases = [
        ["missing taskId", () => ({ rating: 4 })],
        ["malformed taskId", () => ({ taskId: "123", rating: 4 })],
        ["taskId as object (NoSQL injection)", () => ({ taskId: { $ne: null }, rating: 4 })],
        ["missing rating", (id) => ({ taskId: id })],
        ["rating 0", (id) => ({ taskId: id, rating: 0 })],
        ["rating 6", (id) => ({ taskId: id, rating: 6 })],
        ["decimal rating", (id) => ({ taskId: id, rating: 3.5 })],
        ["string rating", (id) => ({ taskId: id, rating: "4" })],
        ["comment over 500 characters", (id) => ({ taskId: id, rating: 4, comment: "a".repeat(501) })],
        ["non-string comment", (id) => ({ taskId: id, rating: 4, comment: 7 })],
      ];
      for (const [label, body] of cases) {
        it(label, async () => {
          const res = await postReview(OWNER, body(taskId));
          expect(res.status).to.equal(400);
          expect(res.body.error).to.be.a("string");
          expect(await testDb.collection("reviews").countDocuments()).to.equal(0);
        });
      }
    });

    for (const [label, overrides] of [
      ["an open task", { status: "open", acceptedSitterId: null }],
      ["an assigned task", { status: "assigned" }],
      ["a finished task without an accepted sitter", { acceptedSitterId: null }],
    ]) {
      it(`400 for ${label} (BR-6)`, async () => {
        const id = await insertTask(overrides);
        const res = await postReview(OWNER, { taskId: id, rating: 4 });
        expect(res.status).to.equal(400);
        const task = await testDb.collection("tasks").findOne({ _id: new ObjectId(id) });
        expect(task.reviewed).to.equal(false);
      });
    }

    it("403 for another owner's task", async () => {
      const res = await postReview(OTHER_OWNER, { taskId, rating: 4 });
      expect(res.status).to.equal(403);
      expect(await testDb.collection("reviews").countDocuments()).to.equal(0);
    });

    it("403 for a sitter", async () => {
      expect((await postReview(SITTER, { taskId, rating: 4 })).status).to.equal(403);
    });

    it("404 for a task that does not exist", async () => {
      expect((await postReview(OWNER, { taskId: new ObjectId().toString(), rating: 4 })).status).to.equal(404);
    });

    it("409 when the task is reviewed twice (BR-6)", async () => {
      expect((await postReview(OWNER, { taskId, rating: 4 })).status).to.equal(201);
      const res = await postReview(OWNER, { taskId, rating: 2 });
      expect(res.status).to.equal(409);
      const stored = await testDb.collection("reviews").find().toArray();
      expect(stored.map((r) => r.rating)).to.deep.equal([4]);
    });

    it("409 for one of two concurrent reviews", async () => {
      const results = await Promise.all([postReview(OWNER, { taskId, rating: 4 }), postReview(OWNER, { taskId, rating: 5 })]);
      expect(results.map((r) => r.status).sort()).to.deep.equal([201, 409]);
      expect(await testDb.collection("reviews").countDocuments()).to.equal(1);
    });

    itRejectsBadTokens((headers) => postReview(headers, { taskId, rating: 4 }));
  });

  describe("GET /pawtrust/reviews/sitter/:sitterId", () => {
    it("returns the sitter's reviews newest first with the average rating", async () => {
      const first = await insertTask();
      const second = await insertTask();
      const someoneElse = await insertTask({ acceptedSitterId: new ObjectId(OTHER_SITTER_ID) });
      await postReview(OWNER, { taskId: first, rating: 4 });
      await postReview(OWNER, { taskId: second, rating: 5, comment: "Again!" });
      await postReview(OWNER, { taskId: someoneElse, rating: 1 });

      const res = await request(app).get(`/pawtrust/reviews/sitter/${SITTER_ID}`).set(SITTER);
      expect(res.status).to.equal(200);
      expect(res.body.count).to.equal(2);
      expect(res.body.averageRating).to.equal(4.5);
      expect(res.body.reviews.map((r) => r.taskId)).to.deep.equal([second, first]);
    });

    it("returns a null average when the sitter has no reviews", async () => {
      const res = await request(app).get(`/pawtrust/reviews/sitter/${SITTER_ID}`).set(OWNER);
      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal({ reviews: [], averageRating: null, count: 0 });
    });

    it("400 for an invalid sitter id", async () => {
      expect((await request(app).get("/pawtrust/reviews/sitter/abc").set(SITTER)).status).to.equal(400);
    });

    itRejectsBadTokens((headers) => request(app).get(`/pawtrust/reviews/sitter/${SITTER_ID}`).set(headers));
  });

  describe("GET /pawtrust/reviews/task/:taskId", () => {
    it("returns the task's review", async () => {
      const taskId = await insertTask();
      await postReview(OWNER, { taskId, rating: 3, comment: "OK" });
      const res = await request(app).get(`/pawtrust/reviews/task/${taskId}`).set(OWNER);
      expect(res.status).to.equal(200);
      expect(res.body).to.include({ taskId, rating: 3, comment: "OK" });
    });

    it("404 when the task has no review", async () => {
      const taskId = await insertTask();
      expect((await request(app).get(`/pawtrust/reviews/task/${taskId}`).set(OWNER)).status).to.equal(404);
    });

    it("400 for an invalid task id", async () => {
      expect((await request(app).get("/pawtrust/reviews/task/abc").set(OWNER)).status).to.equal(400);
    });

    itRejectsBadTokens((headers) => request(app).get(`/pawtrust/reviews/task/${new ObjectId()}`).set(headers));
  });

  describe("GET /pawtrust/tasks/finished", () => {
    it("returns only my finished tasks, each with its review or null", async () => {
      const reviewed = await insertTask();
      const unreviewed = await insertTask({ updatedAt: new Date(Date.now() - 60_000) });
      await insertTask({ status: "assigned" }); // not finished
      await insertTask({ acceptedSitterId: new ObjectId(OTHER_SITTER_ID) }); // not mine
      await postReview(OWNER, { taskId: reviewed, rating: 5, comment: "Perfect" });

      const res = await request(app).get("/pawtrust/tasks/finished").set(SITTER);
      expect(res.status).to.equal(200);
      expect(res.body.map((t) => t._id)).to.deep.equal([reviewed, unreviewed]);
      expect(res.body[0].review).to.include({ rating: 5, comment: "Perfect" });
      expect(res.body[1].review).to.equal(null);
      expect(res.body[0]).to.not.have.property("reviews");
    });

    it("returns an empty array when I have no finished tasks", async () => {
      const res = await request(app).get("/pawtrust/tasks/finished").set(OTHER_SITTER);
      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal([]);
    });

    it("403 for an owner", async () => {
      expect((await request(app).get("/pawtrust/tasks/finished").set(OWNER)).status).to.equal(403);
    });

    itRejectsBadTokens((headers) => request(app).get("/pawtrust/tasks/finished").set(headers));
  });
});
