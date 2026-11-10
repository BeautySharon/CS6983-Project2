// E2E is deliberately local-only. It must never target a deployed database.
export const databaseUri = process.env.E2E_MONGO_URI;
if (!databaseUri || !/^mongodb:\/\/(127\.0\.0\.1|localhost):\d+\//.test(databaseUri)) {
  throw new Error('Set E2E_MONGO_URI to a loopback MongoDB replica-set URI. Remote databases are not allowed.');
}
const parsed = new URL(databaseUri);
if (parsed.username || parsed.password || !parsed.searchParams.get('replicaSet')) {
  throw new Error('E2E requires a local replica set without stored credentials.');
}
export const databaseName = 'pawtrust_test';
