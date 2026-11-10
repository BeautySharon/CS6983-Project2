import request from "supertest";
import { expect } from "chai";
import app from "../server.js";

const KEYS = ["CORS_ORIGIN", "VERCEL_PROJECT", "VERCEL_SCOPE", "NODE_ENV"];

describe("CORS", () => {
  let saved;
  beforeEach(() => {
    saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
    Object.assign(process.env, {
      CORS_ORIGIN: "https://pawtrust.vercel.app",
      VERCEL_PROJECT: "pawtrust",
      VERCEL_SCOPE: "sihuis-projects",
      NODE_ENV: "production",
    });
  });
  afterEach(() => {
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  const allowOrigin = async (origin) =>
    (await request(app).get("/pawtrust/health").set("Origin", origin)).headers["access-control-allow-origin"];

  it("allows the production frontend", async () => {
    expect(await allowOrigin("https://pawtrust.vercel.app")).to.equal("https://pawtrust.vercel.app");
  });

  for (const origin of [
    "https://pawtrust-a1b2c3d4e-sihuis-projects.vercel.app",
    "https://pawtrust-git-feature-17-sihuis-projects.vercel.app",
  ]) {
    it(`allows this project's preview ${origin}`, async () => {
      expect(await allowOrigin(origin)).to.equal(origin);
    });
  }

  for (const origin of [
    "https://evil.vercel.app",
    "https://pawtrust-a1b2c3d4e-other-team.vercel.app",
    "https://otherapp-a1b2c3d4e-sihuis-projects.vercel.app",
    "https://pawtrust-x-sihuis-projects.vercel.app.evil.com",
    "http://pawtrust-a1b2c3d4e-sihuis-projects.vercel.app",
    "http://localhost:5173",
  ]) {
    it(`rejects ${origin} in production`, async () => {
      expect(await allowOrigin(origin)).to.equal(undefined);
    });
  }

  it("does not allow previews when the project or scope is not configured", async () => {
    delete process.env.VERCEL_SCOPE;
    expect(await allowOrigin("https://pawtrust-a1b2c3d4e-sihuis-projects.vercel.app")).to.equal(undefined);
  });

  it("allows localhost outside production", async () => {
    process.env.NODE_ENV = "development";
    expect(await allowOrigin("http://localhost:5173")).to.equal("http://localhost:5173");
  });
});
