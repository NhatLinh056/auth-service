import http from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

console.log('=== RUNNING EXTRACTION-BASED NESTJS QUICKSTART SMOKE TEST ===\n');

// 1. Đọc và trích xuất code trực tiếp từ QuickstartPage.tsx
const quickstartPagePath = path.resolve(
  import.meta.dirname,
  '../auth-service/frontend/src/components/features/quickstart/QuickstartPage.tsx'
);
assert.ok(fs.existsSync(quickstartPagePath), `QuickstartPage.tsx must exist at ${quickstartPagePath}`);
const quickstartSource = fs.readFileSync(quickstartPagePath, 'utf8');

// Trích xuất snippet nestJsSetupSnippet
const nestSnippetMatch = quickstartSource.match(
  /const nestJsSetupSnippet =\s*`([\s\S]*?)`;/
);
assert.ok(nestSnippetMatch, 'Could not extract nestJsSetupSnippet from QuickstartPage.tsx');
const rawNestSnippet = nestSnippetMatch[1];

// Trích xuất snippet sdkInstallNestCmd
const installNestMatch = quickstartSource.match(
  /const sdkInstallNestCmd =\s*`([\s\S]*?)`;/
);
assert.ok(installNestMatch, 'Could not extract sdkInstallNestCmd from QuickstartPage.tsx');
const installNestCmd = installNestMatch[1];

console.log('--- Step 1: Static Code Quality Checks on Quickstart Nest Snippets ---');

// Kiểm tra 1: Phải có import 'dotenv/config' ở đầu file app.module.ts
assert.ok(
  rawNestSnippet.includes("import 'dotenv/config';"),
  "Quickstart Nest snippet must import 'dotenv/config' to load .env before AuthModule.forRoot;"
);
console.log("✓ PASS: Nest snippet imports 'dotenv/config'");

// Kiểm tra 2: Không được fallback giả sang placeholder AppToken
assert.ok(
  !rawNestSnippet.includes("|| '${appTokenPlaceholder}'"),
  'Quickstart Nest snippet must NOT fake-default to placeholder AppToken'
);
assert.ok(
  rawNestSnippet.includes('appToken: process.env.APP_TOKEN'),
  'Quickstart Nest snippet must configure appToken: process.env.APP_TOKEN'
);
console.log('✓ PASS: Nest snippet does NOT fake-default to placeholder AppToken');

// Kiểm tra 3: Đăng ký AuthModule.forRoot
assert.ok(
  rawNestSnippet.includes('AuthModule.forRoot('),
  'Quickstart Nest snippet must configure AuthModule.forRoot'
);
console.log('✓ PASS: Nest snippet registers AuthModule.forRoot');

// Kiểm tra 4: Bảo vệ tuyến bằng @UseGuards(AuthGuard)
assert.ok(
  rawNestSnippet.includes('@UseGuards(AuthGuard)'),
  'Quickstart Nest snippet must declare protected routes with @UseGuards(AuthGuard)'
);
console.log('✓ PASS: Nest snippet protects routes with @UseGuards(AuthGuard)');

// Kiểm tra 5: Tiêm người dùng bằng @CurrentUser()
assert.ok(
  rawNestSnippet.includes('@CurrentUser()'),
  'Quickstart Nest snippet must inject user profile via @CurrentUser()'
);
console.log('✓ PASS: Nest snippet injects user profile via @CurrentUser()');

// Kiểm tra 6: Lệnh cài đặt phải bao gồm cả dotenv và tarball SDK 1.1.0
assert.ok(
  installNestCmd.includes('dotenv'),
  'Quickstart Nest install command must include dotenv'
);
assert.ok(
  installNestCmd.includes('auth-service-client-1.1.0.tgz'),
  'Quickstart Nest install command must include auth-service-client-1.1.0.tgz'
);
console.log('✓ PASS: Nest install command includes dotenv and tarball 1.1.0');

// Kiểm tra 7: publicAppUrl phải trích xuất động từ REDIRECT_URI, không hardcode localhost:3001
assert.ok(
  rawNestSnippet.includes('publicAppUrl: new URL(process.env.REDIRECT_URI!).origin'),
  'Quickstart Nest snippet must derive publicAppUrl from new URL(process.env.REDIRECT_URI!).origin'
);
assert.ok(
  !rawNestSnippet.includes("publicAppUrl: 'http://localhost:3001'"),
  'Quickstart Nest snippet must NOT hardcode publicAppUrl: http://localhost:3001'
);
console.log('✓ PASS: publicAppUrl is derived dynamically from REDIRECT_URI (no hardcoded localhost:3001)');

// Kiểm tra 8: authServiceUrl, appId, redirectUri không fallback sang localhost hay appId giả
assert.ok(
  rawNestSnippet.includes('authServiceUrl: process.env.AUTH_SERVICE_URL!'),
  'Quickstart Nest snippet must configure authServiceUrl: process.env.AUTH_SERVICE_URL!'
);
assert.ok(
  rawNestSnippet.includes('appId: process.env.APP_ID!'),
  'Quickstart Nest snippet must configure appId: process.env.APP_ID!'
);
assert.ok(
  rawNestSnippet.includes('redirectUri: process.env.REDIRECT_URI!'),
  'Quickstart Nest snippet must configure redirectUri: process.env.REDIRECT_URI!'
);
assert.ok(
  !rawNestSnippet.includes("|| 'http://localhost:3000'"),
  'Quickstart Nest snippet must not fallback authServiceUrl to localhost:3000'
);
assert.ok(
  !rawNestSnippet.includes("|| 'http://localhost:3001/auth/callback'"),
  'Quickstart Nest snippet must not fallback redirectUri to localhost:3001'
);
console.log('✓ PASS: authServiceUrl, appId, redirectUri take values directly from required env variables without fallback');

// Kiểm tra 9: Không lặp lại cookieOptions mẫu khi SDK đã có mặc định chuẩn
assert.ok(
  !rawNestSnippet.includes('cookieOptions:'),
  'Quickstart Nest snippet should omit cookieOptions since SDK has built-in defaults'
);
console.log('✓ PASS: cookieOptions is omitted from minimal snippet');

console.log('\n--- Step 2: Setting up Isolated Fresh Nest App & Mock Auth Service ---');
const MOCK_AUTH_PORT = 3031;
const NEST_APP_PORT = 4031;
const TEST_APP_ID = 'app_nest_smoke_12345';
const TEST_APP_TOKEN = 'apt_nest_smoke_secret_99999';

// Setup Mock Auth Service
const mockAuthServer = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${MOCK_AUTH_PORT}`);
  const pathname = url.pathname;
  const method = req.method;

  const sendJson = (status, payload) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  };

  // Verify App User for protected routes
  if (pathname === '/users/verify-app-user' && method === 'GET') {
    if (
      req.headers['x-app-id'] !== TEST_APP_ID ||
      req.headers['x-app-token'] !== TEST_APP_TOKEN
    ) {
      return sendJson(401, { message: 'Microservice authentication failed: wrong AppID or AppToken' });
    }
    const authHeader = req.headers['authorization'] || '';
    if (authHeader !== 'Bearer valid_nest_token') {
      return sendJson(401, { message: 'Invalid or expired user session' });
    }
    return sendJson(200, {
      id: 'app_user_nest_01',
      userId: 'user_nest_01',
      email: 'nest.developer@example.com',
      name: 'Nest Developer',
      role: 'USER',
      appRole: 'DEVELOPER',
      appId: TEST_APP_ID,
      isAppOwner: false,
      tenantId: null,
      tenantName: null,
      isTenantOwner: false,
    });
  }

  sendJson(404, { message: 'Not found' });
});

await new Promise((resolve) => mockAuthServer.listen(MOCK_AUTH_PORT, '127.0.0.1', resolve));
console.log(`✓ MockAuth server listening on http://127.0.0.1:${MOCK_AUTH_PORT}`);

// Tạo thư mục ứng dụng Nest độc lập tạm thời
const tempNestAppDir = path.join(os.tmpdir(), `quickstart_nest_smoke_${Date.now()}`);
fs.mkdirSync(path.join(tempNestAppDir, 'src'), { recursive: true });

// Viết package.json
fs.writeFileSync(
  path.join(tempNestAppDir, 'package.json'),
  JSON.stringify(
    {
      name: 'smoke-quickstart-nest-app',
      version: '1.0.0',
      type: 'module',
    },
    null,
    2
  )
);

// Viết tsconfig.json
fs.writeFileSync(
  path.join(tempNestAppDir, 'tsconfig.json'),
  JSON.stringify(
    {
      compilerOptions: {
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        target: 'ES2023',
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
        skipLibCheck: true,
        rootDir: './src',
        outDir: './dist',
        types: ['node'],
      },
      include: ['src/**/*.ts'],
    },
    null,
    2
  )
);

// Thiết lập node_modules cho ứng dụng Nest độc lập:
// 1. Junction-link tất cả các dependencies từ demo-service/node_modules (trừ auth-service-client)
const demoModules = path.resolve(import.meta.dirname, '../demo-service/node_modules');
const targetModules = path.join(tempNestAppDir, 'node_modules');
fs.mkdirSync(targetModules, { recursive: true });

for (const entry of fs.readdirSync(demoModules)) {
  if (entry === 'auth-service-client' || entry === '.package-lock.json') continue;
  const src = path.join(demoModules, entry);
  const dst = path.join(targetModules, entry);
  try {
    fs.symlinkSync(src, dst, 'junction');
  } catch {
    // fallback
  }
}

// 2. Giải nén trực tiếp file tarball SDK 1.1.0 (auth-service/public/sdk/auth-service-client-1.1.0.tgz)
// Điều này mô phỏng 100% lệnh: npm install <origin>/sdk/auth-service-client-1.1.0.tgz
const tarballPath = path.resolve(
  import.meta.dirname,
  '../auth-service/public/sdk/auth-service-client-1.1.0.tgz'
);
assert.ok(fs.existsSync(tarballPath), `Tarball must exist at ${tarballPath}`);
const sdkDest = path.join(targetModules, 'auth-service-client');
fs.mkdirSync(sdkDest, { recursive: true });
execFileSync('tar', ['-xzf', tarballPath, '-C', sdkDest, '--strip-components=1'], { stdio: 'pipe' });

// Viết file .env theo đúng định dạng Quickstart
const envContent = `# .env (Generated from Quickstart template)
PORT=${NEST_APP_PORT}
AUTH_SERVICE_URL=http://127.0.0.1:${MOCK_AUTH_PORT}
APP_ID=${TEST_APP_ID}
APP_TOKEN=${TEST_APP_TOKEN}
REDIRECT_URI=http://127.0.0.1:${NEST_APP_PORT}/auth/callback
`;
fs.writeFileSync(path.join(tempNestAppDir, '.env'), envContent, 'utf8');

// Tách mã app.module.ts và app.controller.ts từ nestJsSetupSnippet
const evaluatedNestSnippet = rawNestSnippet
  .replace(/\${authServiceOrigin}/g, `http://127.0.0.1:${MOCK_AUTH_PORT}`)
  .replace(/\${appIdDisplay}/g, TEST_APP_ID);

const parts = evaluatedNestSnippet.split('// 2. app.controller.ts');
const appModuleContent = parts[0].trim();
const appControllerContent = ('// 2. app.controller.ts' + parts[1]).trim();

fs.writeFileSync(path.join(tempNestAppDir, 'src', 'app.module.ts'), appModuleContent, 'utf8');
fs.writeFileSync(path.join(tempNestAppDir, 'src', 'app.controller.ts'), appControllerContent, 'utf8');

// Tạo file src/main.ts để khởi tạo ứng dụng Nest
const mainContent = `import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || ${NEST_APP_PORT};
  await app.listen(port);
  console.log('NEST_BOOT_SUCCESS on port ' + port);
}
bootstrap().catch((err) => {
  console.error('NEST_BOOT_ERROR', err);
  process.exit(1);
});
`;
fs.writeFileSync(path.join(tempNestAppDir, 'src', 'main.ts'), mainContent, 'utf8');

console.log(`✓ Fresh Nest project created at ${tempNestAppDir} with .env, app.module.ts, app.controller.ts, and main.ts`);

// Biên dịch TypeScript
console.log('--- Step 3: Compiling TypeScript Nest Project ---');
const tscPath = path.resolve(import.meta.dirname, '../demo-service/node_modules/typescript/bin/tsc');
execFileSync(process.execPath, [tscPath, '-p', tempNestAppDir], { stdio: 'inherit' });
assert.ok(fs.existsSync(path.join(tempNestAppDir, 'dist', 'main.js')), 'dist/main.js must exist after tsc');
console.log('✓ PASS: TypeScript compilation succeeded');

console.log('\n--- Step 4: Booting Fresh Nest App Relying Exclusively on .env (Zero Env Injected) ---');
// Chú ý cực kỳ quan trọng:
// KHÔNG truyền PORT, AUTH_SERVICE_URL, APP_ID, APP_TOKEN trong spawn env!
// Ứng dụng CHỈ có thể chạy thành công nếu import 'dotenv/config' tải .env thành công!
const nestProcess = spawn(process.execPath, ['--preserve-symlinks', 'dist/main.js'], {
  cwd: tempNestAppDir,
  env: {
    PATH: process.env.PATH,
    SYSTEMROOT: process.env.SYSTEMROOT || '',
    HOMEDRIVE: process.env.HOMEDRIVE || '',
    HOMEPATH: process.env.HOMEPATH || '',
  },
  stdio: 'pipe',
});

let stderrLog = '';
let stdoutLog = '';
nestProcess.stderr.on('data', (d) => {
  stderrLog += d.toString();
  process.stderr.write(`[nest-stderr] ${d}`);
});
nestProcess.stdout.on('data', (d) => {
  stdoutLog += d.toString();
  process.stdout.write(`[nest-stdout] ${d}`);
});
nestProcess.on('exit', (code, sig) => {
  console.log(`[nest-process-exit] code=${code} signal=${sig}`);
});

// Chờ ứng dụng Nest khởi động
let nestStarted = false;
for (let i = 0; i < 80; i++) {
  try {
    const probe = await fetch(`http://127.0.0.1:${NEST_APP_PORT}/api/protected`);
    console.log(`[probe attempt ${i}] status=${probe.status}`);
    if (probe.status === 401) {
      nestStarted = true;
      break;
    }
  } catch (err) {
    // console.log(`[probe attempt ${i}] err=${err.message}`);
    await new Promise((r) => setTimeout(r, 200));
  }
}

assert.ok(
  nestStarted,
  `Fresh Nest app failed to start on NEST_APP_PORT from .env (dotenv loading failed, AuthClientConfigError, or crash)! Stderr: ${stderrLog} Stdout: ${stdoutLog}`
);
console.log('✓ PASS: Fresh Nest app successfully initialized and loaded configuration from .env via dotenv');

// Kiểm tra mapped routes từ AuthCallbackController: phải map đúng 4 route, KHÔNG map /auth/login
assert.ok(
  stdoutLog.includes('Mapped {/auth/login/google, GET} route'),
  'AuthCallbackController must map GET /auth/login/google'
);
assert.ok(
  stdoutLog.includes('Mapped {/auth/login/facebook, GET} route'),
  'AuthCallbackController must map GET /auth/login/facebook'
);
assert.ok(
  stdoutLog.includes('Mapped {/auth/callback, GET} route'),
  'AuthCallbackController must map GET /auth/callback'
);
assert.ok(
  stdoutLog.includes('Mapped {/auth/logout, POST} route'),
  'AuthCallbackController must map POST /auth/logout'
);
assert.ok(
  !stdoutLog.includes('Mapped {/auth/login, GET} route'),
  'AuthCallbackController must NOT map legacy GET /auth/login'
);
console.log('✓ PASS: Nest RouterExplorer maps strictly 4 SDK routes (no /auth/login mapped)');

console.log('\n--- Step 5: Verifying Protected Route with Authenticated Token ---');

// 5a. Kiểm tra /api/protected với Bearer token hợp lệ
const authApiRes = await fetch(`http://127.0.0.1:${NEST_APP_PORT}/api/protected`, {
  headers: {
    Authorization: 'Bearer valid_nest_token',
  },
});
assert.strictEqual(authApiRes.status, 200, 'GET /api/protected với valid token phải trả về 200 OK');
const authApiJson = await authApiRes.json();
assert.strictEqual(authApiJson.message, 'Xác thực thành công!');
assert.strictEqual(authApiJson.appId, TEST_APP_ID);
assert.strictEqual(authApiJson.user?.email, 'nest.developer@example.com');
console.log('✓ PASS: GET /api/protected successfully accessed with authenticated token and injected @CurrentUser()');

// 5b. Kiểm tra /profile với Bearer token hợp lệ
const authProfileRes = await fetch(`http://127.0.0.1:${NEST_APP_PORT}/profile`, {
  headers: {
    Authorization: 'Bearer valid_nest_token',
  },
});
assert.strictEqual(authProfileRes.status, 200, 'GET /profile với valid token phải trả về 200 OK');
const authProfileJson = await authProfileRes.json();
assert.strictEqual(authProfileJson.message, 'Đăng nhập thành công!');
assert.strictEqual(authProfileJson.appId, TEST_APP_ID);
assert.strictEqual(authProfileJson.user?.email, 'nest.developer@example.com');
console.log('✓ PASS: GET /profile successfully accessed with authenticated token and injected @CurrentUser()');

// 5c. Xác nhận từ chối khi không có Authorization header (Fail-Closed)
const unauthRes = await fetch(`http://127.0.0.1:${NEST_APP_PORT}/api/protected`);
assert.strictEqual(unauthRes.status, 401, 'GET /api/protected thiếu Authorization phải trả về 401');
console.log('✓ PASS: GET /api/protected without credentials rejected with 401 Unauthorized');

// 5d. Xác nhận Origin tự động lấy từ REDIRECT_URI và từ chối origin ngoại lai (CSRF Defense)
const validLogoutRes = await fetch(`http://127.0.0.1:${NEST_APP_PORT}/auth/logout`, {
  method: 'POST',
  headers: {
    Origin: `http://127.0.0.1:${NEST_APP_PORT}`,
  },
});
assert.strictEqual(validLogoutRes.status, 200, 'POST /auth/logout với Origin từ REDIRECT_URI phải thành công 200');
console.log('✓ PASS: POST /auth/logout accepts origin derived dynamically from REDIRECT_URI');

const foreignLogoutRes = await fetch(`http://127.0.0.1:${NEST_APP_PORT}/auth/logout`, {
  method: 'POST',
  headers: {
    Origin: 'http://localhost:3001',
  },
});
assert.strictEqual(foreignLogoutRes.status, 403, 'POST /auth/logout với Origin ngoại lai (http://localhost:3001) phải bị từ chối 403 Forbidden');
console.log('✓ PASS: POST /auth/logout rejects foreign origin http://localhost:3001 as expected (no hardcoded trusted origin)');

// 5e. Xác nhận route legacy GET /auth/login không tồn tại (404 Not Found)
const legacyLoginRes = await fetch(`http://127.0.0.1:${NEST_APP_PORT}/auth/login`);
assert.strictEqual(legacyLoginRes.status, 404, 'GET /auth/login phải trả về 404 Not Found vì chỉ hỗ trợ direct provider routes');
console.log('✓ PASS: GET /auth/login returns 404 Not Found (legacy route removed)');

// Teardown
nestProcess.kill();
await new Promise((resolve) => {
  nestProcess.on('exit', resolve);
  setTimeout(resolve, 500);
});
await new Promise((r) => mockAuthServer.close(r));
try {
  for (const entry of fs.readdirSync(targetModules)) {
    const p = path.join(targetModules, entry);
    try {
      const stat = fs.lstatSync(p);
      if (stat.isSymbolicLink()) fs.unlinkSync(p);
    } catch {}
  }
  fs.rmSync(tempNestAppDir, { recursive: true, force: true });
} catch {
  // Bỏ qua lỗi xóa thư mục tạm nếu Windows file lock
}

console.log('\n🎉 TOÀN BỘ CÁC BƯỚC NESTJS QUICKSTART SMOKE TEST ĐỀU PASS 100%!\n');
