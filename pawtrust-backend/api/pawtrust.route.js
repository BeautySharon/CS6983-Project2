import express from "express";
import UsersController from "./users.controller.js";
import TasksController from "./tasks.controller.js";
import ApplicationsController from "./applications.controller.js";
import { requireAuth, requireRole } from "./middleware/auth.js";

import OwnerApplicationsController from './ownerApplications.controller.js';

const router = express.Router();

router.get("/health", (req, res) => res.json({ status: "ok" }));

router.post("/register", UsersController.apiRegister);
router.post("/login", UsersController.apiLogin);

const ownerOnly = [requireAuth, requireRole("owner")];
router.post("/tasks", ...ownerOnly, TasksController.apiPostTask);
router.get("/tasks/mine", ...ownerOnly, TasksController.apiGetMyTasks);
router.put("/tasks/:id", ...ownerOnly, TasksController.apiUpdateTask);
router.delete("/tasks/:id", ...ownerOnly, TasksController.apiDeleteTask);

router.get('/applications/owner', ...ownerOnly, OwnerApplicationsController.apiGetOwnerApplications);
router.post('/accept', ...ownerOnly, OwnerApplicationsController.apiAccept);

const sitterOnly = [requireAuth, requireRole("sitter")];
router.get("/tasks/available", ...sitterOnly, TasksController.apiGetAvailableTasks);
router.post("/applications/apply", ...sitterOnly, ApplicationsController.apiApplyToTask);
router.get("/applications/mine", ...sitterOnly, ApplicationsController.apiGetMyApplications);

export default router;
