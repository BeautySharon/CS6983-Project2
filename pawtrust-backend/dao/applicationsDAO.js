import TasksDAO from "./tasksDAO.js";

let client;
let tasks;
let applications;

// Why an application could not be created.
export const APPLY_RESULT = {
  OK: "ok",
  TASK_NOT_FOUND: "task_not_found",
  TASK_NOT_OPEN: "task_not_open",
  DUPLICATE: "duplicate",
};

// Carries a non-OK result out of the transaction callback, which aborts it.
class ApplyAbort extends Error {
  constructor(result) {
    super(result);
    this.result = result;
  }
}

export default class ApplicationsDAO {
  static async injectDB(conn) {
    if (applications) return;
    client = conn;
    const db = conn.db(process.env.PawTrust_db);
    tasks = db.collection("tasks");
    applications = db.collection("applications");
  }

  // BR-3: only open tasks, once per (task, sitter).
  //
  // The open check and the insert run in one transaction. The check is a
  // conditional *write* on the task ({ _id, status: "open" }), not a read, so
  // it conflicts with the accept transaction (#11), which writes the same task:
  // either this application commits first and accept sees it and rejects it,
  // or accept commits first and this returns TASK_NOT_OPEN. A plain read would
  // let an application slip in as "pending" after another sitter was accepted.
  //
  // Duplicates, including concurrent ones, fail on the unique
  // { taskId, sitterId } index with error 11000.
  static async addApplication({ taskId, sitterId, message }) {
    const task = TasksDAO.toObjId(taskId, "taskId");
    const sitter = TasksDAO.toObjId(sitterId, "sitterId");
    const now = new Date();
    const doc = { taskId: task, sitterId: sitter, message, status: "pending", createdAt: now };

    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        const { matchedCount } = await tasks.updateOne(
          { _id: { $eq: task }, status: "open" },
          { $set: { lastAppliedAt: now } },
          { session }
        );
        if (matchedCount === 0) {
          const exists = await tasks.countDocuments({ _id: { $eq: task } }, { session });
          throw new ApplyAbort(exists ? APPLY_RESULT.TASK_NOT_OPEN : APPLY_RESULT.TASK_NOT_FOUND);
        }
        const { insertedId } = await applications.insertOne(doc, { session });
        doc._id = insertedId;
      });
      return { result: APPLY_RESULT.OK, application: doc };
    } catch (e) {
      if (e instanceof ApplyAbort) return { result: e.result };
      if (e.code === 11000) return { result: APPLY_RESULT.DUPLICATE };
      throw e;
    } finally {
      await session.endSession();
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
