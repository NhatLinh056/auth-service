/**
 * CLIENT APPLICATION LOGIC
 * Standalone Client Portal: Social Sign In (Google / Facebook) -> Display User Profile -> Logout
 * Bilingual: English (EN) and Vietnamese (VI)
 */

const API_BASE = window.location.origin; // http://localhost:3001
const AUTH_SERVICE_URL = 'http://localhost:3000';

const translations = {
  en: {
    nav: {
      brand_title: 'Client Portal',
      brand_tag: 'Online Portal',
    },
    auth: {
      title: 'Sign In to Your Account',
      subtitle: 'Choose your social account to sign in securely',
      btn_google: 'Sign in with Google',
      btn_facebook: 'Sign in with Facebook',
    },
    session: {
      title: 'Authenticated User Profile',
      subtitle: 'Secure active user session',
      active_badge: 'Active Session',
      user_id: 'User ID (UID)',
      provider: 'Sign-in Method',
      auth_status: 'Account Status',
      verified_text: '✓ Authenticated & Verified',
      jwt_label: 'Access Token (JWT Bearer):',
    },
    btn: {
      copy: 'Copy Token',
      sign_out: 'Sign Out',
    },
    toasts: {
      oauth_redirect: 'Redirecting to login provider...',
      signed_in: 'Authenticated successfully as',
      signed_out: 'Signed out successfully.',
      copied: 'Copied token to clipboard.',
      not_enabled: 'This sign-in method is currently disabled. Please contact the administrator.',
    },
    status: {
      online: 'System Online',
      connected: 'System Online',
      disconnected: 'System Offline',
      offline: 'System Offline',
    }
  },
  vi: {
    nav: {
      brand_title: 'Cổng Khách Hàng',
      brand_tag: 'Dịch Vụ Trực Tuyến',
    },
    auth: {
      title: 'Đăng Nhập Tài Khoản',
      subtitle: 'Chọn phương thức tài khoản để đăng nhập nhanh chóng',
      btn_google: 'Đăng nhập bằng Google',
      btn_facebook: 'Đăng nhập bằng Facebook',
    },
    session: {
      title: 'Thông Tin Tài Khoản',
      subtitle: 'Phiên đăng nhập đã được xác thực an toàn',
      active_badge: 'Đang Hoạt Động',
      user_id: 'Mã Tài Khoản (UID)',
      provider: 'Phương Thức Đăng Nhập',
      auth_status: 'Trạng Thái Xác Thực',
      verified_text: '✓ Đã Xác Thực & Hoạt Động',
      jwt_label: 'Mã Phiên Đăng Nhập (Access Token JWT):',
    },
    btn: {
      copy: 'Sao Chép Token',
      sign_out: 'Đăng Xuất',
    },
    toasts: {
      oauth_redirect: 'Đang chuyển hướng sang trang đăng nhập...',
      signed_in: 'Đăng nhập thành công với tài khoản',
      signed_out: 'Đã đăng xuất thành công.',
      copied: 'Đã sao chép token vào bộ nhớ tạm.',
      not_enabled: 'Phương thức này hiện chưa được mở. Vui lòng liên hệ quản trị viên.',
    },
    status: {
      online: 'Hệ Thống Trực Tuyến',
      connected: 'Hệ Thống Trực Tuyến',
      disconnected: 'Mất Kết Nối',
      offline: 'Ngoại Tuyến',
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
    let msg = `Error: ${error}`;
    const lower = error.toLowerCase();
    if (
      lower.includes('denied') ||
      lower.includes('cancel') ||
      lower.includes('permission') ||
      lower.includes('từ chối') ||
      lower.includes('permissions error')
    ) {
      msg = state.lang === 'vi' ? 'Bạn đã hủy yêu cầu đăng nhập.' : 'Sign-in request was cancelled.';
    }
    showToast(msg, 'error');
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
  // Redirect to Auth Service OAuth endpoint with redirect_uri and app_id
  const redirectUri = window.location.origin + '/';
  const appId = state.handshake?.handshake?.appId || state.handshake?.appId || '';
  const targetUrl = `${AUTH_SERVICE_URL}/auth/oauth/${provider}?redirect_uri=${encodeURIComponent(redirectUri)}${appId ? `&app_id=${encodeURIComponent(appId)}` : ''}`;
  window.location.href = targetUrl;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDERS DISCOVERY & SERVICE HANDSHAKE
// ─────────────────────────────────────────────────────────────────────────────
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
  const listEl = document.getElementById('providers-status-list');
  if (listEl) {
    if (!providers || providers.length === 0) {
      listEl.innerHTML = `<div class="provider-skeleton" style="color: var(--text-dim);">No providers available.</div>`;
    } else {
      listEl.innerHTML = providers.map(p => {
        const isEnabled = Boolean(p.enabled);
        const pName = p.name || p.provider;
        return `
          <div class="provider-item" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); margin-bottom: 8px;">
            <span style="font-weight: 500;">${pName}</span>
            <span class="badge ${isEnabled ? 'badge-success' : 'badge-disabled'}">
              ${isEnabled ? 'ACTIVE' : 'DISABLED'}
            </span>
          </div>
        `;
      }).join('');
    }
  }

  // Update button states
  const googleBtn = document.getElementById('btn-oauth-google');
  const fbBtn = document.getElementById('btn-oauth-facebook');

  const googleProv = (providers || []).find(p => (p.provider || '').toLowerCase() === 'google');
  const fbProv = (providers || []).find(p => (p.provider || '').toLowerCase() === 'facebook');

  if (googleBtn) {
    const isGoogleEnabled = Boolean(googleProv && googleProv.enabled);
    googleBtn.style.opacity = isGoogleEnabled ? '1' : '0.6';
    googleBtn.title = isGoogleEnabled ? t('auth.btn_google') : t('toasts.not_enabled');
  }

  if (fbBtn) {
    const isFbEnabled = Boolean(fbProv && fbProv.enabled);
    fbBtn.style.opacity = isFbEnabled ? '1' : '0.6';
    fbBtn.title = isFbEnabled ? t('auth.btn_facebook') : t('toasts.not_enabled');
  }
}

function updateHandshakeUI() {
  const dot = document.getElementById('handshake-dot');
  const text = document.getElementById('handshake-text');

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
