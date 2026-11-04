import request from "supertest";
import { expect } from "chai";
import bcrypt from "bcrypt";
import app from "../server.js";
import { testDb } from "./setup.js";

const validUser = () => ({
  name: "Test Owner",
  email: "test.owner@example.com",
  password: "dummy-pass-123",
  userType: "owner",
  location: "Seattle",
  bio: "Two cats",
});

describe("POST /pawtrust/register", () => {
  beforeEach(async () => {
    await testDb.collection("users").deleteMany({});
  });

  it("creates an owner and returns 201 without passwordHash", async () => {
    const res = await request(app).post("/pawtrust/register").send(validUser());
    expect(res.status).to.equal(201);
    expect(res.body.user).to.include({
      name: "Test Owner",
      email: "test.owner@example.com",
      userType: "owner",
      location: "Seattle",
    });
    expect(res.body.user).to.have.property("_id");
    expect(res.body.user).to.not.have.property("passwordHash");
    expect(res.body.user).to.not.have.property("password");
  });

  it("creates a sitter with no bio", async () => {
    const { bio: _bio, ...body } = { ...validUser(), userType: "sitter" };
    const res = await request(app).post("/pawtrust/register").send(body);
    expect(res.status).to.equal(201);
    expect(res.body.user.userType).to.equal("sitter");
  });

  it("stores the password as a bcrypt hash", async () => {
    await request(app).post("/pawtrust/register").send(validUser());
    const stored = await testDb.collection("users").findOne({ email: "test.owner@example.com" });
    expect(stored.passwordHash).to.not.equal("dummy-pass-123");
    expect(stored).to.not.have.property("password");
    expect(await bcrypt.compare("dummy-pass-123", stored.passwordHash)).to.equal(true);
    expect(bcrypt.getRounds(stored.passwordHash)).to.equal(10);
  });

  it("normalizes email to lowercase", async () => {
    const res = await request(app)
      .post("/pawtrust/register")
      .send({ ...validUser(), email: "  Test.Owner@Example.COM " });
    expect(res.status).to.equal(201);
    expect(res.body.user.email).to.equal("test.owner@example.com");
  });

  it("returns 409 for a duplicate email (case-insensitive)", async () => {
    await request(app).post("/pawtrust/register").send(validUser());
    const res = await request(app)
      .post("/pawtrust/register")
      .send({ ...validUser(), email: "TEST.OWNER@example.com" });
    expect(res.status).to.equal(409);
    expect(res.body).to.deep.equal({ error: "Email already registered" });
    expect(await testDb.collection("users").countDocuments()).to.equal(1);
  });

  describe("invalid input → 400", () => {
    const cases = [
      ["missing name", { name: undefined }],
      ["blank name", { name: "   " }],
      ["missing email", { email: undefined }],
      ["malformed email", { email: "not-an-email" }],
      ["email as object (NoSQL injection)", { email: { $ne: null } }],
      ["short password", { password: "1234567" }],
      ["missing password", { password: undefined }],
      ["invalid userType", { userType: "admin" }],
      ["missing userType", { userType: undefined }],
      ["missing location", { location: undefined }],
      ["non-string bio", { bio: 42 }],
    ];

    for (const [label, override] of cases) {
      it(label, async () => {
        const res = await request(app)
          .post("/pawtrust/register")
          .send({ ...validUser(), ...override });
        expect(res.status).to.equal(400);
        expect(res.body.error).to.be.a("string");
        expect(await testDb.collection("users").countDocuments()).to.equal(0);
      });
    }

    it("empty body", async () => {
      const res = await request(app).post("/pawtrust/register").send({});
      expect(res.status).to.equal(400);
    });
  });

  it("ignores extra fields such as passwordHash in the body", async () => {
    const res = await request(app)
      .post("/pawtrust/register")
      .send({ ...validUser(), passwordHash: "injected", isAdmin: true });
    expect(res.status).to.equal(201);
    const stored = await testDb.collection("users").findOne({ email: "test.owner@example.com" });
    expect(stored.passwordHash).to.not.equal("injected");
    expect(stored).to.not.have.property("isAdmin");
  });
});
