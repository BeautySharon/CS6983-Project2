import TasksDAO from "./tasksDAO.js";

let tasks;
let applications;

// Why an application could not be created.
export const APPLY_RESULT = {
  OK: "ok",
  TASK_NOT_FOUND: "task_not_found",
  TASK_NOT_OPEN: "task_not_open",
  DUPLICATE: "duplicate",
};

export default class ApplicationsDAO {
  static async injectDB(conn) {
    if (applications) return;
    const db = conn.db(process.env.PawTrust_db);
    tasks = db.collection("tasks");
    applications = db.collection("applications");
  }

  // BR-3: only open tasks, once per (task, sitter). The unique index on
  // { taskId, sitterId } makes a concurrent duplicate fail with 11000.
  static async addApplication({ taskId, sitterId, message }) {
    const task = TasksDAO.toObjId(taskId, "taskId");
    const sitter = TasksDAO.toObjId(sitterId, "sitterId");

    const found = await tasks.findOne({ _id: { $eq: task } }, { projection: { status: 1 } });
    if (!found) return { result: APPLY_RESULT.TASK_NOT_FOUND };
    if (found.status !== "open") return { result: APPLY_RESULT.TASK_NOT_OPEN };

    const doc = { taskId: task, sitterId: sitter, message, status: "pending", createdAt: new Date() };
    try {
      const { insertedId } = await applications.insertOne(doc);
      return { result: APPLY_RESULT.OK, application: { _id: insertedId, ...doc } };
    } catch (e) {
      if (e.code === 11000) return { result: APPLY_RESULT.DUPLICATE };
      throw e;
    }
  }

  // The sitter's applications, newest first.
  static async getApplicationsBySitterId(sitterId) {
    return applications
      .find({ sitterId: { $eq: TasksDAO.toObjId(sitterId, "sitterId") } })
      .sort({ createdAt: -1, _id: -1 })
      .toArray();
  }
}
