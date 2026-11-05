import request from "supertest";
import { expect } from "chai";
import jwt from "jsonwebtoken";
import { Collection, ObjectId } from "mongodb";
import app from "../server.js";
import { testDb } from "./setup.js";
const owner = new ObjectId(),
  other = new ObjectId(),
  sitters = [new ObjectId(), new ObjectId()];
const auth = (id = owner, role = "owner", options = {}) => ({
  Authorization: `Bearer ${jwt.sign({ sub: id.toString(), userType: role }, process.env.JWT_SECRET, { expiresIn: "1d", ...options })}`,
});
let taskId, ids;
const accept = (i = 0, headers = auth(), body) =>
  request(app)
    .post("/pawtrust/accept")
    .set(headers)
    .send(body ?? { taskId: String(taskId), applicationId: String(ids[i]) });
describe("Owner acceptance #11", () => {
  beforeEach(async () => {
    for (const name of ["tasks", "applications", "users"])
      await testDb.collection(name).deleteMany({});
    taskId = new ObjectId();
    ids = [new ObjectId(), new ObjectId()];
    await testDb
      .collection("users")
      .insertMany(
        sitters.map((_id, i) => ({
          _id,
          name: `Sitter ${i + 1}`,
          email: `s${i}@example.com`,
          passwordHash: "private-hash",
          userType: "sitter",
        })),
      );
    await testDb
      .collection("tasks")
      .insertOne({
        _id: taskId,
        ownerId: owner,
        status: "open",
        acceptedSitterId: null,
      });
    await testDb
      .collection("applications")
      .insertMany(
        ids.map((_id, i) => ({
          _id,
          taskId,
          sitterId: sitters[i],
          status: "pending",
          message: `Message ${i}`,
          createdAt: new Date(),
        })),
      );
  });
  it("lists only owned applications with names and no private fields", async () => {
    const foreign = new ObjectId();
    await testDb
      .collection("tasks")
      .insertOne({ _id: foreign, ownerId: other, status: "open" });
    await testDb
      .collection("applications")
      .insertOne({ taskId: foreign, sitterId: sitters[0], status: "pending" });
    const r = await request(app)
      .get("/pawtrust/applications/owner")
      .set(auth());
    expect(r.status).eq(200);
    expect(r.body).length(2);
    expect(r.body.map((a) => a.sitterName).sort()).deep.eq([
      "Sitter 1",
      "Sitter 2",
    ]);
    expect(JSON.stringify(r.body)).not.include("private-hash");
    expect(r.body[0]).not.have.property("email");
  });
  it("returns an empty array for another owner", async () => {
    const r = await request(app)
      .get("/pawtrust/applications/owner")
      .set(auth(other));
    expect(r.status).eq(200);
    expect(r.body).deep.eq([]);
  });
  it("assigns the task and updates all applications", async () => {
    expect((await accept()).status).eq(200);
    const t = await testDb.collection("tasks").findOne({ _id: taskId });
    expect(t.status).eq("assigned");
    expect(t.acceptedSitterId.equals(sitters[0])).eq(true);
    expect(
      (
        await testDb
          .collection("applications")
          .find({ taskId })
          .sort({ _id: 1 })
          .toArray()
      ).map((a) => a.status),
    ).deep.eq(["accepted", "rejected"]);
  });
  it("allows exactly one winner in concurrent acceptance", async () => {
    const r = await Promise.all([accept(0), accept(1)]);
    expect(r.map((x) => x.status).sort()).deep.eq([200, 409]);
    const t = await testDb.collection("tasks").findOne({ _id: taskId });
    const a = await testDb
      .collection("applications")
      .find({ taskId, status: "accepted" })
      .toArray();
    expect(a).length(1);
    expect(a[0].sitterId.equals(t.acceptedSitterId)).eq(true);
    expect(
      await testDb
        .collection("applications")
        .countDocuments({ taskId, status: "rejected" }),
    ).eq(1);
  });
  it("rolls back all writes when updating the remaining applications fails", async () => {
    const original = Collection.prototype.updateMany;
    Collection.prototype.updateMany = async function (...args) {
      if (this.collectionName === "applications")
        throw new Error("Simulated write failure");
      return original.apply(this, args);
    };
    try {
      expect((await accept()).status).eq(500);
    } finally {
      Collection.prototype.updateMany = original;
    }
    const task = await testDb.collection("tasks").findOne({ _id: taskId });
    expect(task.status).eq("open");
    expect(task.acceptedSitterId).eq(null);
    expect(
      await testDb
        .collection("applications")
        .countDocuments({ taskId, status: "pending" }),
    ).eq(2);
  });
  it("forbids another owner without mutations", async () => {
    expect((await accept(0, auth(other))).status).eq(403);
    expect(
      (await testDb.collection("tasks").findOne({ _id: taskId })).status,
    ).eq("open");
  });
  it("rejects an application for another task", async () => {
    await testDb
      .collection("applications")
      .updateOne({ _id: ids[0] }, { $set: { taskId: new ObjectId() } });
    expect((await accept()).status).eq(404);
    expect(
      (await testDb.collection("tasks").findOne({ _id: taskId })).status,
    ).eq("open");
  });
  it("rejects repeated acceptance", async () => {
    expect((await accept()).status).eq(200);
    expect((await accept()).status).eq(409);
  });
  for (const status of ["assigned", "finished"])
    it(`rejects ${status} tasks`, async () => {
      await testDb
        .collection("tasks")
        .updateOne({ _id: taskId }, { $set: { status } });
      expect((await accept()).status).eq(409);
    });
  it("rejects non-pending applications", async () => {
    await testDb
      .collection("applications")
      .updateOne({ _id: ids[0] }, { $set: { status: "rejected" } });
    expect((await accept()).status).eq(409);
    expect(
      (await testDb.collection("tasks").findOne({ _id: taskId })).status,
    ).eq("open");
  });
  it("returns 404 for missing task or application", async () => {
    expect(
      (
        await accept(0, auth(), {
          taskId: String(new ObjectId()),
          applicationId: String(ids[0]),
        })
      ).status,
    ).eq(404);
    expect(
      (
        await accept(0, auth(), {
          taskId: String(taskId),
          applicationId: String(new ObjectId()),
        })
      ).status,
    ).eq(404);
  });
  it("validates both identifiers", async () => {
    for (const body of [
      {},
      { taskId: "invalid", applicationId: String(ids[0]) },
      { taskId: String(taskId), applicationId: { $ne: null } },
    ])
      expect((await accept(0, auth(), body)).status).eq(400);
  });
  for (const [label, headers, status] of [
    ["missing", {}, 401],
    ["invalid", { Authorization: "Bearer invalid" }, 401],
    ["expired", auth(owner, "owner", { expiresIn: -1 }), 401],
    ["sitter", auth(sitters[0], "sitter"), 403],
  ])
    it(`rejects ${label} credentials on both routes`, async () => {
      expect((await accept(0, headers)).status).eq(status);
      expect(
        (await request(app).get("/pawtrust/applications/owner").set(headers))
          .status,
      ).eq(status);
    });
});
