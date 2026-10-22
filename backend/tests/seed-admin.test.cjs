const { test } = require('node:test');
const assert = require('node:assert/strict');
const { database } = require('./fixtures.cjs');
const User = require('../src/models/User');
const { seedAdmin } = require('../scripts/seed-admin.cjs');

test('admin seed hashes credentials, is repeatable, and never promotes an existing student', async () => {
  const cleanup = await database();
  try {
    const first = await seedAdmin({ email: ' ADMIN@example.test ', password: 'SyntheticAdmin123!' });
    assert.equal(first.created, true);
    assert.equal(first.user.email, 'admin@example.test');
    assert.equal(first.user.role, 'admin');
    assert.notEqual(first.user.password, first.password);
    assert.equal(await first.user.matchPassword(first.password), true);
    const second = await seedAdmin({ email: 'admin@example.test', password: 'DifferentPassword123!' });
    assert.equal(second.created, false);
    assert.equal(second.password, undefined);
    assert.equal(await second.user.matchPassword(first.password), true);
    const generated = await seedAdmin({ email: 'generated@example.test' });
    assert.ok(generated.password.length >= 12);
    assert.equal(await generated.user.matchPassword(generated.password), true);
    await User.create({ name: 'Student', email: 'student@example.test', password: 'SyntheticStudent123!', role: 'student' });
    await assert.rejects(seedAdmin({ email: 'student@example.test' }), /non-admin/);
    assert.equal((await User.findOne({ email: 'student@example.test' })).role, 'student');
    await assert.rejects(seedAdmin({ email: 'weak@example.test', password: 'short' }), /at least 12/);
    assert.equal(await User.countDocuments({ email: 'weak@example.test' }), 0);
  } finally { await cleanup(); }
});
