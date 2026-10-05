import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')
let user = 'A', fail = false, pause = async () => {}
const calls = [], storage = new Map()
const action = async (...args) => { if (fail) throw Error('Disconnected'); calls.push([user,...args]); await pause(); return [{id: args[0] ?? 'saved-id'}] }
const context = vm.createContext({
  exports: {}, navigator: { onLine: true },
  localStorage: { getItem:k=>storage.get(k)??null, setItem:(k,v)=>storage.set(k,v) },
  require: name => name.includes('supabase')
    ? { createClient:()=>({auth:{getSession:async()=>({data:{session:{user:{id:user}}}})}}) }
    : { saveEvent:action, deleteEvent:action, upsertWeeklyLog:action },
})
const source = fs.readFileSync(new URL('../src/lib/offline.ts',import.meta.url),'utf8')
vm.runInContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context)
const api = context.exports
await api.writeOffline('notes',['A'])
user='B'; assert.equal(await api.readOffline('notes'),null)
user='A'; assert.deepEqual(Array.from(await api.readOffline('notes')),['A'])
const op = {kind:'save-event',localId:'offline-A',payload:[null,'2026-10-05','One','']}
await api.queueOffline(op)
await api.queueOffline({...op,payload:[null,'2026-10-05','Updated','']})
assert.equal(JSON.parse(storage.get('agenda-offline:A:queue')).length,1)
context.navigator.onLine=false;assert.equal(await api.flushOfflineQueue(),false);assert.equal(calls.length,0)
context.navigator.onLine=true;fail=true;assert.equal(await api.flushOfflineQueue(),false)
assert.equal(JSON.parse(storage.get('agenda-offline:A:queue')).length,1)
fail=false;user='B';assert.equal(await api.flushOfflineQueue(),true);assert.equal(calls.length,0)
user='A';assert.equal(await api.flushOfflineQueue(),true);assert.equal(calls.length,1);assert.equal(calls[0][3],'Updated')
await api.queueOffline(op)
await api.queueOffline({kind:'delete-event',localId:'offline-A',payload:['offline-A']})
assert.equal(JSON.parse(storage.get('agenda-offline:A:queue')).length,0)
let release, started
const entered = new Promise(resolve => { started = resolve })
pause = () => new Promise(resolve => { release = resolve; started() })
await api.queueOffline({kind:'save-event',localId:'existing',payload:['existing','2026-10-05','First','']})
const syncing = api.flushOfflineQueue()
await entered
await api.queueOffline({kind:'save-event',localId:'existing',payload:['existing','2026-10-05','Latest','']})
await api.queueOffline({kind:'save-log',localId:'week-42',payload:[42,2026,'New journal']})
const simultaneous = api.flushOfflineQueue()
pause = async () => {}; release()
await Promise.all([syncing,simultaneous])
assert.equal(calls.filter(call=>call[3]==='Latest').length,1,'An edit made during synchronization must survive')
assert.equal(calls.filter(call=>call[3]==='First').length,1,'Concurrent flushes must not duplicate an operation')
assert.equal(calls.filter(call=>call[3]==='New journal').length,1,'A queued journal must not disappear')
let nextStarted
const nextEntered = new Promise(resolve => { nextStarted = resolve })
pause = () => new Promise(resolve => { release = resolve; nextStarted() })
await api.queueOffline({...op,payload:[null,'2026-10-05','New event','']})
const creating = api.flushOfflineQueue()
await nextEntered
await api.queueOffline({...op,payload:[null,'2026-10-05','Edited during creation','']})
pause = async () => {}; release(); await creating
assert.equal(calls.find(call=>call[3]==='Edited during creation')[1],'saved-id','An edit must reuse the inserted event ID')
assert.equal(JSON.parse(storage.get('agenda-offline:A:queue')).length,0)
console.log('PASS: per-user cache/queue, deduplication, offline retention, retry, local deletion, concurrent flushes and edits during synchronization. Server actions mocked; not an end-to-end Supabase test.')
