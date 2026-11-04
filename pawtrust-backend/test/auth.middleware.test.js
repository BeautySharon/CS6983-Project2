import express from "express";
import request from "supertest";
import { expect } from "chai";
import jwt from "jsonwebtoken";
import { requireAuth, requireRole } from "../api/middleware/auth.js";

// No protected business endpoint exists yet (#7, #9), so exercise the middleware on a test-only app.
const probe = express();
probe.get("/any", requireAuth, (req, res) => res.json({ user: req.user }));
probe.get("/owner-only", requireAuth, requireRole("owner"), (req, res) => res.json({ ok: true }));
probe.get("/both", requireAuth, requireRole("owner", "sitter"), (req, res) => res.json({ ok: true }));

const SITTER_ID = "65a000000000000000000001";
const sign = (payload, options = {}) =>
  jwt.sign(payload, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "1d", ...options });
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

describe("requireAuth", () => {
  it("sets req.user from a valid token", async () => {
    const res = await request(probe).get("/any").set(bearer(sign({ sub: SITTER_ID, userType: "sitter" })));
    expect(res.status).to.equal(200);
    expect(res.body.user).to.deep.equal({ id: SITTER_ID, userType: "sitter" });
  });

  const unauthorizedCases = [
    ["no Authorization header", () => ({})],
    ["non-Bearer scheme", () => ({ Authorization: `Basic ${sign({ sub: SITTER_ID, userType: "sitter" })}` })],
    ["malformed token", () => bearer("not.a.jwt")],
    ["wrong signature", () => bearer(jwt.sign({ sub: SITTER_ID, userType: "sitter" }, "other-secret"))],
    ["expired token", () => bearer(sign({ sub: SITTER_ID, userType: "sitter" }, { expiresIn: -10 }))],
    ["unknown role in payload", () => bearer(sign({ sub: SITTER_ID, userType: "admin" }))],
    ["missing sub", () => bearer(sign({ userType: "sitter" }))],
    [
      "alg none",
      () => bearer(jwt.sign({ sub: SITTER_ID, userType: "owner" }, null, { algorithm: "none" })),
    ],
  ];
  for (const [label, headers] of unauthorizedCases) {
    it(`401 for ${label}`, async () => {
      const res = await request(probe).get("/any").set(headers());
      expect(res.status).to.equal(401);
      expect(res.body).to.deep.equal({ error: "Unauthorized" });
    });
  }
});

describe("requireRole", () => {
  it("allows the listed role", async () => {
    const res = await request(probe).get("/owner-only").set(bearer(sign({ sub: SITTER_ID, userType: "owner" })));
    expect(res.status).to.equal(200);
  });

  it("403 for the wrong role", async () => {
    const res = await request(probe).get("/owner-only").set(bearer(sign({ sub: SITTER_ID, userType: "sitter" })));
    expect(res.status).to.equal(403);
    expect(res.body).to.deep.equal({ error: "Forbidden" });
  });

  it("accepts any of several roles", async () => {
    const res = await request(probe).get("/both").set(bearer(sign({ sub: SITTER_ID, userType: "sitter" })));
    expect(res.status).to.equal(200);
  });

  it("401 (not 403) without a token", async () => {
    const res = await request(probe).get("/owner-only");
    expect(res.status).to.equal(401);
  });
});
