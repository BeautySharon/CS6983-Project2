import { test, expect, register, login } from '../fixtures.js';

for (const route of ['/owner', '/sitter']) {
  test(`logged-out access to ${route} redirects to login`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Login', exact: true })).toBeVisible();
  });
}

test('incorrect password is rejected and a valid login can recover', async ({ actors }) => {
  const { owner } = actors;
  await register(owner);
  await owner.page.getByLabel('Email', { exact: true }).fill(owner.email);
  await owner.page.getByLabel('Password', { exact: true }).fill(`${owner.password}-wrong`);
  await owner.page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(owner.page.getByRole('alert')).toBeVisible();
  await expect(owner.page).toHaveURL(/\/$/);
  await login(owner);
  await owner.page.reload();
  await expect(owner.page.getByRole('heading', { name: 'Owner Dashboard' })).toBeVisible();
  await owner.page.getByRole('button', { name: 'Logout', exact: true }).click();
  await owner.page.goto('/owner');
  await expect(owner.page).toHaveURL(/\/$/);
});

test('two sitters apply, one is accepted, and completion and review persist', async ({ actors }, testInfo) => {
  const { owner, sitter, other } = actors;
  for (const actor of [owner, sitter, other]) {
    await register(actor);
    await login(actor);
  }
  const description = `Pet care for ${owner.name}`;
  const location = `Location ${owner.name}`;
  const form = owner.page.getByRole('region', { name: 'Post a New Task' });
  await form.getByLabel('Pet Type').selectOption('Dog');
  await form.getByLabel('Description').fill(description);
  await form.getByLabel('Date & Time').fill(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16));
  await form.getByLabel('Duration (hours)').fill('2');
  await form.getByLabel('Location').fill(location);
  await form.getByRole('button', { name: 'Post Task', exact: true }).click();
  await expect(form.getByRole('status')).toHaveText('Task posted.');
  const card = owner.page.getByRole('article').filter({ hasText: description });
  await expect(card.getByText('open', { exact: true })).toBeVisible();
  await owner.page.reload();
  await expect(card).toBeVisible();

  for (const actor of [sitter, other]) {
    await actor.page.reload();
    const available = actor.page.getByRole('article').filter({ hasText: description });
    await available.getByLabel('Message (optional)').fill(`Application from ${actor.name}`);
    await available.getByRole('button', { name: 'Apply', exact: true }).click();
    await expect(available.getByRole('button', { name: 'Applied', exact: true })).toBeDisabled();
  }
  await owner.page.reload();
  await card.getByRole('button', { name: 'Applications (2)', exact: true }).click();
  await card.getByRole('button', { name: `Accept ${sitter.name}`, exact: true }).click();
  await card.getByRole('button', { name: 'Confirm accept', exact: true }).click();
  await expect(card.getByText('assigned', { exact: true })).toBeVisible();
  const applicationsToggle = card.getByRole('button', { name: 'Applications (2)', exact: true });
  if (await applicationsToggle.getAttribute('aria-expanded') === 'false') await applicationsToggle.click();
  await expect(card.getByText('Accepted', { exact: true })).toHaveCount(1);
  await expect(card.getByText('Not selected', { exact: true })).toHaveCount(1);
  await owner.page.reload();
  await card.getByRole('button', { name: 'Applications (2)', exact: true }).click();
  await expect(card.getByText('Not selected', { exact: true })).toBeVisible();
  for (const actor of [sitter, other]) await actor.page.reload();
  const accepted = sitter.page.getByRole('region', { name: 'Accepted Tasks', exact: true });
  await expect(accepted.getByText(description, { exact: true })).toBeVisible();
  await expect(other.page.getByRole('region', { name: 'Accepted Tasks', exact: true }).getByText('No accepted tasks yet.')).toBeVisible();
  await accepted.getByRole('button', { name: 'Mark as Finished' }).click();
  await expect(accepted.getByText('No accepted tasks yet.')).toBeVisible();
  const finished = sitter.page.getByRole('region', { name: 'Finished & Reviews', exact: true });
  await expect(finished.getByText(location, { exact: true })).toBeVisible();
  await sitter.page.reload();
  await expect(finished.getByText('No review yet', { exact: true })).toBeVisible();

  await owner.page.reload();
  await expect(card.getByText('finished', { exact: true })).toBeVisible();
  await card.getByRole('button', { name: 'Review', exact: true }).click();
  const dialog = owner.page.getByRole('dialog', { name: 'Review your sitter' });
  const fiveStars = dialog.getByRole('radio', { name: '5 of 5 stars' });
  await fiveStars.focus();
  await fiveStars.press('Space');
  await expect(fiveStars).toBeChecked();
  const comment = 'Reliable care and clear updates.';
  await dialog.getByLabel('Comment (optional)').fill(comment);
  await dialog.getByRole('button', { name: 'Submit review' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(card.getByText('Reviewed', { exact: true })).toBeVisible();
  await owner.page.reload();
  await expect(card.getByText('Reviewed', { exact: true })).toBeVisible();
  await sitter.page.reload();
  await expect(finished.getByText(comment, { exact: true })).toBeVisible();
  await expect(finished.getByText('Average rating 5.0', { exact: true })).toBeVisible();
  await testInfo.attach('Owner completed task', { body: await owner.page.screenshot({ fullPage: true }), contentType: 'image/png' });
  await testInfo.attach('Sitter review', { body: await sitter.page.screenshot({ fullPage: true }), contentType: 'image/png' });
});
