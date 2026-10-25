/**
 * DEMO SERVICE (PROJECT 2) — CLIENT APPLICATION LOGIC
 * Focused solely on: Login (Google/Facebook via Auth Service) -> Display User Profile -> Logout
 * Bilingual: English (EN) and Vietnamese (VI)
 */

const API_BASE = window.location.origin; // http://localhost:3001
const AUTH_SERVICE_URL = 'http://localhost:3000';

const translations = {
  en: {
    banner: {
      title: 'Federated OAuth 2.0 Client Application',
      desc: 'This client application delegates user authentication to Auth Service (Project 1, Port 3000) via OAuth 2.0 (Google & Facebook) following the Firebase Authentication model.',
      target_auth: 'Central Auth Service:',
    },
    auth: {
      title: 'Sign In via Auth Service',
      subtitle: 'Choose an enabled OAuth 2.0 identity provider',
      available_providers: 'Sign-in Methods from Auth Service',
      loading_providers: 'Querying available providers from Auth Service...',
      btn_google: 'Sign in with Google',
      btn_facebook: 'Sign in with Facebook',
      provider_enabled: 'ENABLED',
      provider_disabled: 'DISABLED (Not configured)',
      firebase_hint_title: '💡 Real OAuth Configuration:',
      firebase_hint_desc: 'To enable real Google/Facebook sign-in, open Developer Console (Port 3000) -> "Sign-in Methods", enter your OAuth credentials from Google Cloud Console or Meta for Developers, and toggle Enable.',
    },
    session: {
      title: 'Authenticated User Profile',
      subtitle: 'Identity returned by Auth Service (Project 1)',
      active_badge: 'Active Session',
      user_id: 'User ID (UID)',
      provider: 'Identity Provider',
      auth_status: 'Auth Status',
      verified_text: '✓ JWT Validated via Auth Service',
      jwt_label: 'JWT Access Token (Bearer):',
    },
    btn: {
      refresh: 'Refresh',
      copy: 'Copy Token',
      sign_out: 'Sign Out',
      open_console: 'Auth Service Console ↗',
    },
    toasts: {
      oauth_redirect: 'Redirecting to real OAuth provider...',
      signed_in: 'Authenticated successfully as',
      signed_out: 'Signed out successfully.',
      copied: 'Copied token to clipboard.',
      handshake_success: 'Auth Service connected & handshake verified.',
      handshake_fail: 'Handshake verification failed.',
      not_enabled: 'This provider is not enabled in Auth Service Console. Please configure it first.',
    },
    status: {
      connected: 'Auth Service: Connected',
      disconnected: 'Auth Service: Disconnected',
      offline: 'Auth Service: Offline',
    }
  },
  vi: {
    banner: {
      title: 'Client Microservice Xác Thực Qua OAuth 2.0',
      desc: 'Ứng dụng này đóng vai trò là một microservice client ủy thác toàn bộ xác thực người dùng cho Auth Service (Project 1, Port 3000) qua OAuth 2.0 (Google & Facebook) theo mô hình Firebase Authentication.',
      target_auth: 'Hệ thống Auth Service:',
    },
    auth: {
      title: 'Đăng Nhập Qua Auth Service',
      subtitle: 'Chọn nhà cung cấp danh tính OAuth 2.0 đã được kích hoạt',
      available_providers: 'Phương Thức Đăng Nhập Từ Auth Service',
      loading_providers: 'Đang truy vấn các nhà cung cấp khả dụng từ Auth Service...',
      btn_google: 'Đăng nhập bằng Google',
      btn_facebook: 'Đăng nhập bằng Facebook',
      provider_enabled: 'ĐANG BẬT',
      provider_disabled: 'ĐÃ TẮT (Chưa cấu hình)',
      firebase_hint_title: '💡 Cấu hình OAuth thực tế:',
      firebase_hint_desc: 'Để bật đăng nhập Google/Facebook thật, mở Developer Console (Port 3000) -> "Sign-in Methods", nhập Client ID và Secret từ Google Cloud Console hoặc Meta for Developers, rồi bấm Bật.',
    },
    session: {
      title: 'Thông Tin Người Dùng Đã Đăng Nhập',
      subtitle: 'Dữ liệu định danh được cấp và xác thực bởi Auth Service (Project 1)',
      active_badge: 'Phiên Đang Hoạt Động',
      user_id: 'Mã Định Danh (UID)',
      provider: 'Nhà Cung Cấp',
      auth_status: 'Trạng Thái',
      verified_text: '✓ JWT Token Hợp Lệ Từ Auth Service',
      jwt_label: 'Access Token JWT (Bearer):',
    },
    btn: {
      refresh: 'Làm Mới',
      copy: 'Sao Chép Token',
      sign_out: 'Đăng Xuất',
      open_console: 'Auth Service Console ↗',
    },
    toasts: {
      oauth_redirect: 'Đang chuyển hướng sang nhà cung cấp OAuth...',
      signed_in: 'Đăng nhập thành công với tài khoản',
      signed_out: 'Đã đăng xuất thành công.',
      copied: 'Đã sao chép token vào bộ nhớ tạm.',
      handshake_success: 'Kết nối và xác thực với Auth Service thành công.',
      handshake_fail: 'Xác thực handshake với Auth Service thất bại.',
      not_enabled: 'Phương thức này chưa được kích hoạt trong Auth Service Console. Vui lòng cấu hình trước.',
    },
    status: {
      connected: 'Auth Service: Đã Kết Nối',
      disconnected: 'Auth Service: Ngắt Kết Nối',
      offline: 'Auth Service: Ngoại Tuyến',
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

    // Populate user profile info
    const nameEl = document.getElementById('user-name-display');
    const emailEl = document.getElementById('user-email-display');
    const roleEl = document.getElementById('user-role-display');
    const idEl = document.getElementById('user-id-display');
    const providerEl = document.getElementById('user-provider-display');
    const avatarEl = document.getElementById('user-avatar');
    const tokenEl = document.getElementById('user-token-display');

    if (nameEl) nameEl.textContent = state.user.name || state.user.email?.split('@')[0] || 'User';
    if (emailEl) emailEl.textContent = state.user.email || 'N/A';
    if (roleEl) roleEl.textContent = state.user.role || 'USER';
    if (idEl) idEl.textContent = state.user.id || state.user.sub || 'N/A';
    if (providerEl) {
      const p = (state.user.provider || 'OAuth').toUpperCase();
      providerEl.textContent = p;
    }

    if (avatarEl) {
      if (state.user.avatar) {
        avatarEl.innerHTML = `<img src="${state.user.avatar}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
      } else {
        const initial = (state.user.name || state.user.email || 'U').charAt(0).toUpperCase();
        avatarEl.textContent = initial;
      }
    }

    if (tokenEl) tokenEl.textContent = state.token;
  } else {
    if (unauthView) unauthView.style.display = 'block';
    if (authView) authView.style.display = 'none';
  }
}

function handleUrlCallback() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const error = params.get('error') || params.get('error_description');

  if (error) {
    showToast(`OAuth Error: ${error}`, 'error');
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }

  if (token) {
    // Decode user info from params or parse JWT
    let user = null;
    const email = params.get('email');
    const name = params.get('name');
    const role = params.get('role');
    const provider = params.get('provider');
    const avatar = params.get('avatar');

    try {
      // Decode JWT payload
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        user = {
          id: payload.sub,
          email: email || payload.email,
          role: role || payload.role || 'USER',
          name: name || undefined,
          provider: provider || payload.provider || 'OAuth',
          avatar: avatar || undefined,
        };
      }
    } catch {
      user = { email, name, role, provider, avatar };
    }

    state.token = token;
    state.user = user;
    localStorage.setItem('demo_token', token);
    localStorage.setItem('demo_user', JSON.stringify(user));

    window.history.replaceState({}, document.title, window.location.pathname);
    updateAuthUI();
    showToast(`${t('toasts.signed_in')} ${user?.email || ''}`);
  }
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('demo_token');
  localStorage.removeItem('demo_user');

  updateAuthUI();
  showToast(t('toasts.signed_out'));
}

function copyToken() {
  if (!state.token) return;
  navigator.clipboard.writeText(state.token).then(() => {
    showToast(t('toasts.copied'));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// OAUTH INITIATION
// ─────────────────────────────────────────────────────────────────────────────
function loginWithOAuth(provider) {
  const provConfig = state.providers.find(p => (p.provider || '').toLowerCase() === provider.toLowerCase());

  if (provConfig && !provConfig.enabled) {
    showToast(t('toasts.not_enabled'), 'error');
    return;
  }

  showToast(t('toasts.oauth_redirect'));
  // Redirect directly to Auth Service OAuth endpoint with redirect_uri and app_id
  const redirectUri = window.location.origin + '/';
  const appId = state.handshake?.handshake?.appId || state.handshake?.appId || '';
  const targetUrl = `${AUTH_SERVICE_URL}/auth/oauth/${provider}?redirect_uri=${encodeURIComponent(redirectUri)}${appId ? `&app_id=${encodeURIComponent(appId)}` : ''}`;
  window.location.href = targetUrl;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDERS DISCOVERY & SERVICE HANDSHAKE
// ─────────────────────────────────────────────────────────────────────────────
async function refreshProviders() {
  const listEl = document.getElementById('providers-status-list');
  if (listEl) {
    listEl.innerHTML = `<div class="provider-skeleton">${t('auth.loading_providers')}</div>`;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/providers`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.providers = Array.isArray(data) ? data : [];
    renderProvidersList(state.providers);
  } catch (err) {
    if (listEl) {
      listEl.innerHTML = `<div style="color: var(--danger); font-size: 13px; padding: 8px;">Failed to load providers: ${err.message}</div>`;
    }
  }
}

function renderProvidersList(providers) {
  const listEl = document.getElementById('providers-status-list');
  if (!listEl) return;

  if (!providers || providers.length === 0) {
    listEl.innerHTML = `<div class="provider-skeleton" style="color: var(--text-dim);">No providers discovered from Auth Service.</div>`;
    return;
  }

  listEl.innerHTML = providers.map(p => {
    const isEnabled = Boolean(p.enabled);
    const pName = p.name || p.provider;
    const isGoogle = (p.provider || '').toLowerCase() === 'google';

    const iconSvg = isGoogle
      ? `<svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`;

    return `
      <div class="provider-item" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          ${iconSvg}
          <span style="font-weight: 500;">${pName}</span>
        </div>
        <span class="badge ${isEnabled ? 'badge-success' : 'badge-disabled'}" style="${!isEnabled ? 'background: rgba(100, 116, 139, 0.2); color: var(--text-dim);' : ''}">
          ${isEnabled ? t('auth.provider_enabled') : t('auth.provider_disabled')}
        </span>
      </div>
    `;
  }).join('');

  // Update button states
  const googleBtn = document.getElementById('btn-oauth-google');
  const fbBtn = document.getElementById('btn-oauth-facebook');

  const googleProv = providers.find(p => (p.provider || '').toLowerCase() === 'google');
  const fbProv = providers.find(p => (p.provider || '').toLowerCase() === 'facebook');

  if (googleBtn) {
    const isGoogleEnabled = Boolean(googleProv && googleProv.enabled);
    googleBtn.style.opacity = isGoogleEnabled ? '1' : '0.55';
    googleBtn.title = isGoogleEnabled ? 'Sign in with Google' : t('toasts.not_enabled');
  }

  if (fbBtn) {
    const isFbEnabled = Boolean(fbProv && fbProv.enabled);
    fbBtn.style.opacity = isFbEnabled ? '1' : '0.55';
    fbBtn.title = isFbEnabled ? 'Sign in with Facebook' : t('toasts.not_enabled');
  }
}

function updateHandshakeUI() {
  const dot = document.getElementById('handshake-dot');
  const text = document.getElementById('handshake-text');
  const metaAppId = document.getElementById('meta-app-id');

  const isConnected = state.handshakeStatus === 'CONNECTED';
  const isOffline = state.handshakeStatus === 'OFFLINE';

  if (dot) {
    dot.className = isConnected ? 'status-dot' : 'status-dot status-dot-error';
  }
  if (text) {
    if (isConnected) text.textContent = t('status.connected');
    else if (isOffline) text.textContent = t('status.offline');
    else text.textContent = t('status.disconnected');
  }
  if (metaAppId) {
    const appId = state.handshake?.handshake?.appId || state.handshake?.appId;
    metaAppId.textContent = isConnected ? (appId || 'Active') : 'Error';
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
  handleUrlCallback();
  updateAuthUI();
  await checkHandshake();
  await refreshProviders();
});
