const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { parseArgs } = require('node:util');
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function seedAdmin({ email, name = 'SkillBery Admin', password }) {
  email = String(email || '').trim().toLowerCase();
  name = String(name).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Provide a valid admin email address.');
  if (!name) throw new Error('Admin name cannot be empty.');
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== 'admin') throw new Error('That email belongs to a non-admin account; no changes were made.');
    return { created: false, user: existing };
  }
  password = password === undefined ? randomBytes(24).toString('base64url') : password;
  if (typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('Admin password must have at least 12 characters and at most 72 UTF-8 bytes.');
  }
  // The User save hook hashes the password with bcrypt.
  try {
    const user = await User.create({ name, email, password, role: 'admin', isActive: true });
    return { created: true, user, password };
  } catch (error) {
    if (error.code !== 11000) throw error;
    const winner = await User.findOne({ email });
    if (winner?.role === 'admin') return { created: false, user: winner };
    throw new Error('That email was registered concurrently; no existing account was changed.');
  }
}

async function main() {
  const { values } = parseArgs({ options: { email: { type: 'string' }, name: { type: 'string' }, help: { type: 'boolean' } } });
  if (values.help) {
    console.log('npm run seed:admin -- --email admin@example.com --name "College Admin"\nDefault email: admin@skillbery.local. Generates a random password unless SEED_ADMIN_PASSWORD is supplied. Existing accounts are never overwritten.');
    return;
  }
  require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
  if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI in backend/.env before seeding.');
  await require('../src/config/db')();
  // Enforce email uniqueness even when production auto-indexing is disabled.
  await User.createIndexes();
  const result = await seedAdmin({
    email: values.email || process.env.SEED_ADMIN_EMAIL || 'admin@skillbery.local',
    name: values.name || process.env.SEED_ADMIN_NAME || 'SkillBery Admin',
    password: process.env.SEED_ADMIN_PASSWORD,
  });
  if (!result.created) {
    console.log('Admin already exists. Password, role and account status were left unchanged.');
    return;
  }
  console.log(`Admin created successfully.\nLogin page: /admin/login\nUser ID (email): ${result.user.email}\nPassword: ${result.password}\nSave these credentials securely; the password will not be shown on subsequent runs.`);
}

if (require.main === module) {
  main().catch(error => {
    const safeMessages = /^(Provide a valid|Admin name|Admin password|That email|Set MONGODB_URI)/;
    console.error(safeMessages.test(error.message) ? error.message : require('../src/config/startupError')('admin seed', error));
    process.exitCode = 1;
  }).finally(() => mongoose.disconnect());
}
module.exports = { seedAdmin };
