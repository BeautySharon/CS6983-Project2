import TasksDAO from "./tasksDAO.js";

let tasks;
let reviews;

// Why a review could not be created.
export const REVIEW_RESULT = {
  OK: "ok",
  TASK_NOT_FOUND: "task_not_found",
  FORBIDDEN: "forbidden",
  NOT_FINISHED: "not_finished",
  DUPLICATE: "duplicate",
};

export default class ReviewsDAO {
  static async injectDB(conn) {
    if (reviews) return;
    const db = conn.db(process.env.PawTrust_db);
    tasks = db.collection("tasks");
    reviews = db.collection("reviews");
  }

  // BR-6: only the task's owner, only for a finished task with an accepted
  // sitter, once per task. The unique index on reviews.taskId turns a
  // duplicate (including a concurrent one) into error 11000.
  static async addReview({ taskId, ownerId, rating, comment }) {
    const _id = TasksDAO.toObjId(taskId, "taskId");
    const owner = TasksDAO.toObjId(ownerId, "ownerId");

    const task = await tasks.findOne({ _id: { $eq: _id } });
    if (!task) return { result: REVIEW_RESULT.TASK_NOT_FOUND };
    if (!task.ownerId.equals(owner)) return { result: REVIEW_RESULT.FORBIDDEN };
    if (task.status !== "finished" || !task.acceptedSitterId) return { result: REVIEW_RESULT.NOT_FINISHED };

    const doc = { taskId: _id, ownerId: owner, sitterId: task.acceptedSitterId, rating, comment, createdAt: new Date() };
    try {
      const { insertedId } = await reviews.insertOne(doc);
      await tasks.updateOne({ _id, status: "finished" }, { $set: { reviewed: true, updatedAt: new Date() } });
      return { result: REVIEW_RESULT.OK, review: { _id: insertedId, ...doc } };
    } catch (e) {
      if (e.code === 11000) return { result: REVIEW_RESULT.DUPLICATE };
      throw e;
    }
  }

  static async getReviewsBySitterId(sitterId) {
    return reviews
      .find({ sitterId: { $eq: TasksDAO.toObjId(sitterId, "sitterId") } })
      .sort({ createdAt: -1, _id: -1 })
      .toArray();
  }

  static async getReviewByTaskId(taskId) {
    return reviews.findOne({ taskId: { $eq: TasksDAO.toObjId(taskId, "taskId") } });
  }
}
