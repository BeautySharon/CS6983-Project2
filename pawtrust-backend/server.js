import express from "express";
import cors from "cors";
import pawtrust from "./api/pawtrust.route.js";

const app = express();

// CORS: only CORS_ORIGIN, plus localhost while developing.
const LOCALHOST_ORIGIN = /^http:\/\/localhost(:\d+)?$/;

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true); // curl, server-to-server, tests
      const allowed =
        origin === process.env.CORS_ORIGIN ||
        (process.env.NODE_ENV !== "production" && LOCALHOST_ORIGIN.test(origin));
      return callback(null, allowed);
    },
  })
);
app.use(express.json());
app.use("/pawtrust", pawtrust);
app.use("*", (req, res) => res.status(404).json({ error: "Not found" }));

export default app;
