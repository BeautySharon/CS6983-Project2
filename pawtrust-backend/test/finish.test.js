import request from 'supertest';
import { expect } from 'chai';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import app from '../server.js';
import { testDb } from './setup.js';

const sitter = new ObjectId();
const other = new ObjectId();
const token = (id = sitter, userType = 'sitter', expiresIn = '1d') => jwt.sign({ sub: String(id), userType }, process.env.JWT_SECRET, { expiresIn });
const headers = (value = token()) => ({ Authorization: `Bearer ${value}` });
let taskId;
const finish = (id = taskId, auth = headers()) => request(app).post(`/pawtrust/tasks/${id}/finish`).set(auth).send({ sitterId: String(sitter) });
describe('Accepted tasks and finish (BR-5)', () => {
  beforeEach(async () => {
    await testDb.collection('tasks').deleteMany({});
    const result = await testDb.collection('tasks').insertOne({ acceptedSitterId: sitter, status: 'assigned', petType: 'Dog', date: new Date(), updatedAt: new Date(0) });
    taskId = String(result.insertedId);
  });
  it('lists only the authenticated sitter’s assigned tasks', async () => {
    await testDb.collection('tasks').insertMany([{ acceptedSitterId: other, status: 'assigned' }, { acceptedSitterId: sitter, status: 'finished' }, { status: 'open' }]);
    const res = await request(app).get('/pawtrust/tasks/accepted').set(headers());
    expect(res.status).to.equal(200);
    expect(res.body.map(t => t._id)).to.deep.equal([taskId]);
  });
  it('persists completion and removes the task from accepted tasks', async () => {
    const res = await finish();
    expect(res.status).to.equal(200);
    expect(res.body.status).to.equal('finished');
    expect((await testDb.collection('tasks').findOne({ _id: new ObjectId(taskId) })).status).to.equal('finished');
    expect((await request(app).get('/pawtrust/tasks/accepted').set(headers())).body).to.deep.equal([]);
    expect((await request(app).get('/pawtrust/tasks/finished').set(headers())).body[0]._id).to.equal(taskId);
  });
  it('rejects another sitter even when the body spoofs the assigned sitter', async () => {
    expect((await finish(taskId, headers(token(other)))).status).to.equal(403);
    expect((await testDb.collection('tasks').findOne({ _id: new ObjectId(taskId) })).status).to.equal('assigned');
  });
  it('returns 409 for repeated completion', async () => {
    await finish();
    expect((await finish()).status).to.equal(409);
  });
  it('allows exactly one concurrent completion', async () => {
    const results = await Promise.all([finish(), finish()]);
    expect(results.map(r => r.status).sort()).to.deep.equal([200, 409]);
  });
  it('rejects an unassigned task', async () => {
    await testDb.collection('tasks').updateOne({ _id: new ObjectId(taskId) }, { $set: { status: 'open', acceptedSitterId: null } });
    expect((await finish()).status).to.equal(403);
  });
  it('validates task ids and missing tasks', async () => {
    expect((await finish('invalid')).status).to.equal(400);
    expect((await finish(String(new ObjectId()))).status).to.equal(404);
  });
  for (const [name, auth, status] of [
    ['missing token', {}, 401], ['invalid token', headers('invalid'), 401],
    ['expired token', headers(token(sitter, 'sitter', -1)), 401], ['owner role', headers(token(other, 'owner')), 403],
  ]) {
    it(`protects both endpoints: ${name}`, async () => {
      expect((await finish(taskId, auth)).status).to.equal(status);
      expect((await request(app).get('/pawtrust/tasks/accepted').set(auth)).status).to.equal(status);
    });
  }
});
