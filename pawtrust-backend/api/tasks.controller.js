import TasksDAO, { WRITE_RESULT } from "../dao/tasksDAO.js";

const TEXT_FIELDS = ["petType", "description", "location"];
const EDITABLE_FIELDS = [...TEXT_FIELDS, "date", "duration"];

const WRITE_ERRORS = {
  [WRITE_RESULT.NOT_FOUND]: [404, "Task not found"],
  [WRITE_RESULT.FORBIDDEN]: [403, "Forbidden"],
  [WRITE_RESULT.NOT_OPEN]: [400, "Only open tasks can be changed"],
};

function isValidTaskId(id) {
  try {
    TasksDAO.toObjId(id, "taskId");
    return true;
  } catch {
    return false;
  }
}

// Validates the given task fields. `partial` allows a subset (for PUT).
// Returns { error } or { fields } with trimmed strings, a Date and a number.
function parseTaskFields(body, { partial }) {
  const fields = {};
  const present = EDITABLE_FIELDS.filter((name) => body[name] !== undefined);

  if (!partial) {
    const missing = EDITABLE_FIELDS.find((name) => body[name] === undefined || body[name] === "");
    if (missing) return { error: `${missing} is required` };
  } else if (present.length === 0) {
    return { error: `Provide at least one of: ${EDITABLE_FIELDS.join(", ")}` };
  }

  for (const name of TEXT_FIELDS) {
    if (body[name] === undefined) continue;
    if (typeof body[name] !== "string" || body[name].trim() === "") {
      return { error: `${name} must be a non-empty string` };
    }
    fields[name] = body[name].trim();
  }

  if (body.date !== undefined) {
    const date = typeof body.date === "string" ? new Date(body.date) : null;
    if (!date || Number.isNaN(date.getTime())) return { error: "date must be a valid date" };
    if (date <= new Date()) return { error: "date must be in the future" };
    fields.date = date;
  }

  if (body.duration !== undefined) {
    if (typeof body.duration !== "number" || !Number.isFinite(body.duration) || body.duration <= 0) {
      return { error: "duration must be a number greater than 0" };
    }
    fields.duration = body.duration;
  }

  return { fields };
}

export default class TasksController {
  static async apiPostTask(req, res) {
    const { error, fields } = parseTaskFields(req.body ?? {}, { partial: false });
    if (error) return res.status(400).json({ error });

    try {
      // ownerId always comes from the token, never from the body.
      const task = await TasksDAO.addTask({ ...fields, ownerId: req.user.id });
      return res.status(201).json(task);
    } catch (e) {
      console.error(`apiPostTask failed: ${e}`);
      return res.status(500).json({ error: "Could not create task" });
    }
  }

  static async apiGetMyTasks(req, res) {
    try {
      const tasks = await TasksDAO.getTasksByOwnerId(req.user.id);
      return res.json(tasks);
    } catch (e) {
      console.error(`apiGetMyTasks failed: ${e}`);
      return res.status(500).json({ error: "Could not load tasks" });
    }
  }

  static async apiUpdateTask(req, res) {
    if (!isValidTaskId(req.params.id)) return res.status(400).json({ error: "Invalid task id" });
    const { error, fields } = parseTaskFields(req.body ?? {}, { partial: true });
    if (error) return res.status(400).json({ error });

    try {
      const { result, task } = await TasksDAO.updateTask(req.params.id, req.user.id, fields);
      if (result !== WRITE_RESULT.OK) {
        const [status, message] = WRITE_ERRORS[result];
        return res.status(status).json({ error: message });
      }
      return res.json(task);
    } catch (e) {
      console.error(`apiUpdateTask failed: ${e}`);
      return res.status(500).json({ error: "Could not update task" });
    }
  }

  static async apiDeleteTask(req, res) {
    if (!isValidTaskId(req.params.id)) return res.status(400).json({ error: "Invalid task id" });

    try {
      const result = await TasksDAO.deleteTask(req.params.id, req.user.id);
      if (result !== WRITE_RESULT.OK) {
        const [status, message] = WRITE_ERRORS[result];
        return res.status(status).json({ error: message });
      }
      return res.json({ deletedId: req.params.id });
    } catch (e) {
      console.error(`apiDeleteTask failed: ${e}`);
      return res.status(500).json({ error: "Could not delete task" });
    }
  }
}
