// Do not print raw driver errors: they can contain URIs or credentials.
module.exports = function startupError(stage, error) {
  const code = String(error.code || error.name || 'UNKNOWN');
  if (stage === 'configuration') return `Startup failed: ${error.message}`;
  if (error.message === 'MONGODB_DNS_SERVERS must contain comma-separated IP addresses') return `Startup failed: ${error.message}`;
  if (/querySrv|queryTxt|EBADRESP|ENOTFOUND|ETIMEOUT|EAI_AGAIN/i.test(`${code} ${error.message}`)) {
    return 'Startup failed: MongoDB DNS lookup failed. Check your network DNS or set MONGODB_DNS_SERVERS in backend/.env to reachable DNS resolver IPs (for example 1.1.1.1,8.8.8.8).';
  }
  if (code === '18' || /authentication failed|bad auth/i.test(error.message || '')) return 'Startup failed: MongoDB authentication failed. Check the database username, password and authSource in MONGODB_URI.';
  if (code === 'EADDRINUSE') return 'Startup failed: PORT is already in use. Stop the other backend instance or choose a different PORT.';
  if (error.name === 'MongoServerSelectionError' || error.name === 'MongooseServerSelectionError') return 'Startup failed: MongoDB is unreachable. Check network access, database availability, TLS and the Atlas IP access list.';
  return `Startup failed during ${stage}. Error type: ${error.name || 'Error'}. Check the corresponding configuration; driver details are withheld to protect credentials.`;
};
