import mongodb from "mongodb";

const { ObjectId } = mongodb;

let client;
let users;

export class DuplicateEmailError extends Error {}

// Strip fields that must never leave the server.
function toPublicUser(user) {
  if (!user) return null;
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

export default class UsersDAO {
  static async injectDB(conn) {
    if (users) return;
    client = conn;
    users = conn.db(process.env.PawTrust_db).collection("users");
  }

  static getClient() {
    return client;
  }

  static toObjId(value, name = "id") {
    if (typeof value !== "string" || !ObjectId.isValid(value)) {
      throw new Error(`Invalid ${name}`);
    }
    return new ObjectId(value);
  }

  // Returns the full document (including passwordHash) for login checks.
  static async getUserByEmail(email) {
    return users.findOne({ email: { $eq: email } });
  }

  // Inserts a user; returns it without passwordHash. Throws DuplicateEmailError on a taken email.
  static async addUser({ name, email, passwordHash, userType, location, bio }) {
    const userDoc = {
      name,
      email,
      passwordHash,
      userType,
      location,
      bio,
      createdAt: new Date(),
    };
    try {
      const result = await users.insertOne(userDoc);
      return toPublicUser({ _id: result.insertedId, ...userDoc });
    } catch (e) {
      if (e.code === 11000) throw new DuplicateEmailError("Email already registered");
      throw e;
    }
  }

  static toPublicUser(user) {
    return toPublicUser(user);
  }
}
