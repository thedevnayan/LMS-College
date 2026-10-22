const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
async function client(t, fetcher) {
  const old={fetch:global.fetch,window:global.window,localStorage:global.localStorage};
  const values=new Map([['accessToken','old-token']]);
  global.localStorage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
  global.window={location:{pathname:'/admin/dashboard',href:''}};
  global.fetch=fetcher;
  t.after(()=>Object.assign(global,old));
  const source=fs.readFileSync(path.resolve(__dirname,'../../frontend/src/services/api.js'),'utf8');
  return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64')+'#'+Math.random());
}
const response=(status,data)=>({status,ok:status>=200&&status<300,json:async()=>data});
test('temporary refresh outage preserves token and does not redirect',async t=>{
  const api=await client(t,async url=>url.endsWith('/auth/refresh')?response(503,{error:{code:'DATABASE_UNAVAILABLE',message:'Try again'}}):response(401,{}));
  await assert.rejects(api.request('/tests'),e=>e.status===503);
  assert.equal(api.getToken(),'old-token');assert.equal(window.location.href,'');
});
test('parallel expired requests share refresh; late 401 reuses renewed token',async t=>{
  let refreshes=0,release;const delayed=new Promise(r=>release=r);
  const api=await client(t,async(url,config)=>{
    if(url.endsWith('/auth/refresh')){refreshes++;await new Promise(r=>setTimeout(r,10));return response(200,{success:true,data:{accessToken:'new-token'}});}
    if(config.headers.Authorization==='Bearer new-token')return response(200,{success:true});
    if(url.endsWith('/late'))await delayed;
    return response(401,{});
  });
  const late=api.request('/late');await Promise.all([api.request('/one'),api.request('/two')]);release();await late;
  assert.equal(refreshes,1);assert.equal(api.getToken(),'new-token');
});
test('invalid refresh logs admin out to admin login',async t=>{
  const api=await client(t,async()=>response(401,{error:{code:'INVALID_REFRESH_TOKEN'}}));
  await assert.rejects(api.request('/tests'));assert.equal(api.getToken(),undefined);assert.equal(window.location.href,'/admin/login');
});
test('database failure returns 503 with sanitized diagnostic',t=>{
  const {errorHandler}=require('../src/middleware/errorHandler');
  const old=console.error;let log;console.error=value=>log=value;t.after(()=>console.error=old);
  const err=new Error('mongodb://secret-user:secret-password@private-host');err.name='MongoNetworkError';
  const res={set(){return this;},status(value){this.code=value;return this;},json(value){this.body=value;}};
  errorHandler(err,{method:'GET',route:{path:'/:id/my-report'}},res,()=>{});
  assert.equal(res.code,503);assert.equal(res.body.error.code,'DATABASE_UNAVAILABLE');assert.match(log,/MongoNetworkError/);assert.doesNotMatch(log,/secret-user|secret-password|private-host/);
});
