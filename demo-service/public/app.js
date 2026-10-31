/**
 * CLIENT APPLICATION LOGIC
 * Standalone Client Portal: Social Sign In (Google / Facebook) & Developer Sign In (Project 1 Owner)
 * Multi-tenant RBAC: Project 1 App Owner is ADMIN in Project 2, End-users are USER
 * Bilingual: English (EN) and Vietnamese (VI)
 */

const API_BASE = window.location.origin; // http://localhost:3001
const AUTH_SERVICE_URL = 'http://localhost:3000';

const translations = {
  en: {
    nav: {
      brand_title: 'Client Portal',
      brand_tag: 'Online Services',
    },
    auth: {
      title: 'Sign In to Your Account',
      subtitle: 'Select the sign-in method according to your role',
      btn_google: 'Sign in with Google',
      btn_facebook: 'Sign in with Facebook',
    },
    session: {
      title: 'Account Information',
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
      disconnected: 'Disconnected',
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
      subtitle: 'Chọn phương thức phù hợp với vai trò của bạn',
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

    const role = state.user.role || 'USER';
    const isAdmin = role === 'ADMIN';

    // Populate user profile info
    const nameEl = document.getElementById('user-name-display');
    const emailEl = document.getElementById('user-email-display');
    const roleEl = document.getElementById('user-role-display');
    const idEl = document.getElementById('user-id-display');
    const providerEl = document.getElementById('user-provider-display');
    const p1RoleEl = document.getElementById('user-p1-role-display');
    const p2RoleEl = document.getElementById('user-p2-role-display');
    const avatarEl = document.getElementById('user-avatar');
    const tokenEl = document.getElementById('user-token-display');
    const explanationBox = document.getElementById('role-explanation-box');

    if (nameEl) nameEl.textContent = state.user.name || state.user.email?.split('@')[0] || 'User';
    if (emailEl) emailEl.textContent = state.user.email || 'N/A';
    if (idEl) idEl.textContent = state.user.id || state.user.sub || 'N/A';

    if (roleEl) {
      roleEl.textContent = role;
      roleEl.className = isAdmin ? 'user-role-badge badge-admin' : 'user-role-badge badge-user';
      roleEl.style.background = isAdmin ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)';
      roleEl.style.color = isAdmin ? '#10b981' : '#818cf8';
      roleEl.style.borderColor = isAdmin ? 'rgba(16, 185, 129, 0.4)' : 'rgba(99, 102, 241, 0.4)';
    }

    if (providerEl) {
      const p = (state.user.provider || 'OAuth').toUpperCase();
      providerEl.textContent = p;
    }

    if (p1RoleEl) {
      // In Project 1 (BaaS Platform), developers and users are normal users (or admin if platform superadmin)
      p1RoleEl.textContent = state.user.p1Role || (state.user.email === 'admin@example.com' ? 'ADMIN' : 'USER');
    }

    if (p2RoleEl) {
      if (isAdmin) {
        p2RoleEl.textContent = state.lang === 'vi' ? 'ADMIN (Chủ sở hữu Ứng dụng)' : 'ADMIN (App Owner)';
        p2RoleEl.style.background = 'rgba(16, 185, 129, 0.2)';
        p2RoleEl.style.color = '#10b981';
      } else {
        p2RoleEl.textContent = state.lang === 'vi' ? 'USER (Khách hàng vãng lai)' : 'USER (Customer)';
        p2RoleEl.style.background = 'rgba(99, 102, 241, 0.2)';
        p2RoleEl.style.color = '#818cf8';
      }
    }

    if (explanationBox) {
      if (isAdmin) {
        explanationBox.style.background = 'rgba(16, 185, 129, 0.08)';
        explanationBox.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        explanationBox.innerHTML = `
          <div style="color: #10b981; font-weight: 600; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
            <span>👑 Quyền Quản Trị Viên (ADMIN) — Chủ Sở Hữu Ứng Dụng</span>
          </div>
          <div style="color: var(--text-muted); font-size: 12px; line-height: 1.5;">
            Tài khoản này sở hữu Ứng dụng tại Project 1 (Auth Service). Trong phạm vi dịch vụ Project 2, bạn được tự động trao toàn quyền <strong>Quản Trị (ADMIN)</strong>: Có thể xem danh sách toàn bộ đơn hàng của tất cả khách hàng trong hệ thống.
          </div>
        `;
      } else {
        explanationBox.style.background = 'rgba(99, 102, 241, 0.08)';
        explanationBox.style.borderColor = 'rgba(99, 102, 241, 0.3)';
        explanationBox.innerHTML = `
          <div style="color: #818cf8; font-weight: 600; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
            <span>👤 Quyền Khách Hàng (USER) — Người Dùng Vãng Lai</span>
          </div>
          <div style="color: var(--text-muted); font-size: 12px; line-height: 1.5;">
            Bạn đang đăng nhập với tư cách khách hàng của ứng dụng. Bạn chỉ có quyền xem và tạo đơn hàng của riêng tài khoản bạn; không thể xem dữ liệu đơn hàng của người khác.
          </div>
        `;
      }
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

/**
 * Synchronize user profile with Project 2 backend (checks if user is App Owner)
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
          role: data.user.role,
          isAppOwner: data.user.isAppOwner,
        };
        localStorage.setItem('demo_user', JSON.stringify(state.user));
        updateAuthUI();
      }
    }
  } catch (err) {
    console.warn('Failed to sync profile with Project 2:', err.message);
  }
}

/**
 * Handle Developer/Admin Sign-In using Project 1 Auth Service Credentials
 */
async function loginWithDeveloper() {
  const emailInput = document.getElementById('dev-email');
  const passwordInput = document.getElementById('dev-password');
  const btn = document.getElementById('btn-dev-login');

  const email = emailInput?.value.trim();
  const password = passwordInput?.value.trim();

  if (!email || !password) {
    showToast(state.lang === 'vi' ? 'Vui lòng nhập email và mật khẩu' : 'Please enter email and password', 'error');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = state.lang === 'vi' ? 'Đang xác thực...' : 'Authenticating...';
  }

  try {
    const res = await fetch(`${AUTH_SERVICE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || (state.lang === 'vi' ? 'Đăng nhập thất bại' : 'Authentication failed'));
    }

    state.token = data.accessToken;
    state.user = {
      id: data.user?.id,
      email: data.user?.email || email,
      name: data.user?.name || email.split('@')[0],
      p1Role: data.user?.role || 'USER',
      role: 'ADMIN', // Will be confirmed by syncUserProfile()
      provider: 'Password (Project 1)',
    };

    localStorage.setItem('demo_token', state.token);
    localStorage.setItem('demo_user', JSON.stringify(state.user));

    await syncUserProfile();
    updateAuthUI();

    showToast(
      state.lang === 'vi'
        ? `Đăng nhập thành công với vai trò Quản Trị Viên (ADMIN): ${state.user.email}`
        : `Authenticated as App Administrator: ${state.user.email}`,
      'success'
    );
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = state.lang === 'vi' ? 'Đăng Nhập với tư cách Quản Trị Viên (ADMIN)' : 'Sign In as Administrator';
    }
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
    let user = null;
    const email = params.get('email');
    const name = params.get('name');
    const role = params.get('role');
    const provider = params.get('provider');
    const avatar = params.get('avatar');

    try {
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

    // Verify app-level role immediately
    syncUserProfile().then(() => {
      showToast(`${t('toasts.signed_in')} ${state.user?.email || ''}`);
    });
  }
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('demo_token');
  localStorage.removeItem('demo_user');

  const resultBox = document.getElementById('orders-result-box');
  if (resultBox) resultBox.style.display = 'none';

  updateAuthUI();
  showToast(t('toasts.signed_out'));
}

async function fetchOrders() {
  const btn = document.getElementById('btn-fetch-orders');
  const resultBox = document.getElementById('orders-result-box');
  const jsonDisplay = document.getElementById('orders-json-display');
  const badge = document.getElementById('orders-badge');
  const statusLabel = document.getElementById('orders-status-label');

  if (!state.token) {
    showToast(state.lang === 'vi' ? 'Chưa có token xác thực.' : 'Missing authentication token.', 'error');
    return;
  }

  if (btn) btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/orders`, {
      headers: {
        'Authorization': `Bearer ${state.token}`
      }
    });

    const data = await res.json();

    if (resultBox) resultBox.style.display = 'block';

    if (res.ok) {
      if (badge) {
        badge.className = 'badge badge-success';
        badge.textContent = `${res.status} OK`;
      }
      if (statusLabel) {
        const role = data.user?.role || state.user?.role || 'USER';
        statusLabel.textContent = role === 'ADMIN'
          ? (state.lang === 'vi' ? '✓ Xác thực thành công (Quyền ADMIN): Xem toàn bộ đơn hàng của toàn hệ thống Project 2' : '✓ Verified (ADMIN): Viewing all system orders')
          : (state.lang === 'vi' ? '✓ Xác thực thành công (Quyền USER): Hệ thống tự động lọc chỉ trả về đơn hàng cá nhân' : '✓ Verified (USER): Filtered to personal scoped orders');
      }
      showToast(state.lang === 'vi' ? 'Đã gọi API /orders thành công!' : 'API /orders fetched successfully!', 'success');
    } else {
      if (badge) {
        badge.className = 'badge badge-danger';
        badge.textContent = `${res.status} ${res.statusText || 'Error'}`;
      }
      if (statusLabel) statusLabel.textContent = state.lang === 'vi' ? 'Lỗi gọi API:' : 'API Error:';
      showToast(`Lỗi: ${data.message || res.statusText}`, 'error');
    }

    if (jsonDisplay) {
      jsonDisplay.textContent = JSON.stringify(data, null, 2);
    }
  } catch (err) {
    if (resultBox) resultBox.style.display = 'block';
    if (badge) {
      badge.className = 'badge badge-danger';
      badge.textContent = 'Network Error';
    }
    if (jsonDisplay) {
      jsonDisplay.textContent = JSON.stringify({ error: err.message }, null, 2);
    }
    showToast(state.lang === 'vi' ? 'Không thể kết nối đến API /orders.' : 'Failed to connect to API /orders.', 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function createSampleOrder() {
  const btn = document.getElementById('btn-create-order');

  if (!state.token) {
    showToast(state.lang === 'vi' ? 'Chưa có token xác thực.' : 'Missing authentication token.', 'error');
    return;
  }

  const sampleItems = [
    { item: 'Tai nghe không dây Sony WH-1000XM5', price: 349, quantity: 1 },
    { item: 'Chuột không dây Logitech MX Master 3S', price: 99, quantity: 1 },
    { item: 'Bàn phím cơ Keychron Q1 Pro Wireless', price: 219, quantity: 1 },
    { item: 'Màn hình Dell UltraSharp 27 4K USB-C', price: 620, quantity: 1 },
  ];

  const randomItem = sampleItems[Math.floor(Math.random() * sampleItems.length)];

  if (btn) btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify(randomItem)
    });

    const data = await res.json();

    if (res.ok) {
      showToast(
        state.lang === 'vi'
          ? `Đã tạo đơn hàng mới: "${randomItem.item}" ($${randomItem.price})!`
          : `Created order: "${randomItem.item}" ($${randomItem.price})!`,
        'success'
      );
      // Automatically refresh orders list
      await fetchOrders();
    } else {
      showToast(`Lỗi tạo đơn: ${data.message || res.statusText}`, 'error');
    }
  } catch (err) {
    showToast(`Lỗi kết nối: ${err.message}`, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
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
  const bannerAppName = document.getElementById('banner-app-name');
  const bannerAppStatus = document.getElementById('banner-app-status');
  const bannerOwnerEmail = document.getElementById('banner-owner-email');

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
    const appName = state.handshake.handshake?.appName || state.handshake.appName || 'Demo Order Service';
    const appStatus = state.handshake.handshake?.applicationStatus || state.handshake.status || 'ACTIVE';
    const ownerEmail = state.handshake.handshake?.owner?.email || 'user@example.com';

    if (bannerAppName) bannerAppName.textContent = appName;
    if (bannerAppStatus) {
      bannerAppStatus.textContent = appStatus;
      bannerAppStatus.className = appStatus === 'ACTIVE' ? 'badge badge-success' : 'badge badge-danger';
    }
    if (bannerOwnerEmail) bannerOwnerEmail.textContent = ownerEmail;
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
  if (state.token) {
    await syncUserProfile();
  }
});
