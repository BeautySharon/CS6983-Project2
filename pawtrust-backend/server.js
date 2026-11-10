import express from "express";
import cors from "cors";
import pawtrust from "./api/pawtrust.route.js";

const app = express();

// CORS: only CORS_ORIGIN, this project's Vercel preview deployments (when
// VERCEL_PROJECT and VERCEL_SCOPE are set), plus localhost while developing.
const LOCALHOST_ORIGIN = /^http:\/\/localhost(:\d+)?$/;
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Vercel previews look like https://<project>-<hash or git-branch>-<scope>.vercel.app
function isVercelPreview(origin) {
  const { VERCEL_PROJECT: project, VERCEL_SCOPE: scope } = process.env;
  if (!project || !scope) return false;
  const pattern = new RegExp(`^https://${escapeRegExp(project)}-[a-z0-9-]+-${escapeRegExp(scope)}\\.vercel\\.app$`);
  return pattern.test(origin);
}

export function isAllowedOrigin(origin) {
  return (
    origin === process.env.CORS_ORIGIN ||
    isVercelPreview(origin) ||
    (process.env.NODE_ENV !== "production" && LOCALHOST_ORIGIN.test(origin))
  );
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true); // curl, server-to-server, tests
      return callback(null, isAllowedOrigin(origin));
    },
  })
);
app.use(express.json());
app.use("/pawtrust", pawtrust);
app.use("*", (req, res) => res.status(404).json({ error: "Not found" }));

export default app;
