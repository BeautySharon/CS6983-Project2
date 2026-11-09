import { test as base, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { databaseUri, databaseName } from './test-environment.js';

export const test = base.extend({
  actors: async ({ browser, baseURL }, use, testInfo) => {
    const runId = randomUUID();
    const actors = {};
    const client = new MongoClient(databaseUri);
    const emails = [];
    try {
      await client.connect();
      for (const [key, role] of [['owner', 'owner'], ['sitter', 'sitter'], ['other', 'sitter']]) {
        const context = await browser.newContext({ baseURL });
        const email = `e2e-${runId}-${key}@example.com`;
        emails.push(email);
        actors[key] = {
          context, page: await context.newPage(), role,
          name: `Test ${key} ${runId.slice(0, 8)}`, email, password: randomUUID(),
        };
      }
      await use(actors);
    } finally {
      for (const [key, actor] of Object.entries(actors)) {
        try {
          if (testInfo.status !== testInfo.expectedStatus) {
            await testInfo.attach(`${key} screenshot`, {
              body: await actor.page.screenshot({ fullPage: true }), contentType: 'image/png',
            });
          }
        } finally { await actor.context.close(); }
      }
      try {
        const db = client.db(databaseName);
        const userIds = (await db.collection('users').find({ email: { $in: emails } }).toArray()).map(u => u._id);
        const taskIds = (await db.collection('tasks').find({ ownerId: { $in: userIds } }).toArray()).map(t => t._id);
        await db.collection('reviews').deleteMany({ taskId: { $in: taskIds } });
        await db.collection('applications').deleteMany({ $or: [{ taskId: { $in: taskIds } }, { sitterId: { $in: userIds } }] });
        await db.collection('tasks').deleteMany({ _id: { $in: taskIds } });
        await db.collection('users').deleteMany({ _id: { $in: userIds } });
      } finally { await client.close(); }
    }
  },
});
export { expect };

export async function register(actor) {
  const { page } = actor;
  await page.goto('/register');
  await page.getByLabel('Name', { exact: true }).fill(actor.name);
  await page.getByLabel('Email', { exact: true }).fill(actor.email);
  await page.getByLabel('Password', { exact: true }).fill(actor.password);
  await page.getByRole('radio', { name: actor.role === 'owner' ? 'Pet Owner' : 'Pet Sitter' }).check();
  await page.getByLabel('Location', { exact: true }).fill('Test City');
  await page.getByRole('button', { name: 'Create Account', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Account created. Log in to get started.');
}
export async function login(actor) {
  await actor.page.goto('/');
  await actor.page.getByLabel('Email', { exact: true }).fill(actor.email);
  await actor.page.getByLabel('Password', { exact: true }).fill(actor.password);
  await actor.page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(actor.page).toHaveURL(new RegExp(`/${actor.role}$`));
}
