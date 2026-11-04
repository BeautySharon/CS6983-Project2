import request from "supertest";
import { expect } from "chai";
import jwt from "jsonwebtoken";
import app from "../server.js";
import { testDb } from "./setup.js";

const PASSWORD = "dummy-pass-123";
const owner = {
  name: "Login Owner",
  email: "login.owner@example.com",
  password: PASSWORD,
  userType: "owner",
  location: "Seattle",
};

describe("POST /pawtrust/login", () => {
  let ownerId;

  beforeEach(async () => {
    await testDb.collection("users").deleteMany({});
    const res = await request(app).post("/pawtrust/register").send(owner);
    ownerId = res.body.user._id;
  });

  it("returns a signed 1-day JWT and the user without passwordHash", async () => {
    const res = await request(app)
      .post("/pawtrust/login")
      .send({ email: owner.email, password: PASSWORD });

    expect(res.status).to.equal(200);
    expect(res.body.user).to.include({ _id: ownerId, name: owner.name, userType: "owner" });
    expect(res.body.user).to.not.have.property("passwordHash");

    const payload = jwt.verify(res.body.token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    expect(payload.sub).to.equal(ownerId);
    expect(payload.userType).to.equal("owner");
    expect(payload.exp - payload.iat).to.equal(24 * 60 * 60);
    // Only id + role in the payload, never email/password/bio.
    expect(Object.keys(payload).sort()).to.deep.equal(["exp", "iat", "sub", "userType"]);
  });

  it("accepts the email in any case", async () => {
    const res = await request(app)
      .post("/pawtrust/login")
      .send({ email: "  LOGIN.Owner@Example.com ", password: PASSWORD });
    expect(res.status).to.equal(200);
  });

  it("returns the same 401 for a wrong password and an unknown email", async () => {
    const wrongPassword = await request(app)
      .post("/pawtrust/login")
      .send({ email: owner.email, password: "wrong-password" });
    const unknownEmail = await request(app)
      .post("/pawtrust/login")
      .send({ email: "nobody@example.com", password: PASSWORD });

    expect(wrongPassword.status).to.equal(401);
    expect(unknownEmail.status).to.equal(401);
    expect(wrongPassword.body).to.deep.equal({ error: "Invalid email or password" });
    expect(unknownEmail.body).to.deep.equal(wrongPassword.body);
  });

  describe("missing or invalid fields → 400", () => {
    const cases = [
      ["empty body", {}],
      ["missing email", { password: PASSWORD }],
      ["missing password", { email: owner.email }],
      ["blank email", { email: "  ", password: PASSWORD }],
      ["empty password", { email: owner.email, password: "" }],
      ["email as object (NoSQL injection)", { email: { $ne: null }, password: PASSWORD }],
      ["password as object", { email: owner.email, password: { $ne: null } }],
    ];
    for (const [label, body] of cases) {
      it(label, async () => {
        const res = await request(app).post("/pawtrust/login").send(body);
        expect(res.status).to.equal(400);
        expect(res.body.error).to.be.a("string");
        expect(res.body).to.not.have.property("token");
      });
    }
  });
});
