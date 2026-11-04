// Creates the unique indexes the business rules rely on (PRD §8). Idempotent.
export default class IndexesDAO {
  static async injectDB(conn) {
    const db = conn.db(process.env.PawTrust_db);
    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    await db
      .collection("applications")
      .createIndex({ taskId: 1, sitterId: 1 }, { unique: true });
    await db.collection("reviews").createIndex({ taskId: 1 }, { unique: true });
  }
}
