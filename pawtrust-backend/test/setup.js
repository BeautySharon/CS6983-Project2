// Mocha root hooks: connect once to the TEST database and inject DAOs.
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import IndexesDAO from "../dao/indexesDAO.js";
import UsersDAO from "../dao/usersDAO.js";
import TasksDAO from "../dao/tasksDAO.js";

dotenv.config();
// Tests only ever touch pawtrust_test, whatever .env says.
process.env.PawTrust_db = "pawtrust_test";
// Tests sign their own tokens; fall back to a throwaway secret if .env has none (e.g. CI).
process.env.JWT_SECRET ||= "test-only-jwt-secret";

export let testDb;
let client;

export const mochaHooks = {
  async beforeAll() {
    client = new MongoClient(process.env.PawTrust_DB_URI);
    await client.connect();
    testDb = client.db("pawtrust_test");
    await IndexesDAO.injectDB(client);
    await UsersDAO.injectDB(client);
    await TasksDAO.injectDB(client);
  },
  async afterAll() {
    await client?.close();
  },
};
