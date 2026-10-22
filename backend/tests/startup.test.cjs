const {test}=require('node:test');
const assert=require('node:assert/strict');
const dns=require('node:dns');
const {configureDatabaseDns}=require('../src/config/db');
const startupError=require('../src/config/startupError');
test('MongoDB DNS uses system settings unless explicitly overridden',()=>{
 const before=dns.getServers();configureDatabaseDns('');assert.deepEqual(dns.getServers(),before);
});
test('explicit MongoDB DNS accepts IPs and rejects malformed settings',()=>{
 const before=dns.getServers();try{configureDatabaseDns('1.1.1.1, 8.8.8.8');assert.deepEqual(dns.getServers(),['1.1.1.1','8.8.8.8']);assert.throws(()=>configureDatabaseDns('https://resolver.example'),/IP addresses/);}finally{dns.setServers(before);}
});
test('startup DNS diagnostic is actionable and does not disclose URI credentials',()=>{
 const error=new Error('querySrv EBADRESP mongodb+srv://private-user:private-password@private-host/db');error.code='EBADRESP';
 const message=startupError('database connection',error);assert.match(message,/MONGODB_DNS_SERVERS/);assert.doesNotMatch(message,/private-user|private-password|private-host/);
});
test('startup diagnostics distinguish configuration, authentication and occupied port',()=>{
 assert.match(startupError('configuration',new Error('Missing required configuration: MONGODB_URI')),/MONGODB_URI/);
 assert.match(startupError('database connection',Object.assign(new Error('bad auth'),{code:18})),/authentication failed/);
 assert.match(startupError('HTTP listener',Object.assign(new Error('private details'),{code:'EADDRINUSE'})),/PORT is already in use/);
});
test('unknown startup errors keep raw details private',()=>{
 assert.doesNotMatch(startupError('application initialization',new Error('sensitive-value')),/sensitive-value/);
});
