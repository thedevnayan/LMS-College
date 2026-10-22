const mongoose = require('mongoose');
const dns = require('node:dns');
const { isIP } = require('node:net');

function configureDatabaseDns(value = process.env.MONGODB_DNS_SERVERS) {
  if (!value?.trim()) return;
  const servers = value.split(',').map(server => server.trim());
  if (servers.some(server => !isIP(server))) throw new Error('MONGODB_DNS_SERVERS must contain comma-separated IP addresses');
  // Explicit process-local override; do not alter the operating system resolver.
  dns.setServers(servers);
}

module.exports = async () => {
  configureDatabaseDns();
  return mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: Number(process.env.DB_POOL_SIZE || 30), minPoolSize: 2,
  serverSelectionTimeoutMS: 10000, autoIndex: process.env.NODE_ENV !== 'production',
  });
};
module.exports.configureDatabaseDns = configureDatabaseDns;
