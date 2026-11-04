// Creates dummy test accounts in the dev database. Refuses to touch prod.
// Usage: npm run seed   (password comes from SEED_PASSWORD, default is a dummy value)
import { MongoClient } from "mongodb";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const DB_NAME = process.env.PawTrust_db;
if (!DB_NAME || DB_NAME === "pawtrust_prod") {
  console.error("Refusing to seed: set PawTrust_db to a dev database (e.g. pawtrust_dev).");
  process.exit(1);
}

const SEED_PASSWORD = process.env.SEED_PASSWORD || "password123";

const SEED_USERS = [
  { name: "Olivia Owner", email: "owner1@example.com", userType: "owner", location: "Seattle", bio: "" },
  { name: "Sam Sitter", email: "sitter1@example.com", userType: "sitter", location: "Seattle", bio: "Loves dogs and cats." },
  { name: "Sky Sitter", email: "sitter2@example.com", userType: "sitter", location: "Bellevue", bio: "" },
];

async function seed() {
  const client = new MongoClient(process.env.PawTrust_DB_URI);
  try {
    await client.connect();
    const users = client.db(DB_NAME).collection("users");
    const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

    for (const user of SEED_USERS) {
      await users.updateOne(
        { email: { $eq: user.email } },
        { $setOnInsert: { ...user, passwordHash, createdAt: new Date() } },
        { upsert: true }
      );
    }
    console.log(`Seeded ${SEED_USERS.length} accounts into ${DB_NAME}.`);
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

seed();
