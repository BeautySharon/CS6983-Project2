import OwnerApplicationsDAO, {
  AcceptanceError,
} from "../dao/ownerApplicationsDAO.js";
import TasksDAO from "../dao/tasksDAO.js";

export default class OwnerApplicationsController {
  static async apiGetOwnerApplications(req, res) {
    try {
      return res.json(await OwnerApplicationsDAO.getByOwner(req.user.id));
    } catch (error) {
      console.error(`Owner application list failed: ${error}`);
      return res.status(500).json({ error: "Could not load applications" });
    }
  }
  static async apiAccept(req, res) {
    const { taskId, applicationId } = req.body ?? {};
    try {
      TasksDAO.toObjId(taskId, "taskId");
      TasksDAO.toObjId(applicationId, "applicationId");
    } catch {
      return res
        .status(400)
        .json({ error: "Valid taskId and applicationId are required" });
    }
    try {
      return res.json(
        await OwnerApplicationsDAO.accept(taskId, applicationId, req.user.id),
      );
    } catch (error) {
      if (error instanceof AcceptanceError)
        return res.status(error.status).json({ error: error.message });
      console.error(`Accept application failed: ${error}`);
      return res.status(500).json({ error: "Could not accept application" });
    }
  }
}
