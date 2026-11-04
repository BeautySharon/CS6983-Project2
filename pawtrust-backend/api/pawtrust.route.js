import express from "express";
import UsersController from "./users.controller.js";

const router = express.Router();

router.get("/health", (req, res) => res.json({ status: "ok" }));

router.post("/register", UsersController.apiRegister);

export default router;
