function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/**
 * CLIENT APPLICATION LOGIC — DEMO SERVICE (PROJECT 2)
 * Streamlined integration showcase with Auth Service (Project 1) via Google & Facebook OAuth.
 */

const API_BASE = window.location.origin; // http://localhost:3001

const translations = {
  en: {
    nav: {
      brand_title: 'Customer Portal',
      brand_tag: 'Auth Integration',
      app_desc: '— Auth Service OAuth Integration Demo',
    },
    auth: {
      title: 'Sign In to Your Account',
      subtitle: 'Fast and secure sign-in with your social account',
      btn_google: 'Sign in with Google',
      btn_facebook: 'Sign in with Facebook',
    },
    btn: {
      sign_out: 'Sign Out',
    },
    toasts: {
      oauth_redirect: 'Redirecting to sign-in provider...',
      signed_in: 'Welcome back,',
      signed_out: 'Signed out successfully.',
      not_enabled: 'This sign-in method is currently disabled. Please contact the administrator.',
    },
    status: {
      online: 'System Online',
      connected: 'System Online',
      disconnected: 'Disconnected',
      offline: 'System Offline',
    },
    profile: {
      title: 'Account Profile',
      user_id: 'User ID:',
      provider: 'Provider:',
      tenant: 'Organization:',
      auth_status: 'Auth Status:',
      verified: 'Verified',
      integration_notice_title: 'Integration Successful:',
      integration_notice_desc: 'Demo app is securely connected and authenticated via Auth Service (Project 1) using OAuth 2.0 PKCE.',
    },
    api_test: {
      title: 'Token Verification (Protected API)',
      desc: 'Call endpoint GET /auth/protected with Bearer token to verify access via Auth Service.',
      btn_call: 'Test Protected API',
    }
  },
  vi: {
    nav: {
      brand_title: 'Cổng Khách Hàng',
      brand_tag: 'Tích Hợp Xác Thực',
      app_desc: '— Minh Họa Tích Hợp OAuth với Auth Service',
    },
    auth: {
      title: 'Đăng Nhập Tài Khoản',
      subtitle: 'Đăng nhập nhanh chóng và bảo mật qua mạng xã hội',
      btn_google: 'Đăng nhập bằng Google',
      btn_facebook: 'Đăng nhập bằng Facebook',
    },
    btn: {
      sign_out: 'Đăng Xuất',
    },
    toasts: {
      oauth_redirect: 'Đang chuyển hướng sang trang đăng nhập...',
      signed_in: 'Chào mừng trở lại,',
      signed_out: 'Đã đăng xuất thành công.',
      not_enabled: 'Phương thức này hiện chưa được mở. Vui lòng liên hệ quản trị viên.',
    },
    status: {
      online: 'Hệ Thống Trực Tuyến',
      connected: 'Hệ Thống Trực Tuyến',
      disconnected: 'Mất Kết Nối',
      offline: 'Ngoại Tuyến',
    },
    profile: {
      title: 'Thông Tin Tài Khoản',
      user_id: 'User ID:',
      provider: 'Phương Thức:',
      tenant: 'Doanh Nghiệp:',
      auth_status: 'Xác Thực:',
      verified: 'Đã Xác Thực',
      integration_notice_title: 'Tích Hợp Thành Công:',
      integration_notice_desc: 'Ứng dụng Demo đã kết nối và xác thực an toàn qua Auth Service (Project 1) bằng giao thức OAuth 2.0 PKCE.',
    },
    api_test: {
      title: 'Kiểm Chứng Token (Protected API)',
      desc: 'Gọi endpoint GET /auth/protected kèm Bearer token để xác thực quyền truy cập qua Auth Service.',
      btn_call: 'Thử Gọi API Bảo Vệ',
    }
  }
};

const state = {
  lang: localStorage.getItem('demo_lang') || 'vi',
  token: localStorage.getItem('demo_token') || null,
  user: JSON.parse(localStorage.getItem('demo_user') || 'null'),
  providers: [],
  handshake: null,
  handshakeStatus: null,
  oauthBusy: false,
};

function t(path) {
  const keys = path.split('.');
  let current = translations[state.lang] || translations.vi;
  for (const k of keys) {
    if (current && current[k] !== undefined) {
      current = current[k];
    } else {
      return path;
    }
  }
  return current;
}

function setLanguage(lang) {
  state.lang = lang;
  localStorage.setItem('demo_lang', lang);

  document.querySelectorAll('#lang-btn-en').forEach(el => el.classList.toggle('active', lang === 'en'));
  document.querySelectorAll('#lang-btn-vi').forEach(el => el.classList.toggle('active', lang === 'vi'));

  document.documentElement.lang = lang;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });

  renderProvidersList(state.providers);
  updateAuthUI();
  updateHandshakeUI();
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    setTimeout(() => toast.remove(), 200);
  }, 3500);
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH & SESSION MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
function updateAuthUI() {
  const unauthView = document.getElementById('unauth-view');
  const authView = document.getElementById('auth-view');

  if (state.token && state.user) {
    if (unauthView) unauthView.style.display = 'none';
    if (authView) authView.style.display = 'block';

    const nameEl = document.getElementById('user-name-display');
    const emailEl = document.getElementById('user-email-display');
    const idEl = document.getElementById('user-id-display');
    const providerEl = document.getElementById('user-provider-display');
    const avatarEl = document.getElementById('user-avatar');

    const displayName = state.user.name || state.user.email?.split('@')[0] || 'User';
    if (nameEl) nameEl.textContent = displayName;
    if (emailEl) emailEl.textContent = state.user.email || 'N/A';
    if (idEl) idEl.textContent = state.user.id || state.user.sub || 'N/A';

    if (providerEl) {
      const p = (state.user.provider || 'OAuth').toUpperCase();
      providerEl.textContent = p;
    }

    const tenantEl = document.getElementById('user-tenant-display');
    if (tenantEl) {
      if (state.user.tenantName || state.user.tenantId) {
        tenantEl.textContent = state.user.tenantName ? `${state.user.tenantName} (${state.user.tenantId})` : state.user.tenantId;
        tenantEl.style.color = '#38bdf8';
      } else {
        tenantEl.textContent = state.lang === 'vi' ? 'Chưa tham gia' : 'None';
        tenantEl.style.color = 'var(--text-muted)';
      }
    }

    if (avatarEl) {
      if (state.user.avatar) {
        avatarEl.replaceChildren();
        try {
          const url = new URL(state.user.avatar);
          if (url.protocol === 'https:') {
            const img = document.createElement('img');
            img.src = url.href;
            img.alt = 'Avatar';
            img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%';
            avatarEl.appendChild(img);
          }
        } catch {
          avatarEl.textContent = '?';
        }
      } else {
        const initial = (state.user.name || state.user.email || 'U').charAt(0).toUpperCase();
        avatarEl.textContent = initial;
      }
    }
  } else {
    if (unauthView) unauthView.style.display = 'block';
    if (authView) authView.style.display = 'none';
  }
}

/**
 * Synchronize user profile with Project 2 backend
 */
async function syncUserProfile() {
  if (!state.token) return;

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${state.token}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.user) {
        state.user = {
          ...state.user,
          ...data.user,
        };
        localStorage.setItem('demo_user', JSON.stringify(state.user));
        updateAuthUI();
      }
    }
  } catch (err) {
    console.warn('Failed to sync profile with Project 2:', err.message);
  }
}

async function handleUrlCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (!code && !params.has('error')) return;
  const expectedState = sessionStorage.getItem('login_state');
  const verifier = sessionStorage.getItem('oauth_verifier');
  sessionStorage.removeItem('login_state');
  sessionStorage.removeItem('oauth_verifier');
  window.history.replaceState({}, document.title, window.location.pathname);
  if (params.has('error')) {
    const err = params.get('error');
    showToast(
      err === 'oauth_cancelled'
        ? (state.lang === 'vi' ? 'Đã hủy đăng nhập qua nhà cung cấp.' : 'Sign-in cancelled by user.')
        : (state.lang === 'vi' ? 'Đăng nhập qua nhà cung cấp thất bại.' : 'Sign-in failed.'),
      'error'
    );
    return;
  }
  if (!code || !expectedState || params.get('state') !== expectedState || !verifier) {
    showToast('Phiên đăng nhập không hợp lệ. Vui lòng thử lại.', 'error');
    return;
  }
  try {
    const response = await fetch(`${API_BASE}/auth/exchange`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, verifier }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Không thể hoàn tất đăng nhập.');
    state.token = result.accessToken;
    state.user = result.user;
    localStorage.setItem('demo_token', state.token);
    localStorage.setItem('demo_user', JSON.stringify(state.user));
    await syncUserProfile();
    updateAuthUI();
    showToast(t('toasts.signed_in'));
  } catch (error) {
    showToast(error.message || 'Không thể kết nối máy chủ.', 'error');
  }
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('demo_token');
  localStorage.removeItem('demo_user');

  const resultEl = document.getElementById('api-test-result');
  const statusEl = document.getElementById('api-test-status');
  if (resultEl) {
    resultEl.style.display = 'none';
    resultEl.textContent = '';
  }
  if (statusEl) statusEl.textContent = '';

  updateAuthUI();
  showToast(t('toasts.signed_out'));
}

async function testProtectedApi() {
  const statusEl = document.getElementById('api-test-status');
  const resultEl = document.getElementById('api-test-result');
  const btn = document.getElementById('btn-test-protected-api');

  if (!state.token) {
    showToast(state.lang === 'vi' ? 'Vui lòng đăng nhập trước.' : 'Please sign in first.', 'error');
    return;
  }

  if (btn) btn.disabled = true;
  if (statusEl) statusEl.textContent = state.lang === 'vi' ? 'Đang gọi API...' : 'Calling API...';

  try {
    const res = await fetch(`${API_BASE}/auth/protected`, {
      headers: {
        'Authorization': `Bearer ${state.token}`
      }
    });

    const data = await res.json().catch(() => ({}));

    if (resultEl) {
      resultEl.style.display = 'block';
      const displayData = (res.ok && data && data.user) ? {
        message: data.message,
        authenticated: data.authenticated,
        service: data.service,
        appId: data.appId,
        user: {
          id: data.user.id || data.user.userId,
          email: data.user.email,
          tenantId: data.user.tenantId ?? null,
        },
        timestamp: data.timestamp,
      } : data;

      resultEl.textContent = JSON.stringify({
        status: res.status,
        statusText: res.statusText,
        data: displayData,
      }, null, 2);
    }

    if (res.ok) {
      if (statusEl) statusEl.innerHTML = `<span style="color: #10b981;">HTTP ${res.status} OK (Đã xác thực)</span>`;
      showToast(state.lang === 'vi' ? 'Xác thực API bảo vệ thành công!' : 'Protected API verified successfully!');
    } else if (res.status === 403) {
      if (statusEl) statusEl.innerHTML = `<span style="color: #ef4444;">HTTP 403 (${data.message || 'Truy cập bị từ chối'})</span>`;
      showToast(data.message || (state.lang === 'vi' ? 'Truy cập bị từ chối' : 'Access denied'), 'error');
    } else {
      if (statusEl) statusEl.innerHTML = `<span style="color: #ef4444;">HTTP ${res.status} (${data.message || 'Lỗi'})</span>`;
      showToast(data.message || 'API error', 'error');
    }
  } catch (err) {
    if (statusEl) statusEl.innerHTML = `<span style="color: #ef4444;">Network Error</span>`;
    showToast(err.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OAUTH INITIATION
// ─────────────────────────────────────────────────────────────────────────────
async function loginWithProvider(provider = 'google') {
  if (state.oauthBusy) return;

  const prov = (state.providers || []).find(p => (p.provider || '').toLowerCase() === provider.toLowerCase());
  if (prov && !prov.enabled) {
    showToast(t('toasts.not_enabled'), 'error');
    return;
  }

  state.oauthBusy = true;
  const button = document.getElementById('btn-auth-login');
  const googleBtn = document.getElementById('btn-oauth-google');
  const fbBtn = document.getElementById('btn-oauth-facebook');
  if (button) button.disabled = true;
  if (googleBtn) googleBtn.disabled = true;
  if (fbBtn) fbBtn.disabled = true;
  try {
    if (!crypto?.subtle) throw new Error('Cần sử dụng HTTPS hoặc localhost để đăng nhập.');
    const random = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
    const verifier = random();
    const clientState = random();
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    sessionStorage.setItem('oauth_verifier', verifier);
    sessionStorage.setItem('login_state', clientState);
    const response = await fetch(`${API_BASE}/auth/start`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, codeChallenge, state: clientState }),
    });
    const result = await response.json();
    if (!response.ok || !result.authorizeUrl) throw new Error(result.message || 'Không thể mở trang đăng nhập.');
    window.location.assign(result.authorizeUrl);
  } catch (error) {
    sessionStorage.removeItem('oauth_verifier'); sessionStorage.removeItem('login_state');
    state.oauthBusy = false;
    if (button) button.disabled = false;
    renderProvidersList(state.providers);
    showToast(error.message || 'Không thể mở trang đăng nhập.', 'error');
  }
}

async function loginWithAuth(provider = 'google') {
  return loginWithProvider(provider);
}

async function refreshProviders() {
  try {
    const res = await fetch(`${API_BASE}/auth/providers`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.providers = Array.isArray(data) ? data : [];
    renderProvidersList(state.providers);
  } catch (err) {
    console.warn('Failed to load providers:', err.message);
  }
}

function renderProvidersList(providers) {
  const googleBtn = document.getElementById('btn-oauth-google');
  const fbBtn = document.getElementById('btn-oauth-facebook');

  const googleProv = (providers || []).find(p => (p.provider || '').toLowerCase() === 'google');
  const fbProv = (providers || []).find(p => (p.provider || '').toLowerCase() === 'facebook');

  if (googleBtn) {
    const isGoogleEnabled = Boolean(googleProv && googleProv.enabled);
    googleBtn.disabled = !isGoogleEnabled;
    if (googleBtn.style) googleBtn.style.opacity = isGoogleEnabled ? '1' : '0.45';
    googleBtn.title = isGoogleEnabled ? t('auth.btn_google') : t('toasts.not_enabled');
  }

  if (fbBtn) {
    const isFbEnabled = Boolean(fbProv && fbProv.enabled);
    fbBtn.disabled = !isFbEnabled;
    if (fbBtn.style) fbBtn.style.opacity = isFbEnabled ? '1' : '0.45';
    fbBtn.title = isFbEnabled ? t('auth.btn_facebook') : t('toasts.not_enabled');
  }
}

function updateHandshakeUI() {
  const dot = document.getElementById('handshake-dot');
  const text = document.getElementById('handshake-text');
  const bannerAppName = document.getElementById('banner-app-name');
  const bannerAppStatus = document.getElementById('banner-app-status');

  const isConnected = state.handshakeStatus === 'CONNECTED';
  const isOffline = state.handshakeStatus === 'OFFLINE';

  if (dot) {
    dot.className = isConnected ? 'status-dot' : 'status-dot status-dot-error';
  }
  if (text) {
    if (isConnected) text.textContent = t('status.online');
    else if (isOffline) text.textContent = t('status.offline');
    else text.textContent = t('status.disconnected');
  }

  if (state.handshake) {
    const appName = state.handshake.handshake?.appName || state.handshake.appName || 'Demo Service';
    const appStatus = state.handshake.handshake?.applicationStatus || state.handshake.status || 'ACTIVE';

    if (bannerAppName) bannerAppName.textContent = appName;
    if (bannerAppStatus) {
      bannerAppStatus.textContent = appStatus;
      bannerAppStatus.className = appStatus === 'ACTIVE' ? 'badge badge-success' : 'badge badge-danger';
    }
  }
}

async function checkHandshake() {
  try {
    const res = await fetch(`${API_BASE}/status`);
    if (!res.ok) {
      state.handshakeStatus = 'DISCONNECTED';
      updateHandshakeUI();
      return;
    }
    const data = await res.json();
    state.handshake = data;

    const isConnected =
      data.handshakeStatus === 'SUCCESS' ||
      data.handshake?.authService === 'CONNECTED';

    state.handshakeStatus = isConnected ? 'CONNECTED' : 'DISCONNECTED';
    updateHandshakeUI();
  } catch {
    state.handshakeStatus = 'OFFLINE';
    updateHandshakeUI();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  setLanguage(state.lang);
  await handleUrlCallback();
  updateAuthUI();
  await checkHandshake();
  await refreshProviders();
  if (state.token) {
    await syncUserProfile();
  }
});
