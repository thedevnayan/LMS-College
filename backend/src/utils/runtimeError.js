function databaseUnavailable(error) {
  return ['MongoNetworkError', 'MongoNetworkTimeoutError', 'MongoServerSelectionError', 'MongooseServerSelectionError', 'MongoPoolClearedError', 'MongoNotConnectedError', 'MongoTopologyClosedError'].includes(error?.name)
    || /buffering timed out|before initial connection is complete/i.test(error?.message || '');
}

function diagnostic(error) {
  // Never emit raw driver messages, request URLs, tokens or database URIs.
  const source = error?.stack?.split('\n').find(line => /[\\/]src[\\/].*:\d+:\d+/.test(line));
  return {
    errorType: /^[A-Za-z0-9]+$/.test(error?.name || '') ? error.name : 'Error',
    ...(typeof error?.code === 'number' ? { driverCode: error.code } : {}),
    ...(source ? { source: source.match(/src[\\/][\w./\\-]+:\d+:\d+/)?.[0] } : {}),
    ...(databaseUnavailable(error) ? { hint: 'Database connection unavailable; check network, Atlas availability and IP access list.' } : {}),
  };
}
module.exports = { databaseUnavailable, diagnostic };
