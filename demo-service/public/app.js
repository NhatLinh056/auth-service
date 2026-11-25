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
      provider_disabled: 'Currently disabled in Application Settings',
      footer_note: 'Direct authentication via OAuth orchestrated by Auth Service.',
    },
    btn: {
      sign_out: 'Sign Out',
      signing_out: 'Signing out…',
    },
    modal_logout: {
      title: 'Confirm Sign Out',
      body_prefix: 'Are you sure you want to sign out of',
      body_suffix: '?',
      note: 'Your session on this customer portal will end. This sign-out does not affect your active sessions on other applications.',
      btn_cancel: 'Cancel (Esc)',
      btn_confirm: 'Sign Out Now',
    },
    toasts: {
      oauth_redirect: 'Redirecting to sign-in provider...',
      signed_in: 'Welcome back,',
      signed_out: 'Signed out successfully.',
      not_enabled: 'This sign-in method is currently disabled. Please contact the administrator.',
      sync_error: 'Failed to verify session with server. Please retry.',
    },
    status: {
      checking: 'Checking…',
      online: 'System Online',
      connected: 'System Online',
      disconnected: 'Disconnected',
      offline: 'System Offline',
    },
    profile: {
      title: 'Customer Profile (AppUser)',
      user_id: 'User ID (AppUser):',
      provider: 'Provider:',
      role: 'Role:',
      auth_status: 'Auth Status:',
      verified: 'Verified',
      integration_notice_title: 'Integration Successful:',
      integration_notice_desc: 'Demo app is securely connected and authenticated via Auth Service (Project 1) using OAuth 2.0 PKCE.',
    },
    api_test: {
      title: 'Token Verification (Protected API)',
      desc_before: 'Call endpoint',
      desc_after: 'with your session cookie (or Bearer token) to verify access via Auth Service.',
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
      provider_disabled: 'Đang vô hiệu hóa trong Cài đặt Ứng dụng',
      footer_note: 'Xác thực trực tiếp qua luồng OAuth do Auth Service điều phối.',
    },
    btn: {
      sign_out: 'Đăng Xuất',
      signing_out: 'Đang đăng xuất…',
    },
    modal_logout: {
      title: 'Xác Nhận Đăng Xuất',
      body_prefix: 'Bạn có chắc chắn muốn đăng xuất khỏi',
      body_suffix: ' không?',
      note: 'Phiên đăng nhập trên cổng khách hàng này sẽ kết thúc. Việc đăng xuất này không làm mất phiên đăng nhập của bạn trên các ứng dụng khác.',
      btn_cancel: 'Hủy Bỏ (Esc)',
      btn_confirm: 'Đăng Xuất Ngay',
    },
    toasts: {
      oauth_redirect: 'Đang chuyển hướng sang trang đăng nhập...',
      signed_in: 'Chào mừng trở lại,',
      signed_out: 'Đã đăng xuất thành công.',
      not_enabled: 'Phương thức này hiện chưa được mở. Vui lòng liên hệ quản trị viên.',
      sync_error: 'Không thể xác thực phiên đăng nhập với máy chủ. Vui lòng thử lại.',
    },
    status: {
      checking: 'Đang kiểm tra…',
      online: 'Hệ Thống Trực Tuyến',
      connected: 'Hệ Thống Trực Tuyến',
      disconnected: 'Mất Kết Nối',
      offline: 'Ngoại Tuyến',
    },
    profile: {
      title: 'Thông Tin Khách Hàng (AppUser)',
      user_id: 'User ID (AppUser):',
      provider: 'Phương Thức:',
      role: 'Vai Trò:',
      auth_status: 'Xác Thực:',
      verified: 'Đã Xác Thực',
      integration_notice_title: 'Tích Hợp Thành Công:',
      integration_notice_desc: 'Ứng dụng Demo đã kết nối và xác thực an toàn qua Auth Service (Project 1) bằng giao thức OAuth 2.0 PKCE.',
    },
    api_test: {
      title: 'Kiểm Chứng Token (Protected API)',
      desc_before: 'Gọi endpoint',
      desc_after: 'bằng cookie phiên (hoặc Bearer token) để xác thực quyền truy cập qua Auth Service.',
      btn_call: 'Thử Gọi API Bảo Vệ',
    }
  }
};

const state = {
  lang: localStorage.getItem('demo_lang') || 'vi',
  bootPending: false,
  user: null, // Fail-closed: always initialize unauthenticated; authenticated state is rendered only after successful GET /auth/me with cookie
  providers: [],
  handshake: null,
  handshakeStatus: null,
  oauthBusy: false,
  loggingOut: false,
  lastFocusedElement: null,
};

async function waitMinFeedback(startedAt, minMs) {
  if (typeof setTimeout !== 'function') return;
  const remaining = minMs - (Date.now() - startedAt);
  if (remaining > 0) {
    await new Promise(resolve => setTimeout(resolve, remaining));
  }
}

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
  if (typeof setTimeout === 'function') {
    setTimeout(() => {
      toast.classList?.add('is-leaving');
      setTimeout(() => toast.remove(), 200);
    }, 3500);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH & SESSION MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
function updateAuthUI() {
  if (state.bootPending) return;

  const unauthView = document.getElementById('unauth-view');
  const authView = document.getElementById('auth-view');

  if (state.user) {
    if (unauthView) {
      unauthView.hidden = true;
      if (unauthView.style) unauthView.style.display = 'none';
    }
    if (authView) {
      const wasHidden = authView.hidden;
      authView.hidden = false;
      if (authView.style) authView.style.display = 'block';
      if (wasHidden && authView.classList) {
        authView.classList.remove('view-enter');
        void authView.offsetWidth;
        authView.classList.add('view-enter');
      }
    }

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
      const p = (
        state.user.provider ||
        state.user.lastLoginMethod ||
        (Array.isArray(state.user.linkedAccounts) && state.user.linkedAccounts.length === 1
          ? state.user.linkedAccounts[0].provider
          : null) ||
        'OAuth'
      ).toUpperCase();
      providerEl.textContent = p;
      if (p === 'GOOGLE') {
        providerEl.className = 'badge badge-google';
      } else if (p === 'FACEBOOK') {
        providerEl.className = 'badge badge-facebook';
      } else {
        providerEl.className = 'badge badge-neutral';
      }
    }

    const roleEl = document.getElementById('user-role-display');
    const ownerEl = document.getElementById('user-owner-badge');
    if (roleEl) {
      const r = state.user.appRole || state.user.role || 'USER';
      roleEl.textContent = r === 'ADMIN'
        ? 'ADMIN'
        : (state.lang === 'vi' ? 'USER (Khách hàng)' : 'USER (Customer)');
    }
    if (ownerEl) {
      const isOwner = Boolean(state.user.isAppOwner);
      ownerEl.hidden = !isOwner;
      if (ownerEl.style) ownerEl.style.display = isOwner ? 'inline-flex' : 'none';
      ownerEl.textContent = state.lang === 'vi' ? 'Chủ Ứng Dụng' : 'App Owner';
    }

    if (avatarEl) {
      const avatarUrl = state.user.avatar || state.user.avatarUrl;
      if (avatarUrl) {
        avatarEl.replaceChildren?.();
        try {
          const url = new URL(avatarUrl);
          if (url.protocol === 'https:') {
            const img = document.createElement('img');
            img.src = url.href;
            img.alt = 'Avatar';
            img.className = 'user-avatar-img';
            avatarEl.appendChild(img);
          } else {
            avatarEl.textContent = displayName.charAt(0).toUpperCase();
          }
        } catch {
          avatarEl.textContent = displayName.charAt(0).toUpperCase();
        }
      } else {
        const initial = (state.user.name || state.user.email || 'U').charAt(0).toUpperCase();
        avatarEl.textContent = initial;
      }
    }
  } else {
    if (authView) {
      authView.hidden = true;
      if (authView.style) authView.style.display = 'none';
    }
    if (unauthView) {
      const wasHidden = unauthView.hidden;
      unauthView.hidden = false;
      if (unauthView.style) unauthView.style.display = 'block';
      if (wasHidden && unauthView.classList) {
        unauthView.classList.remove('view-enter');
        void unauthView.offsetWidth;
        unauthView.classList.add('view-enter');
      }
    }
  }
}

/**
 * Synchronize user profile with Project 2 backend.
 * Renders user as authenticated ONLY after successful GET /auth/me with cookie.
 * On any failure (401, 5xx, or network error), keeps state unauthenticated (fail-closed).
 */
async function syncUserProfile() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      credentials: 'include',
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.user) {
        state.user = data.user;
        updateAuthUI();
        return state.user;
      }
    }

    // Fail-closed: 401 (unauthenticated guest), 403, or 5xx server failure
    state.user = null;
    updateAuthUI();

    if (res.status >= 500) {
      showToast(t('toasts.sync_error'), 'error');
    }
    return null;
  } catch (err) {
    console.warn('Failed to sync profile with Project 2:', err.message);
    state.user = null;
    updateAuthUI();
    showToast(t('toasts.sync_error'), 'error');
    return null;
  }
}

async function handleUrlCallback() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('error')) {
    const err = params.get('error');
    window.history.replaceState({}, document.title, window.location.pathname);
    showToast(
      err === 'oauth_cancelled'
        ? (state.lang === 'vi' ? 'Đã hủy đăng nhập qua nhà cung cấp.' : 'Sign-in cancelled by user.')
        : (state.lang === 'vi' ? `Đăng nhập qua nhà cung cấp thất bại: ${err}` : `Sign-in failed: ${err}`),
      'error'
    );
  }
}

function openLogoutModal() {
  const modal = document.getElementById('logout-modal');
  if (!modal) return;
  state.lastFocusedElement = document.activeElement || null;
  modal.hidden = false;
  if (modal.style) modal.style.display = 'flex';
  const confirmBtn = document.getElementById('btn-confirm-logout');
  if (confirmBtn && typeof confirmBtn.focus === 'function') {
    confirmBtn.focus();
  }
}

function closeLogoutModal() {
  if (state.loggingOut) return;
  const modal = document.getElementById('logout-modal');
  if (!modal) return;
  modal.hidden = true;
  if (modal.style) modal.style.display = 'none';
  if (state.lastFocusedElement && typeof state.lastFocusedElement.focus === 'function') {
    state.lastFocusedElement.focus();
  }
  state.lastFocusedElement = null;
}

function confirmLogout() {
  return logout();
}

async function logout() {
  if (state.loggingOut) return;
  state.loggingOut = true;
  const confirmBtn = document.getElementById('btn-confirm-logout');
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.textContent = t('btn.signing_out');
  }

  const startedAt = Date.now();
  try {
    const res = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || (state.lang === 'vi' ? 'Đăng xuất thất bại.' : 'Sign out failed.'));
    }

    await waitMinFeedback(startedAt, 380);
    state.user = null;

    const resultEl = document.getElementById('api-test-result');
    const statusEl = document.getElementById('api-test-status');
    if (resultEl) {
      resultEl.hidden = true;
      if (resultEl.style) resultEl.style.display = 'none';
      resultEl.textContent = '';
    }
    if (statusEl) {
      statusEl.className = 'api-status';
      statusEl.textContent = '';
    }

    state.loggingOut = false;
    closeLogoutModal();
    updateAuthUI();
    showToast(t('toasts.signed_out'));
  } catch (err) {
    state.loggingOut = false;
    console.warn('Logout request failed:', err.message);
    showToast(err.message || (state.lang === 'vi' ? 'Đăng xuất thất bại.' : 'Sign out failed.'), 'error');
  } finally {
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = t('modal_logout.btn_confirm');
    }
  }
}

async function testProtectedApi() {
  const statusEl = document.getElementById('api-test-status');
  const resultEl = document.getElementById('api-test-result');
  const btn = document.getElementById('btn-test-protected-api');

  if (!state.user) {
    showToast(state.lang === 'vi' ? 'Vui lòng đăng nhập trước.' : 'Please sign in first.', 'error');
    return;
  }

  if (btn) btn.disabled = true;
  if (statusEl) {
    statusEl.className = 'api-status is-loading';
    statusEl.textContent = state.lang === 'vi' ? 'Đang gọi API...' : 'Calling API...';
  }

  const startedAt = Date.now();
  try {
    const res = await fetch(`${API_BASE}/auth/protected`, {
      credentials: 'include',
    });

    const data = await res.json().catch(() => ({}));
    await waitMinFeedback(startedAt, 260);

    if (resultEl) {
      resultEl.hidden = false;
      if (resultEl.style) resultEl.style.display = 'block';
      const displayData = (res.ok && data && data.user) ? {
        message: data.message,
        authenticated: data.authenticated,
        service: data.service,
        appId: data.appId,
        user: {
          id: data.user.id || data.user.userId,
          email: data.user.email,
        },
        timestamp: data.timestamp,
      } : data;

      resultEl.textContent = JSON.stringify({
        status: res.status,
        statusText: res.statusText,
        data: displayData,
      }, null, 2);
    }

    const setStatusBadge = (statusClass, text) => {
      if (!statusEl) return;
      statusEl.className = `api-status ${statusClass}`;
      statusEl.textContent = text;
    };

    if (res.ok) {
      const okLabel = state.lang === 'vi' ? 'Đã xác thực' : 'Verified';
      setStatusBadge('is-success', `HTTP ${res.status} OK (${okLabel})`);
      showToast(state.lang === 'vi' ? 'Xác thực API bảo vệ thành công!' : 'Protected API verified successfully!');
    } else if (res.status === 403) {
      setStatusBadge('is-error', `HTTP 403 (${data.message || (state.lang === 'vi' ? 'Truy cập bị từ chối' : 'Access denied')})`);
      showToast(data.message || (state.lang === 'vi' ? 'Truy cập bị từ chối' : 'Access denied'), 'error');
    } else {
      setStatusBadge('is-error', `HTTP ${res.status} (${data.message || (state.lang === 'vi' ? 'Lỗi' : 'Error')})`);
      showToast(data.message || 'API error', 'error');
    }
  } catch (err) {
    if (statusEl) {
      statusEl.className = 'api-status is-error';
      statusEl.textContent = 'Network Error';
    }
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
  const googleBtn = document.getElementById('btn-oauth-google');
  const fbBtn = document.getElementById('btn-oauth-facebook');
  if (googleBtn) googleBtn.disabled = true;
  if (fbBtn) fbBtn.disabled = true;
  try {
    showToast(t('toasts.oauth_redirect'));
    window.location.assign(`${API_BASE}/auth/login/${encodeURIComponent(provider.toLowerCase())}`);
  } catch (error) {
    state.oauthBusy = false;
    renderProvidersList(state.providers);
    showToast(error.message || 'Không thể mở trang đăng nhập.', 'error');
  }
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
  const googleNote = document.getElementById('google-disabled-note');
  const fbNote = document.getElementById('facebook-disabled-note');

  const googleProv = (providers || []).find(p => (p.provider || '').toLowerCase() === 'google');
  const fbProv = (providers || []).find(p => (p.provider || '').toLowerCase() === 'facebook');

  if (googleBtn) {
    const isGoogleEnabled = Boolean(googleProv && googleProv.enabled);
    googleBtn.disabled = !isGoogleEnabled;
    if (googleBtn.style) googleBtn.style.opacity = isGoogleEnabled ? '1' : '0.45';
    googleBtn.title = isGoogleEnabled ? t('auth.btn_google') : t('toasts.not_enabled');
    if (googleNote) {
      googleNote.hidden = isGoogleEnabled;
      if (googleNote.style) googleNote.style.display = isGoogleEnabled ? 'none' : 'block';
    }
  }

  if (fbBtn) {
    const isFbEnabled = Boolean(fbProv && fbProv.enabled);
    fbBtn.disabled = !isFbEnabled;
    if (fbBtn.style) fbBtn.style.opacity = isFbEnabled ? '1' : '0.45';
    fbBtn.title = isFbEnabled ? t('auth.btn_facebook') : t('toasts.not_enabled');
    if (fbNote) {
      fbNote.hidden = isFbEnabled;
      if (fbNote.style) fbNote.style.display = isFbEnabled ? 'none' : 'block';
    }
  }
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeLogoutModal();
  }
});

function updateHandshakeUI() {
  const pill = document.getElementById('handshake-pill');
  const dot = document.getElementById('handshake-dot');
  const bannerDot = document.getElementById('banner-status-dot');
  const text = document.getElementById('handshake-text');
  const bannerAppName = document.getElementById('banner-app-name');
  const bannerAppStatus = document.getElementById('banner-app-status');
  const logoutModalAppName = document.getElementById('logout-modal-app-name');

  const statusClass = state.handshakeStatus === 'CONNECTED'
    ? 'is-online'
    : state.handshakeStatus === null
    ? 'is-checking'
    : 'is-offline';

  if (pill) pill.className = `status-pill ${statusClass}`;
  if (dot) dot.className = `status-dot ${statusClass}`;
  if (bannerDot) bannerDot.className = `app-status-dot ${statusClass}`;

  if (text) {
    if (state.handshakeStatus === 'CONNECTED') text.textContent = t('status.online');
    else if (state.handshakeStatus === 'OFFLINE') text.textContent = t('status.offline');
    else if (state.handshakeStatus === null) text.textContent = t('status.checking');
    else text.textContent = t('status.disconnected');
  }

  if (state.handshake) {
    const appName = state.handshake.handshake?.appName || state.handshake.appName || 'Demo Service';
    const appStatus = state.handshake.handshake?.applicationStatus || state.handshake.status || 'ACTIVE';

    if (bannerAppName) bannerAppName.textContent = appName;
    if (logoutModalAppName) logoutModalAppName.textContent = appName;
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
  const startedAt = Date.now();
  state.bootPending = true;
  setLanguage(state.lang);
  await handleUrlCallback();

  await Promise.allSettled([
    checkHandshake(),
    refreshProviders(),
    syncUserProfile(),
  ]);

  await waitMinFeedback(startedAt, 380);

  const bootView = document.getElementById('boot-loading-view');
  if (bootView) {
    bootView.classList?.add('is-leaving');
    if (typeof setTimeout === 'function') {
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    bootView.hidden = true;
  }

  state.bootPending = false;
  updateAuthUI();
});
