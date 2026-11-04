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
const MISSING_ID = new ObjectId().toString();

const tokenFor = (id, userType, options = {}) =>
  jwt.sign({ sub: id, userType }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "1d", ...options });
const auth = (token) => ({ Authorization: `Bearer ${token}` });
const OWNER = auth(tokenFor(OWNER_ID, "owner"));
const OTHER_OWNER = auth(tokenFor(OTHER_OWNER_ID, "owner"));
const SITTER = auth(tokenFor(SITTER_ID, "sitter"));
const EXPIRED = auth(tokenFor(OWNER_ID, "owner", { expiresIn: -10 }));

const future = (days = 7) => new Date(Date.now() + days * 86_400_000).toISOString();
const validTask = () => ({
  petType: "Dog",
  description: "Walk Max twice",
  date: future(),
  duration: 1.5,
  location: "Seattle",
});

const postTask = (headers = OWNER, body = validTask()) =>
  request(app).post("/pawtrust/tasks").set(headers).send(body);
const setStatus = (id, status) =>
  testDb.collection("tasks").updateOne({ _id: new ObjectId(id) }, { $set: { status } });

// Shared 401 cases for every protected route.
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
  it("403 for a sitter", async () => {
    const res = await send(SITTER);
    expect(res.status).to.equal(403);
  });
}

describe("Tasks API", () => {
  beforeEach(async () => {
    await testDb.collection("tasks").deleteMany({});
    await testDb.collection("applications").deleteMany({});
  });

  describe("POST /pawtrust/tasks", () => {
    it("creates an open task owned by the token's user", async () => {
      const res = await postTask(OWNER, { ...validTask(), ownerId: OTHER_OWNER_ID, status: "finished" });
      expect(res.status).to.equal(201);
      expect(res.body).to.include({ petType: "Dog", duration: 1.5, status: "open", ownerId: OWNER_ID });
      expect(res.body).to.have.property("createdAt");
      expect(res.body.applicationCount).to.equal(0);

      const stored = await testDb.collection("tasks").findOne({ _id: new ObjectId(res.body._id) });
      expect(stored.ownerId.toString()).to.equal(OWNER_ID); // body ownerId ignored
      expect(stored.status).to.equal("open"); // body status ignored
      expect(stored.date).to.be.instanceOf(Date);
    });

    describe("invalid input → 400", () => {
      const cases = [
        ["missing petType", { petType: undefined }],
        ["blank description", { description: "  " }],
        ["missing location", { location: undefined }],
        ["missing date", { date: undefined }],
        ["unparseable date", { date: "next tuesday" }],
        ["past date", { date: "2020-01-01T10:00:00Z" }],
        ["zero duration", { duration: 0 }],
        ["negative duration", { duration: -1 }],
        ["string duration", { duration: "2" }],
        ["petType as object (NoSQL injection)", { petType: { $ne: null } }],
      ];
      for (const [label, override] of cases) {
        it(label, async () => {
          const res = await postTask(OWNER, { ...validTask(), ...override });
          expect(res.status).to.equal(400);
          expect(res.body.error).to.be.a("string");
          expect(await testDb.collection("tasks").countDocuments()).to.equal(0);
        });
      }
    });

    itRejectsBadTokens((headers) => postTask(headers));
  });

  describe("GET /pawtrust/tasks/mine", () => {
    it("returns only my tasks, newest first, with application counts", async () => {
      const first = (await postTask()).body;
      const second = (await postTask(OWNER, { ...validTask(), petType: "Cat" })).body;
      await postTask(OTHER_OWNER); // not mine
      await testDb.collection("applications").insertMany([
        { taskId: new ObjectId(first._id), sitterId: new ObjectId(), status: "pending" },
        { taskId: new ObjectId(first._id), sitterId: new ObjectId(), status: "pending" },
      ]);

      const res = await request(app).get("/pawtrust/tasks/mine").set(OWNER);
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an("array").with.lengthOf(2);
      expect(res.body.map((t) => t._id)).to.deep.equal([second._id, first._id]);
      expect(res.body.map((t) => t.applicationCount)).to.deep.equal([0, 2]);
      expect(res.body[0]).to.not.have.property("applications");
    });

    it("returns an empty array when I have no tasks", async () => {
      const res = await request(app).get("/pawtrust/tasks/mine").set(OWNER);
      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal([]);
    });

    itRejectsBadTokens((headers) => request(app).get("/pawtrust/tasks/mine").set(headers));
  });

  describe("PUT /pawtrust/tasks/:id", () => {
    let taskId;
    beforeEach(async () => {
      taskId = (await postTask()).body._id;
    });
    const put = (id, headers = OWNER, body = { description: "Updated" }) =>
      request(app).put(`/pawtrust/tasks/${id}`).set(headers).send(body);

    it("updates an open task I own", async () => {
      const res = await put(taskId, OWNER, { description: "  Feed twice ", duration: 2, ownerId: OTHER_OWNER_ID });
      expect(res.status).to.equal(200);
      expect(res.body).to.include({ description: "Feed twice", duration: 2, ownerId: OWNER_ID });
    });

    it("400 for an invalid id", async () => {
      expect((await put("not-an-id")).status).to.equal(400);
    });

    it("400 for invalid fields", async () => {
      expect((await put(taskId, OWNER, { duration: 0 })).status).to.equal(400);
      expect((await put(taskId, OWNER, { date: "2020-01-01T00:00:00Z" })).status).to.equal(400);
      expect((await put(taskId, OWNER, {})).status).to.equal(400);
    });

    it("400 when the task is not open (BR-2)", async () => {
      await setStatus(taskId, "assigned");
      const res = await put(taskId);
      expect(res.status).to.equal(400);
      expect(res.body.error).to.equal("Only open tasks can be changed");
    });

    it("403 for another owner's task", async () => {
      const res = await put(taskId, OTHER_OWNER);
      expect(res.status).to.equal(403);
      const stored = await testDb.collection("tasks").findOne({ _id: new ObjectId(taskId) });
      expect(stored.description).to.equal("Walk Max twice");
    });

    it("404 for a missing task", async () => {
      expect((await put(MISSING_ID)).status).to.equal(404);
    });

    itRejectsBadTokens((headers) => put(taskId, headers));
  });

  describe("DELETE /pawtrust/tasks/:id", () => {
    let taskId;
    beforeEach(async () => {
      taskId = (await postTask()).body._id;
    });
    const del = (id, headers = OWNER) => request(app).delete(`/pawtrust/tasks/${id}`).set(headers);

    it("deletes an open task I own and its applications", async () => {
      await testDb.collection("applications").insertOne({ taskId: new ObjectId(taskId), sitterId: new ObjectId() });
      const res = await del(taskId);
      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal({ deletedId: taskId });
      expect(await testDb.collection("tasks").countDocuments()).to.equal(0);
      expect(await testDb.collection("applications").countDocuments()).to.equal(0);
    });

    it("400 for an invalid id", async () => {
      expect((await del("123")).status).to.equal(400);
    });

    for (const status of ["assigned", "finished"]) {
      it(`400 for a ${status} task (BR-2)`, async () => {
        await setStatus(taskId, status);
        expect((await del(taskId)).status).to.equal(400);
        expect(await testDb.collection("tasks").countDocuments()).to.equal(1);
      });
    }

    it("403 for another owner's task", async () => {
      expect((await del(taskId, OTHER_OWNER)).status).to.equal(403);
      expect(await testDb.collection("tasks").countDocuments()).to.equal(1);
    });

    it("404 for a missing task", async () => {
      expect((await del(MISSING_ID)).status).to.equal(404);
    });

    it("404 when deleting the same task twice", async () => {
      expect((await del(taskId)).status).to.equal(200);
      expect((await del(taskId)).status).to.equal(404);
    });

    itRejectsBadTokens((headers) => del(taskId, headers));
  });
});
