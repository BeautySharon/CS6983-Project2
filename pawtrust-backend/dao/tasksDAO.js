import mongodb from "mongodb";

const { ObjectId } = mongodb;

let client;
let tasks;
let applications;

// Why a conditional update/delete matched nothing.
export const WRITE_RESULT = {
  OK: "ok",
  NOT_FOUND: "not_found",
  FORBIDDEN: "forbidden",
  NOT_OPEN: "not_open",
};

export default class TasksDAO {
  static async injectDB(conn) {
    if (tasks) return;
    client = conn;
    const db = conn.db(process.env.PawTrust_db);
    tasks = db.collection("tasks");
    applications = db.collection("applications");
  }

  static getClient() {
    return client;
  }

  static toObjId(value, name = "id") {
    if (typeof value !== "string" || !ObjectId.isValid(value) || !/^[0-9a-f]{24}$/i.test(value)) {
      throw new Error(`Invalid ${name}`);
    }
    return new ObjectId(value);
  }

  static async addTask({ ownerId, petType, description, date, duration, location }) {
    const now = new Date();
    const taskDoc = {
      ownerId: TasksDAO.toObjId(ownerId, "ownerId"),
      petType,
      description,
      date,
      duration,
      location,
      status: "open",
      acceptedSitterId: null,
      reviewed: false,
      createdAt: now,
      updatedAt: now,
    };
    const result = await tasks.insertOne(taskDoc);
    return { _id: result.insertedId, ...taskDoc, applicationCount: 0 };
  }

  // Owner's tasks, newest first, each with the number of applications.
  static async getTasksByOwnerId(ownerId) {
    return tasks
      .aggregate([
        { $match: { ownerId: { $eq: TasksDAO.toObjId(ownerId, "ownerId") } } },
        { $sort: { createdAt: -1, _id: -1 } },
        {
          $lookup: {
            from: applications.collectionName,
            localField: "_id",
            foreignField: "taskId",
            as: "applications",
          },
        },
        { $addFields: { applicationCount: { $size: "$applications" } } },
        { $project: { applications: 0 } },
      ])
      .toArray();
  }

  // US-5: every open task, soonest date first.
  static async getAvailableTasks() {
    return tasks.find({ status: "open" }).sort({ date: 1, _id: 1 }).toArray();
  }

  // US-10: the sitter's finished tasks, most recently updated first, each with
  // its review (or null) so the dashboard can show "No review yet".
  static async getFinishedTasksBySitterId(sitterId) {
    return tasks
      .aggregate([
        { $match: { acceptedSitterId: { $eq: TasksDAO.toObjId(sitterId, "sitterId") }, status: "finished" } },
        { $sort: { updatedAt: -1, _id: -1 } },
        { $lookup: { from: "reviews", localField: "_id", foreignField: "taskId", as: "reviews" } },
        { $addFields: { review: { $ifNull: [{ $arrayElemAt: ["$reviews", 0] }, null] } } },
        { $project: { reviews: 0 } },
      ])
      .toArray();
  }

  static async getTaskById(taskId) {
    return tasks.findOne({ _id: { $eq: TasksDAO.toObjId(taskId, "taskId") } });
  }

  // Explains a conditional write that matched nothing.
  static async diagnoseWrite(taskId, ownerId) {
    const task = await tasks.findOne({ _id: taskId }, { projection: { ownerId: 1, status: 1 } });
    if (!task) return WRITE_RESULT.NOT_FOUND;
    if (!task.ownerId.equals(ownerId)) return WRITE_RESULT.FORBIDDEN;
    if (task.status !== "open") return WRITE_RESULT.NOT_OPEN;
    // Matched nothing but looks writable now: it changed concurrently; treat as not open.
    return WRITE_RESULT.NOT_OPEN;
  }

  // BR-2: only the owner, only while open. Returns { result, task }.
  static async updateTask(taskId, ownerId, fields) {
    const _id = TasksDAO.toObjId(taskId, "taskId");
    const owner = TasksDAO.toObjId(ownerId, "ownerId");
    const task = await tasks.findOneAndUpdate(
      { _id, ownerId: owner, status: "open" },
      { $set: { ...fields, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    // mongodb 5.x returns { value }; 6.x returns the document.
    const updated = task && "value" in task ? task.value : task;
    if (updated) return { result: WRITE_RESULT.OK, task: updated };
    return { result: await TasksDAO.diagnoseWrite(_id, owner), task: null };
  }

  // BR-2: only the owner, only while open. Also removes the task's applications.
  static async deleteTask(taskId, ownerId) {
    const _id = TasksDAO.toObjId(taskId, "taskId");
    const owner = TasksDAO.toObjId(ownerId, "ownerId");
    const { deletedCount } = await tasks.deleteOne({ _id, ownerId: owner, status: "open" });
    if (deletedCount === 1) {
      await applications.deleteMany({ taskId: _id });
      return WRITE_RESULT.OK;
    }
    return TasksDAO.diagnoseWrite(_id, owner);
  }
}
