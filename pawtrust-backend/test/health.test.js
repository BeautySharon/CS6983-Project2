import request from "supertest";
import { expect } from "chai";
import app from "../server.js";

describe("GET /pawtrust/health", () => {
  it("returns status ok", async () => {
    const res = await request(app).get("/pawtrust/health");
    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal({ status: "ok" });
  });

  it("returns JSON 404 for unknown routes", async () => {
    const res = await request(app).get("/pawtrust/nope");
    expect(res.status).to.equal(404);
    expect(res.body).to.have.property("error");
  });
});
