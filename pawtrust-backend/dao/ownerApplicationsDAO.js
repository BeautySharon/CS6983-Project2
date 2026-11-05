import TasksDAO from "./tasksDAO.js";

let client, tasks, applications;
export class AcceptanceError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export default class OwnerApplicationsDAO {
  static async injectDB(conn) {
    client = conn;
    const db = conn.db(process.env.PawTrust_db);
    tasks = db.collection("tasks");
    applications = db.collection("applications");
  }
  static async getByOwner(ownerId) {
    return tasks
      .aggregate([
        { $match: { ownerId: TasksDAO.toObjId(ownerId, "ownerId") } },
        {
          $lookup: {
            from: "applications",
            localField: "_id",
            foreignField: "taskId",
            as: "application",
          },
        },
        { $unwind: "$application" },
        { $replaceRoot: { newRoot: "$application" } },
        {
          $lookup: {
            from: "users",
            localField: "sitterId",
            foreignField: "_id",
            as: "sitter",
          },
        },
        {
          $project: {
            taskId: 1,
            sitterId: 1,
            message: 1,
            status: 1,
            createdAt: 1,
            sitterName: {
              $ifNull: [
                { $arrayElemAt: ["$sitter.name", 0] },
                "Unavailable sitter",
              ],
            },
          },
        },
        { $sort: { createdAt: 1, _id: 1 } },
      ])
      .toArray();
  }
  static async accept(taskId, applicationId, ownerId) {
    const _id = TasksDAO.toObjId(taskId, "taskId");
    const application = TasksDAO.toObjId(applicationId, "applicationId");
    const owner = TasksDAO.toObjId(ownerId, "ownerId");
    const session = client.startSession();
    try {
      await session.withTransaction(
        async () => {
          const task = await tasks.findOne({ _id }, { session });
          if (!task) throw new AcceptanceError(404, "Task not found");
          if (!task.ownerId.equals(owner))
            throw new AcceptanceError(403, "Forbidden");
          if (task.status !== "open")
            throw new AcceptanceError(
              409,
              "Task is already assigned or closed",
            );
          const chosen = await applications.findOne(
            { _id: application, taskId: _id },
            { session },
          );
          if (!chosen)
            throw new AcceptanceError(
              404,
              "Application not found for this task",
            );
          if (chosen.status !== "pending")
            throw new AcceptanceError(409, "Application is no longer pending");
          const result = await tasks.updateOne(
            { _id, ownerId: owner, status: "open" },
            {
              $set: {
                status: "assigned",
                acceptedSitterId: chosen.sitterId,
                updatedAt: new Date(),
              },
            },
            { session },
          );
          if (result.matchedCount !== 1)
            throw new AcceptanceError(
              409,
              "Task is already assigned or closed",
            );
          const accepted = await applications.updateOne(
            { _id: application, taskId: _id, status: "pending" },
            { $set: { status: "accepted" } },
            { session },
          );
          if (accepted.matchedCount !== 1)
            throw new AcceptanceError(409, "Application is no longer pending");
          await applications.updateMany(
            { taskId: _id, _id: { $ne: application } },
            { $set: { status: "rejected" } },
            { session },
          );
        },
        { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } },
      );
      return { taskId: _id, applicationId: application, status: "assigned" };
    } finally {
      await session.endSession();
    }
  }
}
