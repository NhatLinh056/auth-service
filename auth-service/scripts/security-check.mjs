// Creates an isolated database; never migrates or seeds the developer's database.
import 'dotenv/config';
import pg from 'pg';
import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import assert from 'node:assert/strict';

const authDir = process.cwd();
const demoDir = resolve(authDir, '../demo-service');
const dbName = `auth_security_${Date.now()}_${randomBytes(4).toString('hex')}`;
const original = new URL(process.env.DATABASE_URL);
const controlUrl = new URL(original); controlUrl.pathname = '/postgres';
const testUrl = new URL(original); testUrl.pathname = `/${dbName}`;
const control = new pg.Client({ connectionString: controlUrl.href });
const appToken = `apt_${randomBytes(32).toString('hex')}`;
const env = { ...process.env, NODE_ENV: 'test', ENABLE_DEMO_SEED: 'false',
  DATABASE_URL: testUrl.href, JWT_SECRET: randomBytes(48).toString('hex'),
  AUTH_SERVICE_URL: 'http://localhost:3300', APP_ID: 'app_security_live', APP_TOKEN: appToken };
const processes = [];
let created = false;
function run(command, cwd = authDir) {
  const result = spawnSync(command, { cwd, env, shell: true, stdio: 'inherit', windowsHide: true });
  if (result.status !== 0) throw new Error(`Check failed: ${command}`);
}
async function start(cwd, entry, port) {
  const child = spawn(process.execPath, [entry], { cwd, env: { ...env, PORT: String(port) }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  processes.push(child);
  let logs = ''; child.stdout.on('data', b => { logs = (logs + b).slice(-4000); }); child.stderr.on('data', b => { logs = (logs + b).slice(-4000); });
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`Service ${port} exited: ${logs}`);
    try { const res = await fetch(`http://localhost:${port}/`, { signal: AbortSignal.timeout(500) }); if (res.ok) return; } catch {}
    await delay(200);
  }
  throw new Error(`Service ${port} startup timeout`);
}
async function json(url, options, status = 200) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, status, `${url}: expected ${status}, received ${response.status}`);
  return response.json();
}
try {
  // Refuse to accidentally test a process that this script did not start.
  for (const port of [3300, 3301]) {
    const net = await import('node:net');
    await new Promise((ok, fail) => { const server = net.createServer(); server.once('error', fail); server.listen(port, () => server.close(ok)); });
  }
  await control.connect();
  await control.query(`CREATE DATABASE "${dbName}"`); created = true;
  run('npx prisma generate --config prisma7.config.ts');
  run('npm run build');
  run('npm run build', demoDir);
  run('npx prisma migrate deploy --config prisma7.config.ts');
  run('npm run test:e2e');
  const db = new pg.Client({ connectionString: testUrl.href });
  await db.connect();
  try {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const owner = (await db.query(`INSERT INTO users (id,email,"passwordHash",role,"updatedAt") VALUES (gen_random_uuid()::text,'developer@example.com',$1,'USER',NOW()) RETURNING id`, [passwordHash])).rows[0];
    const application = (await db.query(`INSERT INTO applications (id,name,"appId","appToken","userId","updatedAt","allowedRedirectUris") VALUES (gen_random_uuid()::text,'Security Live',$1,$2,$3,NOW(),ARRAY['http://localhost:3301/']) RETURNING id`, [env.APP_ID, appToken, owner.id])).rows[0];
    for (const provider of ['GOOGLE', 'FACEBOOK']) {
      await db.query(`INSERT INTO oauth_providers (id,"applicationId",provider,name,"isEnabled","clientId","clientSecret","updatedAt") VALUES (gen_random_uuid()::text,$1,$2::text::"OAuthProviderType",$2::text,true,'test-only-id','test-only-secret',NOW())`, [application.id, provider]);
    }
    // Exercise the additive migration against the old db-push table layout with real data.
    await db.query(`INSERT INTO app_users (id,"applicationId",email,role,"updatedAt") VALUES ('legacy-user',$1,'legacy@example.com','USER',NOW())`, [application.id]);
    await db.query(`INSERT INTO app_oauth_identities (id,"appUserId","applicationId",provider,"providerUserId","updatedAt") VALUES ('legacy-identity','legacy-user',$1,'GOOGLE','legacy-provider-user',NOW())`, [application.id]);
    await db.query('ALTER TABLE app_oauth_identities DROP COLUMN "applicationId" CASCADE');
    await db.query('CREATE UNIQUE INDEX "app_oauth_identities_provider_providerUserId_key" ON app_oauth_identities(provider,"providerUserId")');
    await db.query('ALTER TABLE applications DROP COLUMN "allowedRedirectUris"');
    await db.query(readFileSync('prisma/migrations/20261101000000_tenant_identity_security/migration.sql', 'utf8'));
    const preserved = (await db.query('SELECT id,"appUserId","applicationId" FROM app_oauth_identities WHERE id=$1', ['legacy-identity'])).rows[0];
    assert.deepEqual(preserved, { id: 'legacy-identity', appUserId: 'legacy-user', applicationId: application.id });
    await db.query("DELETE FROM app_users WHERE id='legacy-user'");
    console.log('MIGRATION: legacy identity preserved and tenant backfilled successfully.');
    await start(authDir, 'dist/main.js', 3300);
    await start(demoDir, 'dist/src/main.js', 3301);
    const status = await json('http://localhost:3301/status');
    assert.equal(status.handshakeStatus, 'SUCCESS'); assert.equal(status.handshake.applicationStatus, 'ACTIVE');
    const providers = await json('http://localhost:3301/auth/providers');
    assert.deepEqual(providers.filter(p => p.enabled).map(p => p.provider).sort(), ['facebook', 'google']);
    await json('http://localhost:3301/orders', {}, 401);
    const login = await json('http://localhost:3300/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'developer@example.com', password: 'Password123!' }) });
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${login.accessToken}` };
    await json(`http://localhost:3300/applications/${application.id}`, { method: 'PATCH', headers, body: JSON.stringify({ adminEmails: ['audit@example.com'] }) });
    assert.deepEqual((await db.query('SELECT "adminEmails" FROM applications WHERE id=$1', [application.id])).rows[0].adminEmails, ['audit@example.com']);
    await json(`http://localhost:3300/applications/${application.id}`, { method: 'PATCH', headers, body: JSON.stringify({ adminEmails: [] }) });
    for (const port of [3300, 3301]) {
      const page = await fetch(`http://localhost:${port}/`);
      assert.match(page.headers.get('content-type'), /text\/html/);
      assert.match(await page.text(), /<!doctype html/i);
    }
    console.log('LIVE: 5/5 scenarios passed on isolated ports 3300/3301. Provider login was not performed.');
    run('npm run test:e2e', demoDir);
  } finally { await db.end(); }
} finally {
  await Promise.all(processes.map(child => new Promise(ok => {
    if (child.exitCode !== null) return ok();
    child.once('exit', ok); child.kill();
  })));
  if (created && /^auth_security_\d+_[a-f0-9]{8}$/.test(dbName)) {
    await control.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()', [dbName]);
    await control.query(`DROP DATABASE "${dbName}"`);
  }
  await control.end();
}
