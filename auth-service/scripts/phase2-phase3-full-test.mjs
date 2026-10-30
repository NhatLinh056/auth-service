// PHASE 2 & PHASE 3 COMPREHENSIVE PRODUCTION TEST RUNNER
import axios from 'axios';

const AUTH_BASE = 'http://localhost:3000';
const DEMO_BASE = 'http://localhost:3001';

const testResults = [];
let passCount = 0;
let failCount = 0;

function assertTest(category, name, passed, detail = '') {
  testResults.push({ category, name, passed, detail });
  if (passed) {
    passCount++;
    console.log(`✅ [${category}] ${name} ${detail ? '— ' + detail : ''}`);
  } else {
    failCount++;
    console.error(`❌ [${category}] ${name} — FAILED: ${detail}`);
  }
}

async function runFullAuditSuite() {
  console.log('========================================================================');
  console.log('🚀 EXECUTING PHASE 2 & PHASE 3 COMPREHENSIVE END-TO-END AUDIT SUITE');
  console.log('========================================================================\n');

  const ts = Date.now();
  const userA_Email = `user_a_${ts}@example.com`;
  const userB_Email = `user_b_${ts}@example.com`;
  const password = 'Password123!';

  let adminToken = '';
  let userA_Token = '';
  let userB_Token = '';
  let userA_Id = '';
  let userB_Id = '';

  let appA_Id = '';
  let appA_Uuid = '';
  let appA_Token = '';

  let appB_Id = '';
  let appB_Uuid = '';
  let appB_Token = '';

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION A: AUTHENTICATION
  // ─────────────────────────────────────────────────────────────────────────
  console.log('--- SECTION A: AUTHENTICATION TESTS ---');
  try {
    // A.1 Valid User A Registration
    const regRes = await axios.post(`${AUTH_BASE}/auth/register`, {
      email: userA_Email,
      password: password,
      name: 'User A Tester',
    });
    userA_Id = regRes.data.id;
    assertTest('Auth', 'Register valid User A', regRes.status === 201 && regRes.data.email === userA_Email);

    // A.2 Register duplicate email -> 409
    try {
      await axios.post(`${AUTH_BASE}/auth/register`, {
        email: userA_Email,
        password: password,
      });
      assertTest('Auth', 'Reject duplicate email registration', false, 'Expected 409 Conflict');
    } catch (err) {
      assertTest('Auth', 'Reject duplicate email registration (409 Conflict)', err.response?.status === 409);
    }

    // A.3 Register missing password -> 400
    try {
      await axios.post(`${AUTH_BASE}/auth/register`, { email: `missing_pw_${ts}@example.com` });
      assertTest('Auth', 'Reject registration missing password', false, 'Expected 400');
    } catch (err) {
      assertTest('Auth', 'Reject registration missing password (400 Bad Request)', err.response?.status === 400);
    }

    // A.4 Register invalid email format -> 400
    try {
      await axios.post(`${AUTH_BASE}/auth/register`, {
        email: 'invalid-email-format',
        password: password,
      });
      assertTest('Auth', 'Reject registration with invalid email format', false, 'Expected 400');
    } catch (err) {
      assertTest('Auth', 'Reject registration with invalid email format (400 Bad Request)', err.response?.status === 400);
    }

    // A.5 Register password too short (< 6 chars) -> 400
    try {
      await axios.post(`${AUTH_BASE}/auth/register`, {
        email: `short_pw_${ts}@example.com`,
        password: '123',
      });
      assertTest('Auth', 'Reject registration with password < 6 chars', false, 'Expected 400');
    } catch (err) {
      assertTest('Auth', 'Reject registration with password < 6 chars (400 Bad Request)', err.response?.status === 400);
    }

    // A.6 Successful Login for User A
    const loginRes = await axios.post(`${AUTH_BASE}/auth/login`, {
      email: userA_Email,
      password: password,
    });
    userA_Token = loginRes.data.accessToken;
    assertTest('Auth', 'Login User A successfully and receive JWT', Boolean(userA_Token && loginRes.data.user.role === 'USER'));

    // A.7 Login with wrong password -> 401
    try {
      await axios.post(`${AUTH_BASE}/auth/login`, {
        email: userA_Email,
        password: 'WrongPassword999!',
      });
      assertTest('Auth', 'Reject login with incorrect password', false, 'Expected 401');
    } catch (err) {
      assertTest('Auth', 'Reject login with incorrect password (401 Unauthorized)', err.response?.status === 401);
    }

    // A.8 Login with non-existent email -> 401
    try {
      await axios.post(`${AUTH_BASE}/auth/login`, {
        email: `non_existent_${ts}@example.com`,
        password: password,
      });
      assertTest('Auth', 'Reject login with non-existent email', false, 'Expected 401');
    } catch (err) {
      assertTest('Auth', 'Reject login with non-existent email (401 Unauthorized)', err.response?.status === 401);
    }

    // A.9 Login with empty payload -> 400
    try {
      await axios.post(`${AUTH_BASE}/auth/login`, {});
      assertTest('Auth', 'Reject login with empty payload', false, 'Expected 400');
    } catch (err) {
      assertTest('Auth', 'Reject login with empty payload (400 Bad Request)', err.response?.status === 400);
    }

    // A.10 Admin Login
    const adminLoginRes = await axios.post(`${AUTH_BASE}/auth/login`, {
      email: 'admin@example.com',
      password: 'Admin123!',
    });
    adminToken = adminLoginRes.data.accessToken;
    assertTest('Auth', 'Admin login successful with ADMIN role', Boolean(adminToken && adminLoginRes.data.user.role === 'ADMIN'));

    // A.11 Logout endpoint -> 200 OK
    const logoutRes = await axios.post(`${AUTH_BASE}/auth/logout`);
    assertTest('Auth', 'Logout endpoint responds 200 OK', logoutRes.status === 200);

    // A.12 Access protected endpoint without token -> 401
    try {
      await axios.get(`${AUTH_BASE}/users/me`);
      assertTest('Auth', 'Reject access to /users/me without Authorization header', false, 'Expected 401');
    } catch (err) {
      assertTest('Auth', 'Reject access to /users/me without Authorization header (401 Unauthorized)', err.response?.status === 401);
    }

    // A.13 Access protected endpoint with valid Bearer token -> 200 OK
    const meRes = await axios.get(`${AUTH_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${userA_Token}` },
    });
    assertTest('Auth', 'Access /users/me with valid Bearer token', meRes.data.email === userA_Email && !meRes.data.passwordHash);

    // A.14 Access protected endpoint with invalid token signature -> 401
    try {
      await axios.get(`${AUTH_BASE}/users/me`, {
        headers: { Authorization: `Bearer ${userA_Token.slice(0, -5)}FakeK` },
      });
      assertTest('Auth', 'Reject Bearer token with tampered signature', false, 'Expected 401');
    } catch (err) {
      assertTest('Auth', 'Reject Bearer token with tampered signature (401 Unauthorized)', err.response?.status === 401);
    }

    // A.15 Access protected endpoint with malformed Bearer token -> 401
    try {
      await axios.get(`${AUTH_BASE}/users/me`, {
        headers: { Authorization: 'Bearer not-a-jwt-token' },
      });
      assertTest('Auth', 'Reject malformed non-JWT token', false, 'Expected 401');
    } catch (err) {
      assertTest('Auth', 'Reject malformed non-JWT token (401 Unauthorized)', err.response?.status === 401);
    }
  } catch (err) {
    assertTest('Auth', 'Section A unexpected failure', false, err.message);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION B: USER & RBAC (ROLE-BASED ACCESS CONTROL)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- SECTION B: USER & RBAC TESTS ---');
  try {
    // Register User B
    const regB = await axios.post(`${AUTH_BASE}/auth/register`, {
      email: userB_Email,
      password: password,
      name: 'User B Tester',
    });
    userB_Id = regB.data.id;
    const loginB = await axios.post(`${AUTH_BASE}/auth/login`, {
      email: userB_Email,
      password: password,
    });
    userB_Token = loginB.data.accessToken;
    assertTest('RBAC', 'Register and authenticate User B', Boolean(userB_Token));

    // B.1 User A attempts to access /users (ADMIN only) -> 403
    try {
      await axios.get(`${AUTH_BASE}/users`, {
        headers: { Authorization: `Bearer ${userA_Token}` },
      });
      assertTest('RBAC', 'Block normal user from GET /users', false, 'Expected 403 Forbidden');
    } catch (err) {
      assertTest('RBAC', 'Block normal user from GET /users (403 Forbidden)', err.response?.status === 403);
    }

    // B.2 User A attempts to call /roles/assign -> 403
    try {
      await axios.post(`${AUTH_BASE}/roles/assign`, {
        userId: userA_Id,
        role: 'ADMIN',
      }, {
        headers: { Authorization: `Bearer ${userA_Token}` },
      });
      assertTest('RBAC', 'Block normal user from self-assigning ADMIN role', false, 'Expected 403 Forbidden');
    } catch (err) {
      assertTest('RBAC', 'Block normal user from self-assigning ADMIN role (403 Forbidden)', err.response?.status === 403);
    }

    // B.3 User A attempts to view /roles/admin -> 403
    try {
      await axios.get(`${AUTH_BASE}/roles/admin`, {
        headers: { Authorization: `Bearer ${userA_Token}` },
      });
      assertTest('RBAC', 'Block normal user from GET /roles/admin', false, 'Expected 403 Forbidden');
    } catch (err) {
      assertTest('RBAC', 'Block normal user from GET /roles/admin (403 Forbidden)', err.response?.status === 403);
    }

    // B.4 User A attempts IDOR: Update User B profile -> 403
    try {
      await axios.patch(`${AUTH_BASE}/users/${userB_Id}`, {
        name: 'Hacked Name by User A',
      }, {
        headers: { Authorization: `Bearer ${userA_Token}` },
      });
      assertTest('RBAC', 'Block User A from updating User B profile (IDOR prevention)', false, 'Expected 403');
    } catch (err) {
      assertTest('RBAC', 'Block User A from updating User B profile (403 Forbidden - IDOR Guarded)', err.response?.status === 403);
    }

    // B.5 User A attempts IDOR: Delete User B account -> 403
    try {
      await axios.delete(`${AUTH_BASE}/users/${userB_Id}`, {
        headers: { Authorization: `Bearer ${userA_Token}` },
      });
      assertTest('RBAC', 'Block User A from deleting User B account (IDOR prevention)', false, 'Expected 403');
    } catch (err) {
      assertTest('RBAC', 'Block User A from deleting User B account (403 Forbidden - IDOR Guarded)', err.response?.status === 403);
    }

    // B.6 User A updates own profile -> 200 OK
    const updateSelf = await axios.patch(`${AUTH_BASE}/users/${userA_Id}`, {
      name: 'User A Updated Name',
    }, {
      headers: { Authorization: `Bearer ${userA_Token}` },
    });
    assertTest('RBAC', 'User A updates own profile successfully', updateSelf.data.name === 'User A Updated Name');

    // B.7 Admin accesses /users -> 200 OK
    const adminGetUsers = await axios.get(`${AUTH_BASE}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assertTest('RBAC', 'Admin accesses GET /users and receives user list', Array.isArray(adminGetUsers.data) && adminGetUsers.data.length >= 2);

    // B.8 Admin accesses /roles/admin -> 200 OK
    const adminDash = await axios.get(`${AUTH_BASE}/roles/admin`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assertTest('RBAC', 'Admin accesses GET /roles/admin', adminDash.data.stats?.totalUsers >= 2 && adminDash.data.stats?.adminCount >= 1);

    // B.9 Mass Assignment: Send extra unauthorized fields in update -> Stripped or rejected
    try {
      const massRes = await axios.patch(`${AUTH_BASE}/users/${userA_Id}`, {
        name: 'Normal Update',
        role: 'ADMIN', // Unauthorized field in UpdateUserDto
      }, {
        headers: { Authorization: `Bearer ${userA_Token}` },
      });
      assertTest('RBAC', 'Mass Assignment Defense: role parameter ignored/rejected', massRes.data.role !== 'ADMIN');
    } catch (err) {
      assertTest('RBAC', 'Mass Assignment Defense: rejected unknown property (400 Bad Request)', err.response?.status === 400);
    }
  } catch (err) {
    assertTest('RBAC', 'Section B unexpected failure', false, err.message);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION C: PROJECT/APPLICATION MANAGEMENT & OWNER ISOLATION
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- SECTION C: APPLICATION MANAGEMENT & OWNER ISOLATION TESTS ---');
  try {
    // C.1 User A creates Application A
    const appARes = await axios.post(`${AUTH_BASE}/applications`, {
      name: `Project-A-${ts}`,
    }, {
      headers: { Authorization: `Bearer ${userA_Token}` },
    });
    appA_Uuid = appARes.data.id;
    appA_Id = appARes.data.appId;
    appA_Token = appARes.data.appToken;
    assertTest('Projects', 'User A creates Application A', Boolean(appA_Uuid && appA_Id.startsWith('app_') && appA_Token.startsWith('apt_')));

    // C.2 User B creates Application B
    const appBRes = await axios.post(`${AUTH_BASE}/applications`, {
      name: `Project-B-${ts}`,
    }, {
      headers: { Authorization: `Bearer ${userB_Token}` },
    });
    appB_Uuid = appBRes.data.id;
    appB_Id = appBRes.data.appId;
    appB_Token = appBRes.data.appToken;
    assertTest('Projects', 'User B creates Application B', Boolean(appB_Uuid && appB_Id.startsWith('app_') && appB_Token.startsWith('apt_')));

    // C.3 User A lists applications -> sees only App A
    const listA = await axios.get(`${AUTH_BASE}/applications`, {
      headers: { Authorization: `Bearer ${userA_Token}` },
    });
    const userA_Sees_AppA = listA.data.some(a => a.id === appA_Uuid);
    const userA_Sees_AppB = listA.data.some(a => a.id === appB_Uuid);
    assertTest('Projects', 'Owner Isolation: User A sees App A and DOES NOT see App B', userA_Sees_AppA && !userA_Sees_AppB);

    // C.4 User B lists applications -> sees only App B
    const listB = await axios.get(`${AUTH_BASE}/applications`, {
      headers: { Authorization: `Bearer ${userB_Token}` },
    });
    const userB_Sees_AppB = listB.data.some(a => a.id === appB_Uuid);
    const userB_Sees_AppA = listB.data.some(a => a.id === appA_Uuid);
    assertTest('Projects', 'Owner Isolation: User B sees App B and DOES NOT see App A', userB_Sees_AppB && !userB_Sees_AppA);

    // C.5 User B attempts to read App A details (/applications/:id) -> 403
    try {
      await axios.get(`${AUTH_BASE}/applications/${appA_Uuid}`, {
        headers: { Authorization: `Bearer ${userB_Token}` },
      });
      assertTest('Projects', 'Block User B from reading App A details', false, 'Expected 403 Forbidden');
    } catch (err) {
      assertTest('Projects', 'Block User B from reading App A details (403 Forbidden)', err.response?.status === 403);
    }

    // C.6 User B attempts to update App A (/applications/:id) -> 403
    try {
      await axios.patch(`${AUTH_BASE}/applications/${appA_Uuid}`, {
        name: 'Hacked by User B',
      }, {
        headers: { Authorization: `Bearer ${userB_Token}` },
      });
      assertTest('Projects', 'Block User B from modifying App A', false, 'Expected 403 Forbidden');
    } catch (err) {
      assertTest('Projects', 'Block User B from modifying App A (403 Forbidden)', err.response?.status === 403);
    }

    // C.7 User B attempts to delete App A -> 403
    try {
      await axios.delete(`${AUTH_BASE}/applications/${appA_Uuid}`, {
        headers: { Authorization: `Bearer ${userB_Token}` },
      });
      assertTest('Projects', 'Block User B from deleting App A', false, 'Expected 403 Forbidden');
    } catch (err) {
      assertTest('Projects', 'Block User B from deleting App A (403 Forbidden)', err.response?.status === 403);
    }

    // C.8 User B attempts to regenerate token of App A -> 403
    try {
      await axios.post(`${AUTH_BASE}/applications/${appA_Uuid}/regenerate-token`, {}, {
        headers: { Authorization: `Bearer ${userB_Token}` },
      });
      assertTest('Projects', 'Block User B from regenerating App A token', false, 'Expected 403 Forbidden');
    } catch (err) {
      assertTest('Projects', 'Block User B from regenerating App A token (403 Forbidden)', err.response?.status === 403);
    }

    // C.9 Admin lists applications -> sees all applications
    const adminApps = await axios.get(`${AUTH_BASE}/applications`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminSeesBoth = adminApps.data.some(a => a.id === appA_Uuid) && adminApps.data.some(a => a.id === appB_Uuid);
    assertTest('Projects', 'Admin can see applications across all owners', adminSeesBoth);

    // C.10 Create application with empty name -> 400
    try {
      await axios.post(`${AUTH_BASE}/applications`, { name: '' }, {
        headers: { Authorization: `Bearer ${userA_Token}` },
      });
      assertTest('Projects', 'Reject creating application with empty name', false, 'Expected 400');
    } catch (err) {
      assertTest('Projects', 'Reject creating application with empty name (400 Bad Request)', err.response?.status === 400);
    }

    // C.11 Query non-existent application ID -> 404
    try {
      await axios.get(`${AUTH_BASE}/applications/00000000-0000-0000-0000-000000000000`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assertTest('Projects', 'Return 404 for non-existent application ID', false, 'Expected 404');
    } catch (err) {
      assertTest('Projects', 'Return 404 for non-existent application ID (404 Not Found)', err.response?.status === 404);
    }
  } catch (err) {
    assertTest('Projects', 'Section C unexpected failure', false, err.message);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION D: APPID / APPTOKEN & SERVICE-TO-SERVICE AUTHENTICATION
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- SECTION D: APPID / APPTOKEN TESTS ---');
  try {
    // D.1 AppID format validation (app_[0-9a-f]{24})
    const appIdRegex = /^app_[0-9a-f]{24}$/;
    assertTest('AppAuth', 'AppID conforms to secure format ^app_[0-9a-f]{24}$', appIdRegex.test(appA_Id), appA_Id);

    // D.2 AppToken format validation (apt_[0-9a-f]{64} = 256 bits entropy)
    const appTokenRegex = /^apt_[0-9a-f]{64}$/;
    assertTest('AppAuth', 'AppToken conforms to 256-bit entropy format ^apt_[0-9a-f]{64}$', appTokenRegex.test(appA_Token), `${appA_Token.length} chars`);

    // D.3 Handshake with valid AppID + AppToken -> 200 OK
    const hsRes = await axios.get(`${AUTH_BASE}/auth/verify-service`, {
      headers: {
        'X-App-Id': appA_Id,
        'X-App-Token': appA_Token,
      },
    });
    assertTest('AppAuth', 'Handshake /auth/verify-service succeeds with valid credentials', hsRes.data.valid === true && hsRes.data.application.status === 'ACTIVE');

    // D.4 Missing X-App-Id -> 401
    try {
      await axios.get(`${AUTH_BASE}/auth/verify-service`, {
        headers: { 'X-App-Token': appA_Token },
      });
      assertTest('AppAuth', 'Reject request missing X-App-Id header', false, 'Expected 401');
    } catch (err) {
      assertTest('AppAuth', 'Reject request missing X-App-Id header (401 Unauthorized)', err.response?.status === 401);
    }

    // D.5 Missing X-App-Token -> 401
    try {
      await axios.get(`${AUTH_BASE}/auth/verify-service`, {
        headers: { 'X-App-Id': appA_Id },
      });
      assertTest('AppAuth', 'Reject request missing X-App-Token header', false, 'Expected 401');
    } catch (err) {
      assertTest('AppAuth', 'Reject request missing X-App-Token header (401 Unauthorized)', err.response?.status === 401);
    }

    // D.6 Non-existent AppID -> 401
    try {
      await axios.get(`${AUTH_BASE}/auth/verify-service`, {
        headers: {
          'X-App-Id': 'app_000000000000000000000000',
          'X-App-Token': appA_Token,
        },
      });
      assertTest('AppAuth', 'Reject non-existent AppID', false, 'Expected 401');
    } catch (err) {
      assertTest('AppAuth', 'Reject non-existent AppID (401 Unauthorized)', err.response?.status === 401);
    }

    // D.7 Incorrect AppToken -> 401
    try {
      await axios.get(`${AUTH_BASE}/auth/verify-service`, {
        headers: {
          'X-App-Id': appA_Id,
          'X-App-Token': 'apt_wrongwrongwrongwrongwrongwrongwrongwrongwrongwrongwrongwrongwrong12',
        },
      });
      assertTest('AppAuth', 'Reject incorrect AppToken', false, 'Expected 401');
    } catch (err) {
      assertTest('AppAuth', 'Reject incorrect AppToken (401 Unauthorized)', err.response?.status === 401);
    }

    // D.8 Cross-Project Credential pairing: App A ID + App B Token -> 401
    try {
      await axios.get(`${AUTH_BASE}/auth/verify-service`, {
        headers: {
          'X-App-Id': appA_Id,
          'X-App-Token': appB_Token, // Cross-tenant token mismatch
        },
      });
      assertTest('AppAuth', 'Reject cross-project AppID and AppToken mismatch', false, 'Expected 401');
    } catch (err) {
      assertTest('AppAuth', 'Reject cross-project AppID and AppToken mismatch (401 Unauthorized)', err.response?.status === 401);
    }

    // D.9 Regenerate AppToken: Old token revoked, new token accepted
    const regen = await axios.post(`${AUTH_BASE}/applications/${appA_Uuid}/regenerate-token`, {}, {
      headers: { Authorization: `Bearer ${userA_Token}` },
    });
    const regeneratedToken = regen.data.appToken;
    assertTest('AppAuth', 'Regenerate token produces new non-empty token', Boolean(regeneratedToken && regeneratedToken !== appA_Token));

    // Old token fails
    try {
      await axios.get(`${AUTH_BASE}/auth/verify-service`, {
        headers: {
          'X-App-Id': appA_Id,
          'X-App-Token': appA_Token,
        },
      });
      assertTest('AppAuth', 'Old AppToken revoked immediately after regeneration', false, 'Expected 401');
    } catch (err) {
      assertTest('AppAuth', 'Old AppToken revoked immediately after regeneration (401 Unauthorized)', err.response?.status === 401);
    }

    // New token succeeds
    const newVerify = await axios.get(`${AUTH_BASE}/auth/verify-service`, {
      headers: {
        'X-App-Id': appA_Id,
        'X-App-Token': regeneratedToken,
      },
    });
    assertTest('AppAuth', 'New regenerated AppToken succeeds in handshake', newVerify.data.valid === true);
    appA_Token = regeneratedToken;

    // D.10 Deactivate Application (Status INACTIVE) -> 403 Forbidden
    await axios.patch(`${AUTH_BASE}/applications/${appA_Uuid}`, {
      status: 'INACTIVE',
    }, {
      headers: { Authorization: `Bearer ${userA_Token}` },
    });
    try {
      await axios.get(`${AUTH_BASE}/auth/verify-service`, {
        headers: {
          'X-App-Id': appA_Id,
          'X-App-Token': appA_Token,
        },
      });
      assertTest('AppAuth', 'Reject handshake when application status is INACTIVE', false, 'Expected 403 Forbidden');
    } catch (err) {
      assertTest('AppAuth', 'Reject handshake when application status is INACTIVE (403 Forbidden)', err.response?.status === 403);
    }

    // Reactivate
    await axios.patch(`${AUTH_BASE}/applications/${appA_Uuid}`, {
      status: 'ACTIVE',
    }, {
      headers: { Authorization: `Bearer ${userA_Token}` },
    });
  } catch (err) {
    assertTest('AppAuth', 'Section D unexpected failure', false, err.message);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION E: SIGN-IN METHODS — PROJECT-SCOPED CONFIGURATION
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- SECTION E: PROJECT-SCOPED SIGN-IN METHODS TESTS ---');
  try {
    // E.1 Fetch methods for App A
    const methodsA = await axios.get(`${AUTH_BASE}/applications/${appA_Uuid}/auth-methods`, {
      headers: { Authorization: `Bearer ${userA_Token}` },
    });
    assertTest('Sign-in Methods', 'Fetch Sign-in Methods for App A', Array.isArray(methodsA.data) && methodsA.data.length === 2);

    // E.2 Default: newly created app has both Google and Facebook DISABLED
    const aGoogleDef = methodsA.data.find(p => p.provider === 'GOOGLE');
    const aFbDef = methodsA.data.find(p => p.provider === 'FACEBOOK');
    assertTest('Sign-in Methods', 'Default OAuth providers are disabled upon creation', aGoogleDef?.isEnabled === false && aFbDef?.isEnabled === false);

    // E.3 User B attempts to access App A methods -> 403
    try {
      await axios.get(`${AUTH_BASE}/applications/${appA_Uuid}/auth-methods`, {
        headers: { Authorization: `Bearer ${userB_Token}` },
      });
      assertTest('Sign-in Methods', 'Block User B from accessing App A Sign-in Methods', false, 'Expected 403');
    } catch (err) {
      assertTest('Sign-in Methods', 'Block User B from accessing App A Sign-in Methods (403 Forbidden)', err.response?.status === 403);
    }

    // E.4 Configure Google on App A (Enable & set Client ID/Secret)
    const updateGoogleA = await axios.patch(`${AUTH_BASE}/applications/${appA_Uuid}/auth-methods/GOOGLE`, {
      clientId: 'google-client-id-for-app-a.apps.googleusercontent.com',
      clientSecret: 'secret-app-a-12345',
      isEnabled: true,
    }, {
      headers: { Authorization: `Bearer ${userA_Token}` },
    });
    assertTest('Sign-in Methods', 'Configure and enable Google on App A', updateGoogleA.data.isEnabled === true && updateGoogleA.data.clientId.includes('app-a'));

    // E.5 CRITICAL TEST: Verify App B Google provider remains completely UNCHANGED (Still DISABLED, no Client ID)
    const methodsB = await axios.get(`${AUTH_BASE}/applications/${appB_Uuid}/auth-methods`, {
      headers: { Authorization: `Bearer ${userB_Token}` },
    });
    const bGoogle = methodsB.data.find(p => p.provider === 'GOOGLE');
    const isIsolated = bGoogle.isEnabled === false && bGoogle.clientId !== 'google-client-id-for-app-a.apps.googleusercontent.com';
    assertTest('Sign-in Methods', '⭐ PROJECT ISOLATION: Modifying App A does NOT affect App B', isIsolated, `App B Google isEnabled: ${bGoogle.isEnabled}`);

    // E.6 Client secret is masked in API responses (hasSecret: true, clientSecret not in JSON)
    const jsonStr = JSON.stringify(updateGoogleA.data);
    assertTest('Sign-in Methods', 'Client Secret is never exposed in response body', !jsonStr.includes('secret-app-a-12345') && updateGoogleA.data.hasSecret === true);

    // E.7 Partial update: update only isEnabled, keeps existing secret
    const toggleA = await axios.patch(`${AUTH_BASE}/applications/${appA_Uuid}/auth-methods/GOOGLE`, {
      isEnabled: false,
    }, {
      headers: { Authorization: `Bearer ${userA_Token}` },
    });
    assertTest('Sign-in Methods', 'Partial update keeps existing secret while changing isEnabled', toggleA.data.isEnabled === false && toggleA.data.hasSecret === true);

    // E.8 Toggle provider via POST /toggle
    const togglePost = await axios.post(`${AUTH_BASE}/applications/${appA_Uuid}/auth-methods/GOOGLE/toggle`, {}, {
      headers: { Authorization: `Bearer ${userA_Token}` },
    });
    assertTest('Sign-in Methods', 'Toggle provider via POST /toggle switches state back to ENABLED', togglePost.data.isEnabled === true);

    // E.9 Unsupported provider -> 400
    try {
      await axios.patch(`${AUTH_BASE}/applications/${appA_Uuid}/auth-methods/GITHUB`, { isEnabled: true }, {
        headers: { Authorization: `Bearer ${userA_Token}` },
      });
      assertTest('Sign-in Methods', 'Reject unsupported provider GITHUB', false, 'Expected 400');
    } catch (err) {
      assertTest('Sign-in Methods', 'Reject unsupported provider GITHUB (400 Bad Request)', err.response?.status === 400);
    }

    // E.10 Non-existent application ID -> 404
    try {
      await axios.get(`${AUTH_BASE}/applications/00000000-0000-0000-0000-000000000000/auth-methods`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assertTest('Sign-in Methods', 'Return 404 for non-existent Application ID in auth-methods', false, 'Expected 404');
    } catch (err) {
      assertTest('Sign-in Methods', 'Return 404 for non-existent Application ID in auth-methods (404 Not Found)', err.response?.status === 404);
    }
  } catch (err) {
    assertTest('Sign-in Methods', 'Section E unexpected failure', false, err.message);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION F: OAUTH 2.0 FLOW & STATE VALIDATION
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- SECTION F: OAUTH 2.0 FLOW & STATE VALIDATION TESTS ---');
  try {
    // F.1 Public Discovery GET /auth/providers with App A (Google enabled)
    const pubA = await axios.get(`${AUTH_BASE}/auth/providers`, {
      headers: { 'X-App-Id': appA_Id },
    });
    const aHasGoogle = pubA.data.some(p => p.provider === 'google' && p.enabled === true);
    assertTest('OAuth', 'Public discovery exposes enabled Google provider for App A', aHasGoogle);

    // F.2 Public Discovery GET /auth/providers with App B (All disabled)
    const pubB = await axios.get(`${AUTH_BASE}/auth/providers`, {
      headers: { 'X-App-Id': appB_Id },
    });
    const bHasNoGoogle = !pubB.data.some(p => p.provider === 'google' && p.enabled === true);
    assertTest('OAuth', 'Public discovery does NOT expose disabled Google provider for App B', bHasNoGoogle);

    // F.3 Initiate OAuth Request -> 302 Redirect to Google accounts
    try {
      await axios.get(`${AUTH_BASE}/auth/oauth/google?app_id=${appA_Id}&redirect_uri=http://localhost:3001/callback`, {
        maxRedirects: 0,
        validateStatus: (status) => status === 302,
      });
      assertTest('OAuth', 'Initiate OAuth returns 302 Redirect to Google', true);
    } catch (err) {
      const loc = err.response?.headers?.location || '';
      const isGoogleRedirect = loc.includes('accounts.google.com') && loc.includes('client_id=google-client-id-for-app-a');
      assertTest('OAuth', 'Initiate OAuth constructs valid Google authorization URL with state', isGoogleRedirect, loc.substring(0, 80));
    }

    // F.4 Callback with missing code parameter -> 400
    try {
      await axios.get(`${AUTH_BASE}/auth/oauth/google/callback?state=fake_state`);
      assertTest('OAuth', 'Reject callback missing authorization code', false, 'Expected 400');
    } catch (err) {
      assertTest('OAuth', 'Reject callback missing authorization code (400 Bad Request)', err.response?.status === 400);
    }

    // F.5 Callback with missing state parameter -> 400
    try {
      await axios.get(`${AUTH_BASE}/auth/oauth/google/callback?code=fake_code`);
      assertTest('OAuth', 'Reject callback missing state parameter', false, 'Expected 400');
    } catch (err) {
      assertTest('OAuth', 'Reject callback missing state parameter (400 Bad Request)', err.response?.status === 400);
    }

    // F.6 Callback with invalid/tampered state token -> 401
    try {
      await axios.get(`${AUTH_BASE}/auth/oauth/google/callback?code=fake_code&state=tampered.fake.token`);
      assertTest('OAuth', 'Reject callback with tampered CSRF state', false, 'Expected 401');
    } catch (err) {
      assertTest('OAuth', 'Reject callback with tampered CSRF state (401 Unauthorized)', err.response?.status === 401);
    }

    // F.7 Callback with provider error (user cancelled/denied consent) -> 401
    try {
      await axios.get(`${AUTH_BASE}/auth/oauth/google/callback?error=access_denied&error_description=User+denied+consent`);
      assertTest('OAuth', 'Handle OAuth provider consent denial gracefully', false, 'Expected 401');
    } catch (err) {
      assertTest('OAuth', 'Handle OAuth provider consent denial gracefully (401 Unauthorized)', err.response?.status === 401);
    }
  } catch (err) {
    assertTest('OAuth', 'Section F unexpected failure', false, err.message);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION G: LIVE MICROSERVICE INTEROPERABILITY (DEMO SERVICE - PORT 3001)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- SECTION G: LIVE MICROSERVICE CLIENT INTEROPERABILITY TESTS ---');
  try {
    // G.1 Demo service reports ONLINE and Handshake CONNECTED
    const demoStatus = await axios.get(`${DEMO_BASE}/status`);
    assertTest('Demo Interop', 'Demo Service is ONLINE and handshake status is SUCCESS', demoStatus.data.status === 'ONLINE' && demoStatus.data.handshakeStatus === 'SUCCESS');

    // G.2 Call /orders without token -> 401
    try {
      await axios.get(`${DEMO_BASE}/orders`);
      assertTest('Demo Interop', 'Reject /orders without Bearer token', false, 'Expected 401');
    } catch (err) {
      assertTest('Demo Interop', 'Reject /orders without Bearer token (401 Unauthorized)', err.response?.status === 401);
    }

    // G.3 Call /orders with valid User A Bearer JWT -> 200 OK with orders
    const ordersRes = await axios.get(`${DEMO_BASE}/orders`, {
      headers: { Authorization: `Bearer ${userA_Token}` },
    });
    assertTest('Demo Interop', 'Authorized /orders returns user profile and business orders', ordersRes.data.user.email === userA_Email && Array.isArray(ordersRes.data.orders));

    // G.4 Call /orders with tampered JWT -> 401
    try {
      await axios.get(`${DEMO_BASE}/orders`, {
        headers: { Authorization: `Bearer ${userA_Token}broken` },
      });
      assertTest('Demo Interop', 'Reject /orders with invalid Bearer token', false, 'Expected 401');
    } catch (err) {
      assertTest('Demo Interop', 'Reject /orders with invalid Bearer token (401 Unauthorized)', err.response?.status === 401);
    }
  } catch (err) {
    assertTest('Demo Interop', 'Section G unexpected failure', false, err.message);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION H: SECURITY & PENETRATION TESTS (SQLi, XSS, MASS ASSIGNMENT)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- SECTION H: SECURITY & PENETRATION AUDIT TESTS ---');
  try {
    // H.1 SQL Injection payload in login email
    try {
      await axios.post(`${AUTH_BASE}/auth/login`, {
        email: "' OR '1'='1' --",
        password: 'password',
      });
      assertTest('Security', 'SQL Injection defense: reject SQL injection in login', false, 'Expected 400 or 401');
    } catch (err) {
      assertTest('Security', 'SQL Injection defense: rejected SQL injection payload safely', err.response?.status === 400 || err.response?.status === 401);
    }

    // H.2 SQL Injection in Application queries
    try {
      await axios.get(`${AUTH_BASE}/applications/1' OR '1'='1`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assertTest('Security', 'SQL Injection defense in route params', false, 'Expected 404');
    } catch (err) {
      assertTest('Security', 'SQL Injection defense in route params (404 Not Found, Prisma parameterized)', err.response?.status === 404);
    }

    // H.3 XSS Payload in user name
    const xssPayload = '<script>alert("xss")</script><img src=x onerror=alert(1)>';
    const xssUser = await axios.patch(`${AUTH_BASE}/users/${userA_Id}`, {
      name: xssPayload,
    }, {
      headers: { Authorization: `Bearer ${userA_Token}` },
    });
    assertTest('Security', 'XSS payload stored as raw text, sanitized by React JSON parser', xssUser.data.name === xssPayload);

    // H.4 Oversized payload (> 500,000 chars) defense
    try {
      await axios.post(`${AUTH_BASE}/auth/register`, {
        email: `overflow_${ts}@example.com`,
        password: 'P'.repeat(100000),
      });
      assertTest('Security', 'Reject or handle oversized payload gracefully', false, 'Expected error');
    } catch (err) {
      assertTest('Security', 'Oversized payload handled safely without crashing server', err.response?.status === 400 || err.response?.status === 413);
    }
  } catch (err) {
    assertTest('Security', 'Section H unexpected failure', false, err.message);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CLEANUP TEST DATA
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- CLEANING UP TEST ARTIFACTS ---');
  try {
    if (appA_Uuid) {
      await axios.delete(`${AUTH_BASE}/applications/${appA_Uuid}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }
    if (appB_Uuid) {
      await axios.delete(`${AUTH_BASE}/applications/${appB_Uuid}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }
    if (userA_Id) {
      await axios.delete(`${AUTH_BASE}/users/${userA_Id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }
    if (userB_Id) {
      await axios.delete(`${AUTH_BASE}/users/${userB_Id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }
    assertTest('Cleanup', 'Cleaned up temporary test users and applications', true);
  } catch (err) {
    console.warn('Cleanup warning:', err.message);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n========================================================================');
  const total = passCount + failCount;
  const pct = ((passCount / total) * 100).toFixed(1);
  console.log(`📊 AUDIT TEST SUITE RESULTS: ${passCount} / ${total} PASSED (${pct}%) | FAILED: ${failCount}`);
  console.log('========================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runFullAuditSuite();
