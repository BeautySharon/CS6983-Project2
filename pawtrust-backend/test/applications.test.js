import request from "supertest";
import { expect } from "chai";
import jwt from "jsonwebtoken";
import mongodb from "mongodb";
import app from "../server.js";
import { testDb } from "./setup.js";

const { ObjectId } = mongodb;

const OWNER_ID = new ObjectId().toString();
const SITTER_ID = new ObjectId().toString();
const OTHER_SITTER_ID = new ObjectId().toString();

const tokenFor = (id, userType, options = {}) =>
  jwt.sign({ sub: id, userType }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "1d", ...options });
const auth = (token) => ({ Authorization: `Bearer ${token}` });
const OWNER = auth(tokenFor(OWNER_ID, "owner"));
const SITTER = auth(tokenFor(SITTER_ID, "sitter"));
const OTHER_SITTER = auth(tokenFor(OTHER_SITTER_ID, "sitter"));
const EXPIRED = auth(tokenFor(SITTER_ID, "sitter", { expiresIn: -10 }));

const future = (days) => new Date(Date.now() + days * 86_400_000);

async function insertTask(overrides = {}) {
  const now = new Date();
  const { insertedId } = await testDb.collection("tasks").insertOne({
    ownerId: new ObjectId(OWNER_ID),
    petType: "Dog",
    description: "Walk Max",
    date: future(7),
    duration: 1,
    location: "Seattle",
    status: "open",
    acceptedSitterId: null,
    reviewed: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
  return insertedId.toString();
}

const apply = (headers, body) => request(app).post("/pawtrust/applications/apply").set(headers).send(body);

// Shared 401/403 cases: sitter-only routes reject bad tokens and owners.
function itRejectsBadTokensAndOwners(send) {
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
  it("403 for an owner", async () => {
    const res = await send(OWNER);
    expect(res.status).to.equal(403);
    expect(res.body).to.deep.equal({ error: "Forbidden" });
  });
}

describe("Sitter applications API", () => {
  beforeEach(async () => {
    await testDb.collection("tasks").deleteMany({});
    await testDb.collection("applications").deleteMany({});
  });

  describe("GET /pawtrust/tasks/available", () => {
    it("returns only open tasks, soonest first", async () => {
      const later = await insertTask({ date: future(10) });
      const sooner = await insertTask({ date: future(2) });
      await insertTask({ status: "assigned" });
      await insertTask({ status: "finished" });

      const res = await request(app).get("/pawtrust/tasks/available").set(SITTER);
      expect(res.status).to.equal(200);
      expect(res.body.map((t) => t._id)).to.deep.equal([sooner, later]);
      expect(res.body.every((t) => t.status === "open")).to.equal(true);
      expect(res.body[0]).to.include({ petType: "Dog", description: "Walk Max", duration: 1, location: "Seattle" });
    });

    it("returns an empty array when nothing is open", async () => {
      await insertTask({ status: "assigned" });
      const res = await request(app).get("/pawtrust/tasks/available").set(SITTER);
      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal([]);
    });

    itRejectsBadTokensAndOwners((headers) => request(app).get("/pawtrust/tasks/available").set(headers));
  });

  describe("POST /pawtrust/applications/apply", () => {
    let taskId;
    beforeEach(async () => {
      taskId = await insertTask();
    });

    it("creates a pending application for the token's sitter", async () => {
      const res = await apply(SITTER, { taskId, message: "  I love dogs  ", sitterId: OTHER_SITTER_ID, status: "accepted" });
      expect(res.status).to.equal(201);
      expect(res.body).to.include({ taskId, sitterId: SITTER_ID, message: "I love dogs", status: "pending" });
      expect(res.body).to.have.property("createdAt");

      const stored = await testDb.collection("applications").findOne({ _id: new ObjectId(res.body._id) });
      expect(stored.sitterId.toString()).to.equal(SITTER_ID); // body sitterId ignored
      expect(stored.taskId.toString()).to.equal(taskId);
      expect(stored.status).to.equal("pending"); // body status ignored
    });

    it("accepts a missing message as empty", async () => {
      const res = await apply(SITTER, { taskId });
      expect(res.status).to.equal(201);
      expect(res.body.message).to.equal("");
    });

    it("accepts a message of exactly 300 characters", async () => {
      const res = await apply(SITTER, { taskId, message: "a".repeat(300) });
      expect(res.status).to.equal(201);
    });

    it("lets different sitters apply to the same task", async () => {
      expect((await apply(SITTER, { taskId })).status).to.equal(201);
      expect((await apply(OTHER_SITTER, { taskId })).status).to.equal(201);
      expect(await testDb.collection("applications").countDocuments()).to.equal(2);
    });

    describe("invalid input → 400", () => {
      const cases = [
        ["missing taskId", () => ({})],
        ["malformed taskId", () => ({ taskId: "123" })],
        ["taskId as object (NoSQL injection)", () => ({ taskId: { $ne: null } })],
        ["message over 300 characters", (id) => ({ taskId: id, message: "a".repeat(301) })],
        ["non-string message", (id) => ({ taskId: id, message: 42 })],
      ];
      for (const [label, body] of cases) {
        it(label, async () => {
          const res = await apply(SITTER, body(taskId));
          expect(res.status).to.equal(400);
          expect(res.body.error).to.be.a("string");
          expect(await testDb.collection("applications").countDocuments()).to.equal(0);
        });
      }
    });

    for (const status of ["assigned", "finished"]) {
      it(`400 when the task is ${status} (BR-3)`, async () => {
        const closed = await insertTask({ status });
        const res = await apply(SITTER, { taskId: closed });
        expect(res.status).to.equal(400);
        expect(res.body.error).to.equal("Only open tasks accept applications");
      });
    }

    it("404 for a task that does not exist", async () => {
      const res = await apply(SITTER, { taskId: new ObjectId().toString() });
      expect(res.status).to.equal(404);
    });

    it("409 when the sitter applies twice (BR-3)", async () => {
      expect((await apply(SITTER, { taskId })).status).to.equal(201);
      const res = await apply(SITTER, { taskId, message: "again" });
      expect(res.status).to.equal(409);
      expect(await testDb.collection("applications").countDocuments()).to.equal(1);
    });

    it("409 for one of two concurrent duplicate applies", async () => {
      const results = await Promise.all([apply(SITTER, { taskId }), apply(SITTER, { taskId })]);
      expect(results.map((r) => r.status).sort()).to.deep.equal([201, 409]);
      expect(await testDb.collection("applications").countDocuments()).to.equal(1);
    });

    itRejectsBadTokensAndOwners((headers) => apply(headers, { taskId }));
  });

  // Regression for PR #29 review: an application must never be left
  // "pending" on a task whose sitter has already been accepted (BR-3/BR-4).
  describe("apply vs. accept", () => {
    const accept = (taskId, applicationId) =>
      request(app).post("/pawtrust/accept").set(OWNER).send({ taskId, applicationId });

    it("400 when applying after another sitter was accepted", async () => {
      const taskId = await insertTask();
      const first = await apply(OTHER_SITTER, { taskId });
      expect((await accept(taskId, first.body._id)).status).to.equal(200);

      const res = await apply(SITTER, { taskId });
      expect(res.status).to.equal(400);
      expect(await testDb.collection("applications").countDocuments({ sitterId: new ObjectId(SITTER_ID) })).to.equal(0);
    });

    it("never leaves a pending application on an assigned task when they race", async () => {
      for (let round = 0; round < 15; round += 1) {
        const taskId = await insertTask();
        const first = await apply(OTHER_SITTER, { taskId });
        const [accepted, applied] = await Promise.all([accept(taskId, first.body._id), apply(SITTER, { taskId })]);

        expect(accepted.status).to.equal(200);
        expect([201, 400]).to.include(applied.status);
        const task = await testDb.collection("tasks").findOne({ _id: new ObjectId(taskId) });
        expect(task.status).to.equal("assigned");
        const pending = await testDb.collection("applications").countDocuments({ taskId: new ObjectId(taskId), status: "pending" });
        expect(pending, `round ${round}`).to.equal(0);
      }
    });
  });

  describe("GET /pawtrust/applications/mine", () => {
    it("lists only my applications, newest first", async () => {
      const first = await insertTask();
      const second = await insertTask();
      expect((await apply(SITTER, { taskId: first, message: "first" })).status).to.equal(201);
      expect((await apply(SITTER, { taskId: second, message: "second" })).status).to.equal(201);
      expect((await apply(OTHER_SITTER, { taskId: first })).status).to.equal(201);

      const res = await request(app).get("/pawtrust/applications/mine").set(SITTER);
      expect(res.status).to.equal(200);
      expect(res.body.map((a) => a.taskId)).to.deep.equal([second, first]);
      expect(res.body.every((a) => a.sitterId === SITTER_ID)).to.equal(true);
    });

    it("returns an empty array when I have not applied", async () => {
      const res = await request(app).get("/pawtrust/applications/mine").set(SITTER);
      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal([]);
    });

    itRejectsBadTokensAndOwners((headers) => request(app).get("/pawtrust/applications/mine").set(headers));
  });
});
