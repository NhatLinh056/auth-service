function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/**
 * CLIENT APPLICATION LOGIC — DEMO SERVICE (PROJECT 2)
 * Clean, modern customer portal with seamless social authentication (Google & Facebook).
 * Role-based access control:
 * - App Owner / Delegated Admin: ADMIN (manages all system orders)
 * - Regular Customer: USER (manages personal orders)
 */

const API_BASE = window.location.origin; // http://localhost:3001

const translations = {
  en: {
    nav: {
      brand_title: 'Customer Portal',
      brand_tag: 'Order Services',
    },
    auth: {
      title: 'Sign In to Your Account',
      subtitle: 'Fast and secure sign-in with your social account',
      btn_google: 'Sign in with Google',
      btn_facebook: 'Sign in with Facebook',
    },
    btn: {
      copy: 'Copy Token',
      sign_out: 'Sign Out',
    },
    toasts: {
      oauth_redirect: 'Redirecting to sign-in provider...',
      signed_in: 'Welcome back,',
      signed_out: 'Signed out successfully.',
      copied: 'Token copied to clipboard.',
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
      brand_tag: 'Dịch Vụ Đơn Hàng',
    },
    auth: {
      title: 'Đăng Nhập Tài Khoản',
      subtitle: 'Đăng nhập nhanh chóng và bảo mật qua mạng xã hội',
      btn_google: 'Đăng nhập bằng Google',
      btn_facebook: 'Đăng nhập bằng Facebook',
    },
    btn: {
      copy: 'Sao Chép Token',
      sign_out: 'Đăng Xuất',
    },
    toasts: {
      oauth_redirect: 'Đang chuyển hướng sang trang đăng nhập...',
      signed_in: 'Chào mừng trở lại,',
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
  orders: [],
  showJsonView: false,
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
    const avatarEl = document.getElementById('user-avatar');
    const tokenEl = document.getElementById('user-token-display');
    const explanationBox = document.getElementById('role-explanation-box');

    if (nameEl) nameEl.textContent = state.user.name || state.user.email?.split('@')[0] || 'User';
    if (emailEl) emailEl.textContent = state.user.email || 'N/A';
    if (idEl) idEl.textContent = state.user.id || state.user.sub || 'N/A';

    if (roleEl) {
      if (isAdmin) {
        roleEl.textContent = state.lang === 'vi' ? 'Quản Trị Viên' : 'Administrator';
        roleEl.style.background = 'rgba(16, 185, 129, 0.2)';
        roleEl.style.color = '#10b981';
        roleEl.style.border = '1px solid rgba(16, 185, 129, 0.4)';
      } else {
        roleEl.textContent = state.lang === 'vi' ? 'Khách Hàng' : 'Customer';
        roleEl.style.background = 'rgba(99, 102, 241, 0.2)';
        roleEl.style.color = '#818cf8';
        roleEl.style.border = '1px solid rgba(99, 102, 241, 0.4)';
      }
    }

    if (providerEl) {
      const p = (state.user.provider || 'OAuth').toUpperCase();
      providerEl.textContent = p;
    }

    if (explanationBox) {
      if (isAdmin) {
        explanationBox.style.background = 'rgba(16, 185, 129, 0.08)';
        explanationBox.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        explanationBox.innerHTML = `
          <div style="color: #10b981; font-weight: 600; margin-bottom: 2px;">
            Quản Trị Viên (ADMIN)
          </div>
          <div style="color: var(--text-muted); font-size: 12px;">
            Tài khoản của bạn được cấp quyền Quản Trị Viên. Bạn có thể xem và quản lý danh sách toàn bộ đơn hàng trong hệ thống.
          </div>
        `;
      } else {
        explanationBox.style.background = 'rgba(99, 102, 241, 0.08)';
        explanationBox.style.borderColor = 'rgba(99, 102, 241, 0.3)';
        explanationBox.innerHTML = `
          <div style="color: #818cf8; font-weight: 600; margin-bottom: 2px;">
            Khách Hàng (USER)
          </div>
          <div style="color: var(--text-muted); font-size: 12px;">
            Chào mừng bạn! Dưới đây là danh sách các đơn hàng cá nhân của bạn.
          </div>
        `;
      }
    }

    if (avatarEl) {
      if (state.user.avatar) {
        avatarEl.replaceChildren();
        try {
          const url = new URL(state.user.avatar);
          if (url.protocol === 'https:') {
            const img = document.createElement('img');
            img.src = url.href; img.alt = 'Avatar';
            img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%';
            avatarEl.appendChild(img);
          }
        } catch { avatarEl.textContent = '?'; }
      } else {
        const initial = (state.user.name || state.user.email || 'U').charAt(0).toUpperCase();
        avatarEl.textContent = initial;
      }
    }

    if (tokenEl) tokenEl.textContent = state.token;

    // Tự động tải đơn hàng
    fetchOrders();
  } else {
    if (unauthView) unauthView.style.display = 'block';
    if (authView) authView.style.display = 'none';
  }
}

/**
 * Synchronize user profile with Project 2 backend (checks role)
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

async function handleUrlCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const oauthError = params.get('error');
  window.history.replaceState({}, document.title, window.location.pathname);
  if (oauthError) {
    sessionStorage.removeItem('oauth_verifier');
    showToast(oauthError === 'oauth_not_ready'
      ? (state.lang === 'vi'
        ? 'Đăng nhập chưa sẵn sàng. Kiểm tra OAuth redirect URI, Client ID/Secret và trạng thái provider trong Developer Console.'
        : 'Sign-in is not ready. Check the OAuth redirect URI, Client ID/Secret and provider status in Developer Console.')
      : (state.lang === 'vi' ? 'Đăng nhập chưa hoàn tất. Vui lòng thử lại.' : 'Sign-in did not complete. Please try again.'), 'error');
    return;
  }
  if (!code) return;
  const verifier = sessionStorage.getItem('oauth_verifier');
  sessionStorage.removeItem('oauth_verifier');
  try {
    if (!verifier) throw new Error('Sign-in session expired. Please sign in again.');
    const response = await fetch(`${API_BASE}/auth/exchange`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, verifier }),
    });
    if (!response.ok) throw new Error('Sign-in exchange failed. Please sign in again.');
    const result = await response.json();
    state.token = result.accessToken;
    state.user = result.user;
    localStorage.setItem('demo_token', state.token);
    localStorage.setItem('demo_user', JSON.stringify(state.user));
    await syncUserProfile();
    updateAuthUI();
    showToast(t('toasts.signed_in'));
  } catch (error) { showToast(error.message, 'error'); }
}

function logout() {
  state.token = null;
  state.user = null;
  state.orders = [];
  localStorage.removeItem('demo_token');
  localStorage.removeItem('demo_user');

  updateAuthUI();
  showToast(t('toasts.signed_out'));
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS MANAGEMENT & TABLE RENDERING
// ─────────────────────────────────────────────────────────────────────────────
function renderOrdersTable(orders, isAdmin) {
  const tbody = document.getElementById('orders-table-body');
  const subtitle = document.getElementById('orders-subtitle');
  if (!tbody) return;

  if (subtitle) {
    if (isAdmin) {
      subtitle.textContent = state.lang === 'vi'
        ? `Đang hiển thị toàn bộ ${orders.length} đơn hàng trên hệ thống (Quyền Quản Trị Viên).`
        : `Showing all ${orders.length} orders across the system (Administrator view).`;
    } else {
      subtitle.textContent = state.lang === 'vi'
        ? `Bạn có ${orders.length} đơn hàng.`
        : `You have ${orders.length} orders.`;
    }
  }

  if (!orders || orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="table-empty" style="text-align: center; padding: 32px 16px; color: var(--text-dim);">
          <div style="font-size: 13px; font-weight: 500; color: var(--text-muted); margin-bottom: 4px;">
            ${state.lang === 'vi' ? 'Chưa có đơn hàng nào' : 'No orders found'}
          </div>
          <div style="font-size: 12px; color: var(--text-dim);">
            ${state.lang === 'vi' ? 'Bấm nút "+ Đặt Hàng Thử Nghiệm" ở trên để tạo đơn hàng mới.' : 'Click "+ Place Sample Order" to create one.'}
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = orders.map(o => {
    let badgeClass = 'badge';
    let badgeStyle = 'background: rgba(148, 163, 184, 0.15); color: #cbd5e1;';
    if (o.status === 'CONFIRMED') {
      badgeStyle = 'background: rgba(99, 102, 241, 0.15); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.3);';
    } else if (o.status === 'SHIPPED') {
      badgeStyle = 'background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);';
    } else if (o.status === 'PENDING') {
      badgeStyle = 'background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3);';
    }

    const isMine = o.userEmail === state.user?.email;
    const customerDisplay = isMine
      ? `<span style="color: #67e8f9; font-weight: 500;">${escapeHtml(o.userEmail)} <small style="color: var(--text-dim);">(Bạn)</small></span>`
      : `<span style="color: var(--text-muted);">${escapeHtml(o.userEmail)}</span>`;

    return `
      <tr>
        <td style="font-family: var(--font-mono); font-size: 12px; color: var(--text-dim);">${escapeHtml(o.id)}</td>
        <td style="font-weight: 500; color: #fff;">${escapeHtml(o.item)}</td>
        <td style="text-align: center; color: var(--text-muted);">${escapeHtml(o.quantity)}</td>
        <td style="text-align: right; font-weight: 600; color: #34d399;">$${(o.totalPrice || 0).toLocaleString()}</td>
        <td style="font-size: 12px;">${customerDisplay}</td>
        <td style="text-align: center;">
          <span class="badge" style="${badgeStyle} font-size: 10px; font-weight: 600; padding: 2px 8px;">
            ${escapeHtml(o.status)}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

async function fetchOrders() {
  const btn = document.getElementById('btn-fetch-orders');
  const jsonDisplay = document.getElementById('orders-json-display');

  if (!state.token) return;

  if (btn) btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/orders`, {
      headers: {
        'Authorization': `Bearer ${state.token}`
      }
    });

    const data = await res.json();

    if (res.ok) {
      state.orders = Array.isArray(data.orders) ? data.orders : [];
      const isAdmin = (data.user?.role || state.user?.role) === 'ADMIN';
      renderOrdersTable(state.orders, isAdmin);

      if (jsonDisplay) {
        jsonDisplay.textContent = JSON.stringify(data, null, 2);
      }
    } else {
      showToast(`Lỗi: ${data.message || res.statusText}`, 'error');
    }
  } catch (err) {
    showToast(`Không thể kết nối đến máy chủ: ${err.message}`, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function createSampleOrder() {
  const btn = document.getElementById('btn-create-order');

  if (!state.token) {
    showToast('Vui lòng đăng nhập để tạo đơn hàng', 'error');
    return;
  }

  const sampleItems = [
    { item: 'Tai nghe Sony WH-1000XM5', price: 349, quantity: 1 },
    { item: 'Chuột không dây Logitech MX Master 3S', price: 99, quantity: 1 },
    { item: 'Bàn phím cơ Keychron Q1 Pro', price: 219, quantity: 1 },
    { item: 'Màn hình Dell UltraSharp 27 4K', price: 620, quantity: 1 },
    { item: 'iPad Pro 11 inch M4 Wi-Fi', price: 999, quantity: 1 },
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
          ? `Đã đặt thành công: "${randomItem.item}" ($${randomItem.price})!`
          : `Placed order: "${randomItem.item}" ($${randomItem.price})!`,
        'success'
      );
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

function toggleJsonView() {
  state.showJsonView = !state.showJsonView;
  const box = document.getElementById('orders-result-box');
  const btnText = document.getElementById('btn-toggle-json-text');

  if (box) {
    box.style.display = state.showJsonView ? 'block' : 'none';
  }
  if (btnText) {
    btnText.textContent = state.showJsonView
      ? '{ } Ẩn Dữ Liệu API (JSON)'
      : '{ } Xem Dữ Liệu API (JSON)';
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
async function loginWithOAuth(provider) {
  const provConfig = state.providers.find(p => (p.provider || '').toLowerCase() === provider.toLowerCase());

  if (provConfig && !provConfig.enabled) {
    showToast(t('toasts.not_enabled'), 'error');
    return;
  }

  showToast(t('toasts.oauth_redirect'));
  const verifier = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
  sessionStorage.setItem('oauth_verifier', verifier);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const targetUrl = `${API_BASE}/auth/start/${provider}?code_challenge=${encodeURIComponent(challenge)}`;
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
