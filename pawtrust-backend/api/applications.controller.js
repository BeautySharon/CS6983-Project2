import ApplicationsDAO, { APPLY_RESULT } from "../dao/applicationsDAO.js";

const MAX_MESSAGE_LENGTH = 300;

const APPLY_ERRORS = {
  [APPLY_RESULT.TASK_NOT_FOUND]: [404, "Task not found"],
  [APPLY_RESULT.TASK_NOT_OPEN]: [400, "Only open tasks accept applications"],
  [APPLY_RESULT.DUPLICATE]: [409, "You have already applied to this task"],
};

export default class ApplicationsController {
  static async apiApplyToTask(req, res) {
    const { taskId, message = "" } = req.body ?? {};

    if (typeof taskId !== "string" || !/^[0-9a-f]{24}$/i.test(taskId)) {
      return res.status(400).json({ error: "A valid taskId is required" });
    }
    if (typeof message !== "string") {
      return res.status(400).json({ error: "message must be a string" });
    }
    const trimmed = message.trim();
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `message must be at most ${MAX_MESSAGE_LENGTH} characters` });
    }

    try {
      // sitterId always comes from the token, never from the body.
      const { result, application } = await ApplicationsDAO.addApplication({
        taskId,
        sitterId: req.user.id,
        message: trimmed,
      });
      if (result !== APPLY_RESULT.OK) {
        const [status, error] = APPLY_ERRORS[result];
        return res.status(status).json({ error });
      }
      return res.status(201).json(application);
    } catch (e) {
      console.error(`apiApplyToTask failed: ${e}`);
      return res.status(500).json({ error: "Could not apply to task" });
    }
  }

  static async apiGetMyApplications(req, res) {
    try {
      return res.json(await ApplicationsDAO.getApplicationsBySitterId(req.user.id));
    } catch (e) {
      console.error(`apiGetMyApplications failed: ${e}`);
      return res.status(500).json({ error: "Could not load applications" });
    }
  }
}
