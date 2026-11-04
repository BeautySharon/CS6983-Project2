import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import app from "./server.js";
import IndexesDAO from "./dao/indexesDAO.js";
import UsersDAO from "./dao/usersDAO.js";

dotenv.config();

const REQUIRED_ENV = ["PawTrust_DB_URI", "PawTrust_db", "JWT_SECRET"];

async function main() {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    console.error(`Missing env vars: ${missing.join(", ")}. Copy .env.example to .env and fill them in.`);
    process.exit(1);
  }

  const client = new MongoClient(process.env.PawTrust_DB_URI);
  const port = process.env.PORT || 8000;

  try {
    await client.connect();
    await IndexesDAO.injectDB(client);
    await UsersDAO.injectDB(client);

    app.listen(port, () => {
      console.log(`PawTrust backend listening on port ${port}`);
    });
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
