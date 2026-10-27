/**
 * AUTH SERVICE — DEVELOPER & ADMIN CONSOLE LOGIC
 * High-performance, clean UI logic using native ES6 (zero dependencies)
 * Multi-language support: English (EN) and Vietnamese (VI)
 */

const API_BASE = window.location.origin;

// ─────────────────────────────────────────────────────────────────────────────
// I18N DICTIONARY
// ─────────────────────────────────────────────────────────────────────────────
const translations = {
  en: {
    nav: {
      console: 'Console',
      overview: 'Overview',
      apps: 'Applications',
      users: 'Users',
      providers: 'Sign-in Methods',
      api_online: 'API Online',
      logout: 'Logout',
      signin: 'Sign In',
      register: 'Register',
    },
    overview: {
      title: 'Overview',
      subtitle: 'Central authentication and application management service.',
      apps_label: 'Applications',
      apps_hint: 'Registered client applications',
      identity_label: 'Current Identity',
      not_auth: 'Not Authenticated',
      signin_hint: 'Sign in to manage credentials',
      role_prefix: 'Role: ',
      status_label: 'Service Status',
      online: 'Online',
      status_hint: 'AppAuthGuard & JWT Active',
      recent_title: 'Recent Applications',
      view_all: 'View All Applications →',
      empty_recent: 'No applications found. Please sign in or create an application.',
    },
    guide: {
      title: 'How Other Microservices Connect To Auth Service',
      subtitle: '3 simple steps for any client microservice to authenticate with Auth Service using AppID & AppToken.',
      ready_pill: 'Status: Ready to Connect',
      step1_title: 'Get AppID & AppToken',
      step1_desc: 'Create an app in the "Applications" tab above. Copy AppID and AppToken into your client microservice configuration file (.env).',
      step2_title: 'Send 2 HTTP Headers',
      step2_desc: 'Whenever calling Auth Service, automatically attach X-App-Id and X-App-Token headers to your requests.',
      step3_title: 'Auth Service Authorizes Request',
      step3_desc: 'AppAuthGuard verifies credentials against PostgreSQL. If valid and ACTIVE, request is approved with 200 OK.',
    },
    apps: {
      title: 'Applications',
      subtitle: 'Manage client application credentials for microservice inter-service authentication.',
      create_btn: '+ Create Application',
      loading: 'Loading applications...',
      empty: 'No applications found. Create your first application to generate credentials.',
      empty_unauth: 'Please sign in to view and manage registered applications.',
      goto_providers_title: 'Configure Sign-in Methods for this application',
      btn_providers: 'Sign-in Methods',
    },
    providers: {
      title: 'Sign-in Methods',
      subtitle: 'Configure OAuth 2.0 identity providers (Google, Facebook) independently per application.',
      info_title: 'OAuth 2.0 & Identity Providers',
      info_desc: 'Client microservices and frontends discover available providers via public API GET /auth/providers.',
      oauth_ready: 'OAuth 2.0 Engine: Ready',
      table_provider: 'Provider',
      table_client_id: 'Client ID',
      table_secret: 'Client Secret',
      table_callback: 'Authorized Callback URI',
      loading: 'Loading providers...',
      not_configured: '(Not configured)',
      secret_set: 'Configured',
      secret_none: 'Not set',
      configure: 'Configure',
      enable: 'Enable',
      disable: 'Disable',
      toggle_success: 'Provider status updated.',
      config_saved: 'Provider configuration saved successfully.',
      target_app_label: 'Target Application',
      target_app_sublabel: 'Select client application to manage its independent OAuth 2.0 sign-in methods',
      no_apps: 'No applications found. Please create an application in Applications tab first.',
      status_enabled: 'ENABLED',
      status_disabled: 'DISABLED',
    },
    provider_modal: {
      title: 'Configure Provider',
      desc: 'Set Client ID and Client Secret from Developer Console (Google Cloud or Meta for Developers).',
      client_id: 'Client ID',
      client_id_placeholder: 'e.g. 123456789-abcdef.apps.googleusercontent.com',
      client_secret: 'Client Secret',
      client_secret_placeholder: 'Enter new secret (leave blank to keep current)',
      secret_hint: 'Secret is securely stored on server. Leave blank to keep existing configured secret.',
      callback_label: 'Authorized Redirect URI (Copy this to Developer Console)',
      enable_label: 'Enable this sign-in method',
      portal_btn: 'Open Developer Console',
    },
    table: {
      user_id: 'User ID',
      email: 'Email',
      name: 'Name',
      app_name: 'Application Name',
      user_name: 'Full Name',
      appid: 'App ID',
      status: 'Status',
      owner: 'Owner',
      created: 'Created',
      actions: 'Actions',
      role: 'Role',
      details: 'Details',
      deactivate: 'Disable',
      activate: 'Enable',
      delete: 'Delete',
      assign_role: 'Assign Role',
      status_active: 'ACTIVE',
      status_inactive: 'INACTIVE',
      role_admin: 'ADMIN',
      role_user: 'USER',
      copy_appid: 'Copy AppID',
    },
    users: {
      title: 'User Management',
      subtitle: 'Role-based access control (RBAC) and user directory.',
      refresh: 'Refresh',
      loading: 'Loading users...',
      search_placeholder: 'Search by email, name...',
    },
    filter: {
      search_apps: 'Search by name, App ID, owner...',
      search_users: 'Search by email, name...',
      all_statuses: 'All Statuses',
      status_active: 'ACTIVE',
      status_inactive: 'INACTIVE',
      all_roles: 'All Roles',
      role_admin: 'ADMIN',
      role_user: 'USER',
      sort_newest: 'Newest First',
      sort_oldest: 'Oldest First',
      sort_name_asc: 'Name: A → Z',
      sort_name_desc: 'Name: Z → A',
      sort_email_asc: 'Email: A → Z',
      sort_email_desc: 'Email: Z → A',
      sort_role_admin_first: 'Role: Admin First',
      showing_apps: 'Showing {count} of {total} applications',
      showing_users: 'Showing {count} of {total} users',
      no_matches: 'No matching records found.',
      clear_filter: 'Clear Filters',
      filter_apps_select: 'Filter project...',
      apps_unit: 'apps',
    },
    detail: {
      title: 'Application Details',
      desc: 'Application details and security credentials.',
      appid_label: 'App ID (Public Identifier)',
      token_label: 'App Token (Service Secret)',
      token_hint: 'Used by client microservices via X-App-Token header. Keep this secret.',
      copy: 'Copy',
      reveal: 'Reveal',
      hide: 'Hide',
      regenerate: 'Regenerate Token',
      toggle_status: 'Toggle Status',
      sdk_setup: 'SDK Setup & Configuration',
      sdk_desc: 'Copy pre-configured credentials directly into your client microservice:',
      copy_snippet: 'Copy Snippet',
    },
    login: {
      title: 'Sign In',
      desc: 'Enter your credentials to access the console.',
      email: 'Email Address',
      password: 'Password',
    },
    register: {
      title: 'Create Account',
      desc: 'Register a new user account on the Auth Service.',
      name: 'Full Name',
      name_placeholder: 'John Doe',
      password: 'Password (min 6 characters)',
    },
    auth_screen: {
      subtitle: 'Developer & Admin Console',
      tab_signin: 'Sign In',
      tab_register: 'Create Account',
      signin_btn: 'Sign In to Console',
      register_btn: 'Create Account & Sign In',
      demo_title: 'Demo Admin Account',
      quick_fill: 'Quick Fill',
      or_divider: 'OR CONTINUE WITH',
      oauth_google: 'Sign in with Google',
      oauth_facebook: 'Sign in with Facebook',
    },
    create_app: {
      title: 'Create Application',
      desc: 'Register a new client application to generate AppID and AppToken credentials.',
      name_label: 'Application Name',
      placeholder: 'e.g. Order Service, Payment Gateway',
    },
    role_modal: {
      title: 'Assign User Role',
      desc_prefix: 'Update role for:',
      select_label: 'Select Role',
    },
    modal: {
      cancel: 'Cancel',
      close: 'Close',
      save: 'Save Changes',
    },
    toasts: {
      signed_in: 'Signed in as',
      signed_out: 'Signed out successfully',
      reg_success: 'Registration successful. Signing in...',
      copied: 'Copied',
      to_clipboard: 'to clipboard.',
      copy_fail: 'Failed to copy to clipboard',
      app_created: 'created successfully.',
      app_deleted: 'deleted.',
      status_updated: 'Status updated to',
      token_regenerated: 'New AppToken generated successfully.',
      confirm_delete: 'Are you sure you want to delete application',
      confirm_regenerate: 'Are you sure you want to regenerate the AppToken for',
    }
  },
  vi: {
    nav: {
      console: 'Bảng Điều Khiển',
      overview: 'Tổng Quan',
      apps: 'Quản Lý Ứng Dụng',
      users: 'Người Dùng',
      providers: 'Phương Thức Đăng Nhập',
      api_online: 'API Hoạt Động',
      logout: 'Đăng Xuất',
      signin: 'Đăng Nhập',
      register: 'Đăng Ký',
    },
    overview: {
      title: 'Tổng Quan',
      subtitle: 'Dịch vụ xác thực trung tâm và quản lý ứng dụng liên thông.',
      apps_label: 'Ứng Dụng Đã Tạo',
      apps_hint: 'Ứng dụng client đã đăng ký trong hệ thống',
      identity_label: 'Định Danh Hiện Tại',
      not_auth: 'Chưa Đăng Nhập',
      signin_hint: 'Đăng nhập để quản lý định danh ứng dụng',
      role_prefix: 'Vai trò: ',
      status_label: 'Trạng Thái Dịch Vụ',
      online: 'Trực Tuyến',
      status_hint: 'AppAuthGuard & JWT đang hoạt động',
      recent_title: 'Ứng Dụng Gần Đây',
      view_all: 'Xem Tất Cả Ứng Dụng →',
      empty_recent: 'Chưa có ứng dụng nào. Vui lòng đăng nhập hoặc tạo ứng dụng mới.',
    },
    guide: {
      title: 'Cách Microservice Khác Kết Nối Tới Auth Service',
      subtitle: 'Quy trình 3 bước đơn giản để bất kỳ microservice nào (như Demo Service, Billing,...) xác thực bảo mật qua AppID & AppToken.',
      ready_pill: 'Cơ Chế AppAuth: Sẵn Sàng',
      step1_title: 'Lấy AppID & AppToken',
      step1_desc: 'Tạo ứng dụng trong tab "Ứng Dụng", sao chép AppID và AppToken dán vào file cấu hình (.env) của microservice.',
      step2_title: 'Gửi Kèm 2 Header HTTP',
      step2_desc: 'Khi microservice gọi bất kỳ API nào tới Auth Service, gắn kèm 2 header chứng thực vào HTTP Request.',
      step3_title: 'Auth Service Tự Động Phê Duyệt',
      step3_desc: 'AppAuthGuard đối soát DB PostgreSQL. Nếu token hợp lệ và trạng thái BẬT (ACTIVE), yêu cầu được phê duyệt ngay.',
    },
    apps: {
      title: 'Quản Lý Ứng Dụng',
      subtitle: 'Quản lý thông tin định danh (AppID và AppToken) phục vụ giao tiếp bảo mật giữa các microservice.',
      create_btn: '+ Tạo Ứng Dụng Mới',
      loading: 'Đang tải danh sách ứng dụng...',
      empty: 'Chưa có ứng dụng nào. Hãy tạo ứng dụng đầu tiên để sinh cặp khóa AppID và AppToken.',
      empty_unauth: 'Vui lòng đăng nhập để xem và quản lý danh sách ứng dụng của bạn.',
      goto_providers_title: 'Cấu hình phương thức đăng nhập cho ứng dụng này',
      btn_providers: 'Phương thức Auth',
    },
    providers: {
      title: 'Phương Thức Đăng Nhập',
      subtitle: 'Cấu hình các nhà cung cấp định danh OAuth 2.0 (Google, Facebook) độc lập cho từng ứng dụng.',
      info_title: 'Cấu Hình Định Danh SSO & OAuth 2.0',
      info_desc: 'Client microservices và frontends phát hiện các nhà cung cấp khả dụng qua API công khai GET /auth/providers.',
      oauth_ready: 'Bộ máy OAuth 2.0: Sẵn Sàng',
      table_provider: 'Nhà Cung Cấp',
      table_client_id: 'Client ID',
      table_secret: 'Client Secret',
      table_callback: 'URI Phản Hồi Ủy Quyền (Callback)',
      loading: 'Đang tải danh sách nhà cung cấp...',
      not_configured: '(Chưa cấu hình)',
      secret_set: 'Đã lưu secret',
      secret_none: 'Chưa có secret',
      configure: 'Cấu hình',
      enable: 'Bật',
      disable: 'Tắt',
      toggle_success: 'Đã cập nhật trạng thái nhà cung cấp.',
      config_saved: 'Đã lưu cấu hình nhà cung cấp thành công.',
      target_app_label: 'Dự Án / Ứng Dụng Đang Chọn',
      target_app_sublabel: 'Chọn ứng dụng để cấu hình các phương thức đăng nhập OAuth 2.0 độc lập',
      no_apps: 'Chưa có ứng dụng nào. Vui lòng tạo ứng dụng trong tab Quản Lý Ứng Dụng trước.',
      status_enabled: 'ĐÃ BẬT',
      status_disabled: 'ĐÃ TẮT',
    },
    provider_modal: {
      title: 'Cấu Hình Nhà Cung Cấp',
      desc: 'Điền Client ID và Client Secret từ Developer Console (Google Cloud hoặc Meta for Developers).',
      client_id: 'Client ID',
      client_id_placeholder: 'Ví dụ: 123456789-abcdef.apps.googleusercontent.com',
      client_secret: 'Client Secret',
      client_secret_placeholder: 'Nhập secret mới (để trống nếu muốn giữ nguyên)',
      secret_hint: 'Secret được lưu trữ bảo mật trên server. Để trống ô này nếu muốn giữ nguyên secret đã lưu trước đó.',
      callback_label: 'Authorized Redirect URI (Sao chép URL này vào Developer Console)',
      enable_label: 'Kích hoạt phương thức đăng nhập này cho ứng dụng',
      portal_btn: 'Mở Developer Console',
    },
    table: {
      user_id: 'Mã Người Dùng',
      email: 'Địa Chỉ Email',
      name: 'Tên',
      app_name: 'Tên Ứng Dụng',
      user_name: 'Họ Và Tên',
      appid: 'Mã App ID',
      status: 'Trạng Thái',
      owner: 'Chủ Sở Hữu',
      created: 'Ngày Tạo',
      actions: 'Thao Tác',
      role: 'Vai Trò',
      details: 'Chi Tiết',
      deactivate: 'Tắt',
      activate: 'Bật',
      delete: 'Xóa',
      assign_role: 'Phân Quyền',
      status_active: 'HOẠT ĐỘNG',
      status_inactive: 'VÔ HIỆU HÓA',
      role_admin: 'QUẢN TRỊ VIÊN',
      role_user: 'NGƯỜI DÙNG',
      copy_appid: 'Sao chép AppID',
    },
    users: {
      title: 'Quản Trị Người Dùng',
      subtitle: 'Quản lý phân quyền theo vai trò (RBAC) và danh sách tài khoản trong hệ thống.',
      refresh: 'Làm Mới',
      loading: 'Đang tải danh sách người dùng...',
      search_placeholder: 'Tìm kiếm theo email, họ tên...',
    },
    filter: {
      search_apps: 'Tìm kiếm theo tên, App ID, chủ sở hữu...',
      search_users: 'Tìm kiếm theo email, họ tên...',
      all_statuses: 'Tất Cả Trạng Thái',
      status_active: 'HOẠT ĐỘNG',
      status_inactive: 'VÔ HIỆU HÓA',
      all_roles: 'Tất Cả Vai Trò',
      role_admin: 'QUẢN TRỊ VIÊN',
      role_user: 'NGƯỜI DÙNG',
      sort_newest: 'Mới nhất trước',
      sort_oldest: 'Cũ nhất trước',
      sort_name_asc: 'Tên: A → Z',
      sort_name_desc: 'Tên: Z → A',
      sort_email_asc: 'Email: A → Z',
      sort_email_desc: 'Email: Z → A',
      sort_role_admin_first: 'Vai trò: Admin trước',
      showing_apps: 'Hiển thị {count} / {total} ứng dụng',
      showing_users: 'Hiển thị {count} / {total} người dùng',
      no_matches: 'Không tìm thấy kết quả phù hợp.',
      clear_filter: 'Xóa bộ lọc',
      filter_apps_select: 'Lọc nhanh dự án...',
      apps_unit: 'ứng dụng',
    },
    detail: {
      title: 'Chi Tiết Ứng Dụng',
      desc: 'Thông tin chi tiết và khóa bảo mật ứng dụng.',
      appid_label: 'App ID (Mã Định Danh Công Khai)',
      token_label: 'App Token (Mã Bí Mật Dịch Vụ)',
      token_hint: 'Được các microservice client sử dụng qua header X-App-Token. Hãy giữ bí mật mã này.',
      copy: 'Sao Chép',
      reveal: 'Hiện',
      hide: 'Ẩn',
      regenerate: 'Cấp Lại Token',
      toggle_status: 'Đổi Trạng Thái',
      sdk_setup: 'Cấu Hình & Tích Hợp Microservice (SDK)',
      sdk_desc: 'Sao chép đoạn mã cấu hình đã điền sẵn vào microservice client của bạn:',
      copy_snippet: 'Sao Chép Mã',
    },
    login: {
      title: 'Đăng Nhập',
      desc: 'Nhập thông tin tài khoản để truy cập bảng điều khiển.',
      email: 'Địa Chỉ Email',
      password: 'Mật Khẩu',
    },
    register: {
      title: 'Tạo Tài Khoản',
      desc: 'Đăng ký tài khoản người dùng mới trên hệ thống Auth Service.',
      name: 'Họ Và Tên',
      name_placeholder: 'Ví dụ: Nguyễn Văn A',
      password: 'Mật Khẩu (tối thiểu 6 ký tự)',
    },
    auth_screen: {
      subtitle: 'Bảng Điều Khiển Nhà Phát Triển & Quản Trị',
      tab_signin: 'Đăng Nhập',
      tab_register: 'Tạo Tài Khoản',
      signin_btn: 'Đăng Nhập Bảng Điều Khiển',
      register_btn: 'Tạo Tài Khoản & Đăng Nhập',
      demo_title: 'Tài Khoản Quản Trị Mẫu',
      quick_fill: 'Điền Nhanh',
      or_divider: 'HOẶC TIẾP TỤC VỚI',
      oauth_google: 'Đăng nhập bằng Google',
      oauth_facebook: 'Đăng nhập bằng Facebook',
    },
    create_app: {
      title: 'Tạo Ứng Dụng Mới',
      desc: 'Đăng ký ứng dụng client mới để sinh cặp khóa bảo mật AppID và AppToken.',
      name_label: 'Tên Ứng Dụng',
      placeholder: 'Ví dụ: Order Service, Payment Gateway',
    },
    role_modal: {
      title: 'Phân Quyền Người Dùng',
      desc_prefix: 'Cập nhật vai trò cho:',
      select_label: 'Chọn Vai Trò',
    },
    modal: {
      cancel: 'Hủy',
      close: 'Đóng',
      save: 'Lưu Thay Đổi',
    },
    toasts: {
      signed_in: 'Đã đăng nhập thành công với',
      signed_out: 'Đã đăng xuất thành công',
      reg_success: 'Đăng ký thành công. Đang tự động đăng nhập...',
      copied: 'Đã sao chép',
      to_clipboard: 'vào bộ nhớ tạm.',
      copy_fail: 'Không thể sao chép vào bộ nhớ tạm',
      app_created: 'đã được tạo thành công.',
      app_deleted: 'đã được xóa.',
      status_updated: 'Đã cập nhật trạng thái sang',
      token_regenerated: 'Đã cấp mới AppToken thành công.',
      confirm_delete: 'Bạn có chắc chắn muốn xóa ứng dụng',
      confirm_regenerate: 'Bạn có chắc chắn muốn cấp lại AppToken cho',
    }
  }
};

// Application State
const state = {
  token: localStorage.getItem('auth_token') || null,
  user: JSON.parse(localStorage.getItem('auth_user') || 'null'),
  lang: localStorage.getItem('auth_lang') || 'en',
  applications: [],
  users: [],
  providers: [],
  selectedAppId: null,
  activeEditProvider: null,
  activeDetailApp: null,
  activeSdkTab: 'env',
  appFilter: {
    search: '',
    status: 'ALL',
    sortBy: 'newest',
  },
  userFilter: {
    search: '',
    role: 'ALL',
    sortBy: 'email_asc',
  },
  providersAppSearch: '',
};

// Helper to get nested translation value
function t(path, fallback = '') {
  const keys = path.split('.');
  let current = translations[state.lang] || translations.en;
  for (const k of keys) {
    if (current && current[k] !== undefined) {
      current = current[k];
    } else {
      return fallback || path;
    }
  }
  return current;
}

// Set active language and apply to DOM
function setLanguage(lang) {
  state.lang = lang;
  localStorage.setItem('auth_lang', lang);

  // Update switcher buttons (both auth screen and console navbar)
  document.querySelectorAll('#lang-btn-en, #auth-lang-btn-en').forEach(el => el.classList.toggle('active', lang === 'en'));
  document.querySelectorAll('#lang-btn-vi, #auth-lang-btn-vi').forEach(el => el.classList.toggle('active', lang === 'vi'));

  document.documentElement.lang = lang;
  document.title = lang === 'vi' ? 'Auth Service — Bảng Điều Khiển Quản Trị & Nhà Phát Triển' : 'Auth Service — Developer Console';

  // Translate all static data-i18n elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });

  // Translate placeholder attributes
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.setAttribute('placeholder', t(key));
  });

  // Translate title attributes
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    el.setAttribute('title', t(key));
  });

  // Re-render dynamic elements with current language
  updateAuthUI();
  if (state.applications && state.applications.length > 0) {
    renderApplications();
    renderOverviewRecentApps(state.applications);
    populateProvidersAppDropdown();
  } else {
    renderEmptyAppsTable(state.token ? t('apps.empty') : t('apps.empty_unauth'));
    renderOverviewRecentApps([]);
    updateAppsCountBadge(0, 0);
  }

  if (state.users && state.users.length > 0) {
    renderUsersTable();
  } else if (state.user?.role === 'ADMIN') {
    updateUsersCountBadge(0, 0);
  }

  if (state.providers && state.providers.length > 0) {
    renderProvidersTable(state.providers);
  }

  // Update detail modal if open
  if (state.activeDetailApp) {
    const tokenElem = document.getElementById('detail-app-token');
    const isMasked = tokenElem?.getAttribute('data-masked') === 'true';
    const revealBtn = document.getElementById('detail-token-reveal-btn');
    if (revealBtn) {
      revealBtn.textContent = isMasked ? t('detail.reveal') : t('detail.hide');
    }
    const statusElem = document.getElementById('detail-app-status');
    if (statusElem) {
      statusElem.textContent = state.activeDetailApp.status === 'ACTIVE' ? t('table.status_active') : t('table.status_inactive');
    }
    const createdElem = document.getElementById('detail-app-created');
    if (createdElem && state.activeDetailApp.createdAt) {
      createdElem.textContent = new Date(state.activeDetailApp.createdAt).toLocaleString(state.lang === 'vi' ? 'vi-VN' : 'en-US');
    }
    updateSdkSnippetView();
  }

  // Update provider modal if open
  if (state.activeEditProvider) {
    openEditProviderModal(state.activeEditProvider.provider);
  }

  const modalSecretBtn = document.getElementById('modal-secret-toggle-btn');
  if (modalSecretBtn) {
    const secretInput = document.getElementById('modal-provider-client-secret');
    const isPw = !secretInput || secretInput.type === 'password';
    modalSecretBtn.textContent = isPw ? t('detail.reveal') : t('detail.hide');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TOAST NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────
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
  }, 3200);
}

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD VISIBILITY TOGGLE & SNIPPET HELPER
// ─────────────────────────────────────────────────────────────────────────────
function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';

  const eyeOpen = btn.querySelector('.eye-open');
  const eyeClosed = btn.querySelector('.eye-closed');
  if (eyeOpen && eyeClosed) {
    eyeOpen.style.display = isPassword ? 'none' : 'block';
    eyeClosed.style.display = isPassword ? 'block' : 'none';
  }
}

function copySnippetText(btn) {
  const box = btn.closest('.code-snippet-box');
  const pre = box ? box.querySelector('.code-snippet') : null;
  if (!pre) return;
  navigator.clipboard.writeText(pre.textContent.trim()).then(() => {
    const orig = btn.textContent;
    btn.textContent = state.lang === 'vi' ? 'Đã chép!' : 'Copied!';
    setTimeout(() => { btn.textContent = orig; }, 1800);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// API WRAPPER
// ─────────────────────────────────────────────────────────────────────────────
async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (state.token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMsg = data?.message || data || `Error ${response.status}: Request failed`;
    throw new Error(Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg);
  }

  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATION CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────
function updateAuthUI() {
  const authView = document.getElementById('auth-view');
  const appShell = document.getElementById('app-shell');

  const userBadge = document.getElementById('user-badge');
  const userEmailDisplay = document.getElementById('user-email-display');
  const userRoleDisplay = document.getElementById('user-role-display');

  const overviewIdentity = document.getElementById('overview-user-identity');
  const overviewRole = document.getElementById('overview-user-role');
  const adminTab = document.getElementById('tab-btn-users');
  const providersTab = document.getElementById('tab-btn-providers');

  if (state.token && state.user) {
    if (authView) authView.style.display = 'none';
    if (appShell) appShell.style.display = 'block';

    if (userBadge) userBadge.style.display = 'flex';
    if (userEmailDisplay) userEmailDisplay.textContent = state.user.email;
    if (userRoleDisplay) {
      userRoleDisplay.textContent = state.user.role === 'ADMIN' ? t('table.role_admin') : t('table.role_user');
      userRoleDisplay.className = `nav-user-role ${state.user.role === 'ADMIN' ? 'role-admin' : ''}`;
    }

    if (overviewIdentity) overviewIdentity.textContent = state.user.email;
    if (overviewRole) overviewRole.textContent = `${t('overview.role_prefix')}${state.user.role === 'ADMIN' ? t('table.role_admin') : t('table.role_user')}`;

    const isAdmin = state.user.role === 'ADMIN';
    if (adminTab) {
      adminTab.style.display = isAdmin ? 'inline-flex' : 'none';
    }
    if (providersTab) {
      providersTab.style.display = 'inline-flex';
    }
  } else {
    if (authView) authView.style.display = 'flex';
    if (appShell) appShell.style.display = 'none';
    if (overviewIdentity) overviewIdentity.textContent = t('overview.not_auth');
    if (overviewRole) overviewRole.textContent = t('overview.signin_hint');
  }
}

function switchAuthMode(mode) {
  const signinForm = document.getElementById('auth-signin-form');
  const registerForm = document.getElementById('auth-register-form');
  const tabSignin = document.getElementById('auth-tab-signin');
  const tabRegister = document.getElementById('auth-tab-register');

  if (mode === 'register') {
    if (signinForm) signinForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'block';
    if (tabSignin) tabSignin.classList.remove('active');
    if (tabRegister) tabRegister.classList.add('active');
  } else {
    if (signinForm) signinForm.style.display = 'block';
    if (registerForm) registerForm.style.display = 'none';
    if (tabSignin) tabSignin.classList.add('active');
    if (tabRegister) tabRegister.classList.remove('active');
  }
}

async function handleAuthLogin() {
  const emailInput = document.getElementById('auth-login-email');
  const passInput = document.getElementById('auth-login-password');
  const submitBtn = document.getElementById('auth-login-submit');

  if (!emailInput || !passInput) return;
  if (submitBtn) submitBtn.disabled = true;

  try {
    await login(emailInput.value, passInput.value);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function handleAuthRegister() {
  const nameInput = document.getElementById('auth-reg-name');
  const emailInput = document.getElementById('auth-reg-email');
  const passInput = document.getElementById('auth-reg-password');
  const submitBtn = document.getElementById('auth-reg-submit');

  if (!emailInput || !passInput) return;
  if (submitBtn) submitBtn.disabled = true;

  try {
    await register(emailInput.value, passInput.value, nameInput ? nameInput.value : '');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

function fillAdminCreds() {
  const emailInput = document.getElementById('auth-login-email');
  const passInput = document.getElementById('auth-login-password');
  if (emailInput && passInput) {
    emailInput.value = 'admin@example.com';
    passInput.value = 'Admin123!';
  }
  switchAuthMode('signin');
}

async function login(email, password) {
  try {
    const res = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    state.token = res.accessToken;
    state.user = res.user;

    localStorage.setItem('auth_token', state.token);
    localStorage.setItem('auth_user', JSON.stringify(state.user));

    updateAuthUI();
    showToast(`${t('toasts.signed_in')} ${state.user.email}`);
    await loadApplications();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function register(email, password, name) {
  try {
    await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name: name || undefined }),
    });

    showToast(t('toasts.reg_success'));
    await login(email, password);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function logout() {
  state.token = null;
  state.user = null;
  state.applications = [];
  state.users = [];
  state.activeDetailApp = null;

  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');

  updateAuthUI();
  renderApplications([]);
  renderOverviewRecentApps([]);
  showToast(t('toasts.signed_out'));
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLICATION MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
async function loadApplications() {
  const tableBody = document.getElementById('apps-table-body');
  if (!state.token) {
    renderEmptyAppsTable(t('apps.empty_unauth'));
    renderOverviewRecentApps([]);
    return;
  }

  try {
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 32px;">${t('apps.loading')}</td></tr>`;
    }

    const apps = await api('/applications');
    state.applications = apps;
    renderApplications(apps);
    renderOverviewRecentApps(apps);
  } catch (err) {
    renderEmptyAppsTable(`Error: ${err.message}`);
  }
}

function renderEmptyAppsTable(message) {
  const tableBody = document.getElementById('apps-table-body');
  const countDisplay = document.getElementById('overview-apps-count');
  if (countDisplay) countDisplay.textContent = '0';

  if (!tableBody) return;
  tableBody.innerHTML = `
    <tr>
      <td colspan="6" style="text-align: center; padding: 36px; color: var(--text-muted);">
        <p style="margin-bottom: 12px;">${message}</p>
        ${!state.token 
          ? `<button class="btn btn-secondary btn-sm" onclick="switchAuthMode('signin'); logout();">${t('nav.signin')}</button>` 
          : `<button class="btn btn-primary btn-sm" onclick="openModal('create-app-modal')">${t('apps.create_btn')}</button>`}
      </td>
    </tr>
  `;
}

function updateAppsCountBadge(showingCount, totalCount) {
  const badge = document.getElementById('apps-count-badge');
  if (!badge) return;
  const tpl = t('filter.showing_apps');
  badge.textContent = tpl.replace('{count}', showingCount).replace('{total}', totalCount);
}

function onAppsFilterChange() {
  const searchInput = document.getElementById('apps-search-input');
  const statusFilter = document.getElementById('apps-status-filter');
  const sortBy = document.getElementById('apps-sort-by');

  if (searchInput) state.appFilter.search = searchInput.value;
  if (statusFilter) state.appFilter.status = statusFilter.value;
  if (sortBy) state.appFilter.sortBy = sortBy.value;

  renderApplications();
}

function clearAppsFilter() {
  state.appFilter = { search: '', status: 'ALL', sortBy: 'newest' };
  const searchInput = document.getElementById('apps-search-input');
  const statusFilter = document.getElementById('apps-status-filter');
  const sortBy = document.getElementById('apps-sort-by');
  if (searchInput) searchInput.value = '';
  if (statusFilter) statusFilter.value = 'ALL';
  if (sortBy) sortBy.value = 'newest';

  renderApplications();
}

function renderApplications(apps) {
  const tableBody = document.getElementById('apps-table-body');
  const countDisplay = document.getElementById('overview-apps-count');
  const total = state.applications ? state.applications.length : 0;
  if (countDisplay) countDisplay.textContent = total;

  if (!tableBody) return;
  if (!state.applications || state.applications.length === 0) {
    renderEmptyAppsTable(t('apps.empty'));
    updateAppsCountBadge(0, 0);
    return;
  }

  // Filter applications
  let filtered = [...state.applications];
  const q = (state.appFilter.search || '').trim().toLowerCase();
  if (q) {
    filtered = filtered.filter(app => {
      const name = (app.name || '').toLowerCase();
      const appId = (app.appId || '').toLowerCase();
      const owner = (app.user?.email || '').toLowerCase();
      return name.includes(q) || appId.includes(q) || owner.includes(q);
    });
  }

  if (state.appFilter.status && state.appFilter.status !== 'ALL') {
    filtered = filtered.filter(app => app.status === state.appFilter.status);
  }

  // Sort applications
  const sortBy = state.appFilter.sortBy || 'newest';
  filtered.sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '');
    return 0;
  });

  updateAppsCountBadge(filtered.length, total);

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 36px; color: var(--text-muted);">
          <p style="margin-bottom: 12px;">${t('filter.no_matches')}</p>
          <button class="btn btn-secondary btn-sm" onclick="clearAppsFilter()">${t('filter.clear_filter')}</button>
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = filtered.map(app => {
    const isActive = app.status === 'ACTIVE';
    const createdDate = new Date(app.createdAt).toISOString().split('T')[0];
    const ownerEmail = app.user?.email || state.user?.email || '—';

    return `
      <tr>
        <td style="font-weight: 600; color: #fff;">${escapeHtml(app.name)}</td>
        <td>
          <span class="mono-tag">
            <span>${app.appId}</span>
            <button class="btn-icon" style="width: 20px; height: 20px;" title="${t('table.copy_appid')}" onclick="copyToClipboard('${app.appId}', 'AppID')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
          </span>
        </td>
        <td>
          <span class="status-indicator ${isActive ? 'active' : 'inactive'}">
            ${isActive ? t('table.status_active') : t('table.status_inactive')}
          </span>
        </td>
        <td style="color: var(--text-muted); max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(ownerEmail)}">${escapeHtml(ownerEmail)}</td>
        <td style="color: var(--text-dim); font-size: 12px; white-space: nowrap;">${createdDate}</td>
        <td style="text-align: right; white-space: nowrap;">
          <div class="app-actions-group">
            <button class="btn btn-secondary btn-sm" onclick="goToAppSettings('${app.id}')" title="${t('apps.goto_providers_title')}">
              ${t('apps.btn_providers')}
            </button>
            <button class="btn btn-secondary btn-sm" onclick="openDetailModal('${app.id}')">
              ${t('table.details')}
            </button>
            <button class="btn ${isActive ? 'btn-secondary' : 'btn-success-subtle'} btn-sm" onclick="toggleAppStatus('${app.id}', '${app.status}')" title="${isActive ? t('table.deactivate') : t('table.activate')}">
              ${isActive ? t('table.deactivate') : t('table.activate')}
            </button>
            <button class="btn btn-danger btn-sm" onclick="deleteApp('${app.id}', '${escapeHtml(app.name)}')">
              ${t('table.delete')}
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderOverviewRecentApps(apps) {
  const recentTable = document.getElementById('overview-recent-apps');
  if (!recentTable) return;

  if (!apps || apps.length === 0) {
    recentTable.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; color: var(--text-dim); padding: 24px;">
          ${t('overview.empty_recent')}
        </td>
      </tr>
    `;
    return;
  }

  const recent = apps.slice(0, 5);
  recentTable.innerHTML = recent.map(app => {
    const isActive = app.status === 'ACTIVE';
    const createdDate = new Date(app.createdAt).toISOString().split('T')[0];
    return `
      <tr style="cursor: pointer;" onclick="openDetailModal('${app.id}')">
        <td style="font-weight: 500; color: #fff;">${escapeHtml(app.name)}</td>
        <td><span class="mono-tag">${app.appId}</span></td>
        <td>
          <span class="status-indicator ${isActive ? 'active' : 'inactive'}">
            ${isActive ? t('table.status_active') : t('table.status_inactive')}
          </span>
        </td>
        <td style="color: var(--text-dim); font-size: 12px;">${createdDate}</td>
      </tr>
    `;
  }).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLICATION DETAIL MODAL
// ─────────────────────────────────────────────────────────────────────────────
function openDetailModal(appId) {
  const app = state.applications.find(a => a.id === appId);
  if (!app) return;

  state.activeDetailApp = app;

  document.getElementById('detail-app-name').textContent = app.name;
  
  const statusElem = document.getElementById('detail-app-status');
  statusElem.className = `status-indicator ${app.status === 'ACTIVE' ? 'active' : 'inactive'}`;
  statusElem.textContent = app.status === 'ACTIVE' ? t('table.status_active') : t('table.status_inactive');

  document.getElementById('detail-app-id').textContent = app.appId;
  
  const tokenElem = document.getElementById('detail-app-token');
  tokenElem.textContent = '••••••••••••••••••••••••••••';
  tokenElem.setAttribute('data-masked', 'true');
  document.getElementById('detail-token-reveal-btn').textContent = t('detail.reveal');

  document.getElementById('detail-app-owner').textContent = app.user?.email || state.user?.email || '—';
  document.getElementById('detail-app-created').textContent = new Date(app.createdAt).toLocaleString(state.lang === 'vi' ? 'vi-VN' : 'en-US');

  updateSdkSnippetView();

  openModal('app-detail-modal');
}

function toggleDetailTokenMask() {
  if (!state.activeDetailApp) return;

  const tokenElem = document.getElementById('detail-app-token');
  const btn = document.getElementById('detail-token-reveal-btn');
  const isMasked = tokenElem.getAttribute('data-masked') === 'true';

  if (isMasked) {
    tokenElem.textContent = state.activeDetailApp.appToken;
    tokenElem.setAttribute('data-masked', 'false');
    btn.textContent = t('detail.hide');
  } else {
    tokenElem.textContent = '••••••••••••••••••••••••••••';
    tokenElem.setAttribute('data-masked', 'true');
    btn.textContent = t('detail.reveal');
  }
}

function copyDetailAppId() {
  if (!state.activeDetailApp) return;
  copyToClipboard(state.activeDetailApp.appId, 'App ID');
}

function copyDetailAppToken() {
  if (!state.activeDetailApp) return;
  copyToClipboard(state.activeDetailApp.appToken, 'App Token');
}

// ─────────────────────────────────────────────────────────────────────────────
// MICROSERVICE SDK SETUP & CODE SNIPPETS
// ─────────────────────────────────────────────────────────────────────────────
function generateSdkSnippet(tab, app) {
  if (!app) return '';
  const origin = window.location.origin || 'http://localhost:3000';

  if (tab === 'env') {
    return `# .env (Client Microservice Configuration)
AUTH_SERVICE_URL=${origin}
AUTH_SERVICE_APP_ID=${app.appId}
AUTH_SERVICE_APP_TOKEN=${app.appToken}

# Shorthand aliases:
APP_ID=${app.appId}
APP_TOKEN=${app.appToken}`;
  }

  if (tab === 'node') {
    return `// Node.js (Axios) Client Microservice Example
// 1. Install Axios: npm install axios
import axios from 'axios';

const authClient = axios.create({
  baseURL: '${origin}',
  headers: {
    'X-App-Id': '${app.appId}',
    'X-App-Token': '${app.appToken}',
  },
});

// A. Service Handshake (Check if App credentials are valid & ACTIVE)
async function verifyServiceCredentials() {
  const { data } = await authClient.get('/auth/verify-service');
  console.log('Auth Service Handshake:', data.valid, data.application.status); // true, 'ACTIVE'
  return data;
}

// B. Validate User Bearer JWT Token (User Identity Delegation)
async function validateUserToken(userBearerJwt) {
  const { data: userProfile } = await authClient.get('/users/me', {
    headers: {
      Authorization: \`Bearer \${userBearerJwt}\`,
    },
  });
  console.log('Authenticated User:', userProfile.email, userProfile.role);
  return userProfile;
}`;
  }

  if (tab === 'curl') {
    return `# 1. Verify Service Credentials (Handshake)
curl -X GET "${origin}/auth/verify-service" \\
  -H "X-App-Id: ${app.appId}" \\
  -H "X-App-Token: ${app.appToken}"

# 2. Validate Delegated User Bearer JWT
curl -X GET "${origin}/users/me" \\
  -H "X-App-Id: ${app.appId}" \\
  -H "X-App-Token: ${app.appToken}" \\
  -H "Authorization: Bearer <USER_JWT_TOKEN>"`;
  }

  return '';
}

function updateSdkSnippetView() {
  if (!state.activeDetailApp) return;
  const codeElem = document.getElementById('sdk-snippet-code');
  if (!codeElem) return;

  const currentTab = state.activeSdkTab || 'env';
  codeElem.textContent = generateSdkSnippet(currentTab, state.activeDetailApp);
}

function switchSdkSnippet(tab) {
  state.activeSdkTab = tab;
  ['env', 'node', 'curl'].forEach(tKey => {
    const tabBtn = document.getElementById(`sdk-tab-${tKey}`);
    if (tabBtn) {
      if (tKey === tab) {
        tabBtn.classList.add('active');
      } else {
        tabBtn.classList.remove('active');
      }
    }
  });
  updateSdkSnippetView();
}

function copySdkSnippet() {
  if (!state.activeDetailApp) return;
  const currentTab = state.activeSdkTab || 'env';
  const code = generateSdkSnippet(currentTab, state.activeDetailApp);
  copyToClipboard(code, `Snippet (${currentTab.toUpperCase()})`);
}

async function regenerateDetailToken() {
  if (!state.activeDetailApp) return;

  const confirmMsg = `${t('toasts.confirm_regenerate')} "${state.activeDetailApp.name}"?`;
  if (!confirm(confirmMsg)) {
    return;
  }

  try {
    const updated = await api(`/applications/${state.activeDetailApp.id}/regenerate-token`, {
      method: 'POST',
    });

    state.activeDetailApp.appToken = updated.appToken;
    
    // Update token element in modal
    const tokenElem = document.getElementById('detail-app-token');
    tokenElem.textContent = updated.appToken;
    tokenElem.setAttribute('data-masked', 'false');
    document.getElementById('detail-token-reveal-btn').textContent = t('detail.hide');

    updateSdkSnippetView();

    showToast(t('toasts.token_regenerated'));
    await loadApplications();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function toggleDetailStatus() {
  if (!state.activeDetailApp) return;
  const newStatus = state.activeDetailApp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  
  try {
    await api(`/applications/${state.activeDetailApp.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    });

    state.activeDetailApp.status = newStatus;
    const statusElem = document.getElementById('detail-app-status');
    statusElem.className = `status-indicator ${newStatus === 'ACTIVE' ? 'active' : 'inactive'}`;
    statusElem.textContent = newStatus === 'ACTIVE' ? t('table.status_active') : t('table.status_inactive');

    showToast(`${t('toasts.status_updated')} ${newStatus === 'ACTIVE' ? t('table.status_active') : t('table.status_inactive')}.`);
    await loadApplications();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE, STATUS & DELETE APPLICATION
// ─────────────────────────────────────────────────────────────────────────────
async function createApp(name, userId = null) {
  try {
    const payload = { name };
    if (userId && state.user?.role === 'ADMIN') {
      payload.userId = userId;
    }

    const newApp = await api('/applications', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    showToast(`"${newApp.name}" ${t('toasts.app_created')}`);
    closeModal('create-app-modal');
    document.getElementById('new-app-name').value = '';

    await loadApplications();
    openDetailModal(newApp.id);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function toggleAppStatus(appId, currentStatus) {
  const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  try {
    await api(`/applications/${appId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    });

    showToast(`${t('toasts.status_updated')} ${newStatus === 'ACTIVE' ? t('table.status_active') : t('table.status_inactive')}.`);
    await loadApplications();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteApp(appId, appName) {
  const confirmMsg = `${t('toasts.confirm_delete')} "${appName}"?`;
  if (!confirm(confirmMsg)) {
    return;
  }

  try {
    await api(`/applications/${appId}`, {
      method: 'DELETE',
    });

    showToast(`"${appName}" ${t('toasts.app_deleted')}`);
    await loadApplications();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN USER MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
async function loadUsers() {
  if (state.user?.role !== 'ADMIN') return;

  const tableBody = document.getElementById('users-table-body');
  if (!tableBody) return;

  try {
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-dim); padding: 32px;">${t('users.loading')}</td></tr>`;
    const users = await api('/users');
    state.users = users;
    renderUsersTable(users);
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger); padding: 32px;">Error: ${err.message}</td></tr>`;
  }
}

function updateUsersCountBadge(showingCount, totalCount) {
  const badge = document.getElementById('users-count-badge');
  if (!badge) return;
  const tpl = t('filter.showing_users');
  badge.textContent = tpl.replace('{count}', showingCount).replace('{total}', totalCount);
}

function onUsersFilterChange() {
  const searchInput = document.getElementById('users-search-input');
  const roleFilter = document.getElementById('users-role-filter');
  const sortBy = document.getElementById('users-sort-by');

  if (searchInput) state.userFilter.search = searchInput.value;
  if (roleFilter) state.userFilter.role = roleFilter.value;
  if (sortBy) state.userFilter.sortBy = sortBy.value;

  renderUsersTable();
}

function clearUsersFilter() {
  state.userFilter = { search: '', role: 'ALL', sortBy: 'email_asc' };
  const searchInput = document.getElementById('users-search-input');
  const roleFilter = document.getElementById('users-role-filter');
  const sortBy = document.getElementById('users-sort-by');
  if (searchInput) searchInput.value = '';
  if (roleFilter) roleFilter.value = 'ALL';
  if (sortBy) sortBy.value = 'email_asc';

  renderUsersTable();
}

function renderUsersTable(users) {
  const tableBody = document.getElementById('users-table-body');
  if (!tableBody) return;

  const total = state.users ? state.users.length : 0;
  if (!state.users || state.users.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-dim); padding: 32px;">${t('users.loading')}</td></tr>`;
    updateUsersCountBadge(0, 0);
    return;
  }

  // Filter users
  let filtered = [...state.users];
  const q = (state.userFilter.search || '').trim().toLowerCase();
  if (q) {
    filtered = filtered.filter(u => {
      const email = (u.email || '').toLowerCase();
      const name = (u.name || '').toLowerCase();
      const id = (u.id || '').toLowerCase();
      return email.includes(q) || name.includes(q) || id.includes(q);
    });
  }

  if (state.userFilter.role && state.userFilter.role !== 'ALL') {
    filtered = filtered.filter(u => u.role === state.userFilter.role);
  }

  // Sort users
  const sortBy = state.userFilter.sortBy || 'email_asc';
  filtered.sort((a, b) => {
    if (sortBy === 'email_asc') return (a.email || '').localeCompare(b.email || '');
    if (sortBy === 'email_desc') return (b.email || '').localeCompare(a.email || '');
    if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'role_admin') {
      if (a.role === b.role) return (a.email || '').localeCompare(b.email || '');
      return a.role === 'ADMIN' ? -1 : 1;
    }
    return 0;
  });

  updateUsersCountBadge(filtered.length, total);

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 36px; color: var(--text-muted);">
          <p style="margin-bottom: 12px;">${t('filter.no_matches')}</p>
          <button class="btn btn-secondary btn-sm" onclick="clearUsersFilter()">${t('filter.clear_filter')}</button>
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = filtered.map(u => `
    <tr>
      <td style="font-family: var(--font-mono); font-size: 12px; color: var(--text-dim);">${u.id.slice(0, 8)}...</td>
      <td style="font-weight: 500; color: #fff;">${escapeHtml(u.email)}</td>
      <td style="color: var(--text-muted);">${escapeHtml(u.name || '—')}</td>
      <td>
        <span class="nav-user-role ${u.role === 'ADMIN' ? 'role-admin' : ''}">${u.role === 'ADMIN' ? t('table.role_admin') : t('table.role_user')}</span>
      </td>
      <td style="text-align: right;">
        <button class="btn btn-secondary btn-sm" onclick="openRoleModal('${u.id}', '${escapeHtml(u.email)}', '${u.role}')">
          ${t('table.assign_role')}
        </button>
      </td>
    </tr>
  `).join('');
}

async function assignRole(userId, newRole) {
  try {
    await api('/roles/assign', {
      method: 'POST',
      body: JSON.stringify({ userId, role: newRole }),
    });

    showToast(`${t('toasts.status_updated')} ${newRole === 'ADMIN' ? t('table.role_admin') : t('table.role_user')}.`);
    closeModal('assign-role-modal');
    await loadUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openRoleModal(userId, email, currentRole) {
  document.getElementById('role-modal-user-id').value = userId;
  document.getElementById('role-modal-user-email').textContent = email;
  document.getElementById('role-modal-select').value = currentRole;
  openModal('assign-role-modal');
}

// ─────────────────────────────────────────────────────────────────────────────
// OAUTH & PROVIDER MANAGEMENT (APPLICATION-SCOPED)
// ─────────────────────────────────────────────────────────────────────────────
function initiateOAuth(provider) {
  const redirectUri = window.location.origin + window.location.pathname;
  window.location.href = `${API_BASE}/auth/oauth/${provider}?redirect_uri=${encodeURIComponent(redirectUri)}`;
}

function checkOAuthCallbackToken() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const error = urlParams.get('error') || urlParams.get('error_description');

  if (error) {
    showToast(`OAuth: ${error}`, 'error');
    window.history.replaceState({}, document.title, window.location.pathname);
    return false;
  }

  if (token) {
    state.token = token;
    state.user = {
      email: urlParams.get('email') || '',
      name: urlParams.get('name') || '',
      role: urlParams.get('role') || 'USER',
    };
    localStorage.setItem('auth_token', state.token);
    localStorage.setItem('auth_user', JSON.stringify(state.user));
    window.history.replaceState({}, document.title, window.location.pathname);
    showToast(`${t('toasts.signed_in')} ${state.user.email}`);
    updateAuthUI();
    loadApplications();
    return true;
  }
  return false;
}

function goToAppSettings(appId) {
  state.selectedAppId = appId;
  switchTab('providers');
}

function onFilterProvidersAppSelect(query) {
  state.providersAppSearch = (query || '').trim().toLowerCase();
  populateProvidersAppDropdown();
}

function populateProvidersAppDropdown() {
  const selectEl = document.getElementById('providers-app-select');
  const hintEl = document.getElementById('providers-app-count-hint');
  const badgeEl = document.getElementById('providers-app-status-badge');
  const metaEl = document.getElementById('providers-app-meta');

  if (!selectEl) return;

  if (!state.applications || state.applications.length === 0) {
    selectEl.innerHTML = `<option value="">-- ${t('providers.no_apps')} --</option>`;
    if (hintEl) hintEl.textContent = '';
    if (badgeEl) badgeEl.style.display = 'none';
    if (metaEl) metaEl.innerHTML = '';
    return;
  }

  // Filter
  const q = state.providersAppSearch;
  let list = [...state.applications];
  if (q) {
    list = list.filter(a =>
      (a.name || '').toLowerCase().includes(q) ||
      (a.appId || '').toLowerCase().includes(q)
    );
  }

  // Sort alphabetically by name
  list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  if (hintEl) {
    hintEl.textContent = `(${list.length}/${state.applications.length} ${t('filter.apps_unit')})`;
  }

  if (list.length === 0) {
    selectEl.innerHTML = `<option value="">-- ${t('filter.no_matches')} --</option>`;
    if (badgeEl) badgeEl.style.display = 'none';
    return;
  }

  // If current selection is not in filtered list, pick the first
  if (!list.some(a => a.id === state.selectedAppId)) {
    state.selectedAppId = list[0].id;
  }

  selectEl.innerHTML = list.map(a => {
    return `<option value="${a.id}" ${a.id === state.selectedAppId ? 'selected' : ''}>${escapeHtml(a.name)}</option>`;
  }).join('');

  // Update status badge & meta
  const currentApp = state.applications.find(a => a.id === state.selectedAppId);
  if (currentApp && metaEl) {
    const isActive = currentApp.status === 'ACTIVE';
    metaEl.innerHTML = `
      <div class="app-meta-pill-group">
        <span class="status-indicator ${isActive ? 'active' : 'inactive'}">
          ${isActive ? t('table.status_active') : t('table.status_inactive')}
        </span>
        <div class="app-id-pill" title="AppID: ${currentApp.appId}">
          <span class="app-id-label">AppID:</span>
          <span class="app-id-code">${currentApp.appId.slice(0, 10)}...${currentApp.appId.slice(-6)}</span>
          <button type="button" class="btn-icon-xs" onclick="copyToClipboard('${currentApp.appId}', 'AppID')" title="${t('table.copy_appid')}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
        </div>
      </div>
      <button type="button" class="btn btn-secondary btn-xs" onclick="openDetailModal('${currentApp.id}')">
        ${t('table.details')}
      </button>
    `;
  }
}

async function onSelectAppForProviders(appId) {
  state.selectedAppId = appId;
  populateProvidersAppDropdown();
  await loadOAuthProviders(true);
}

async function loadOAuthProviders(keepDropdown = false) {
  const tableBody = document.getElementById('providers-table-body');
  const selectEl = document.getElementById('providers-app-select');
  const metaEl = document.getElementById('providers-app-meta');

  if (!tableBody) return;

  try {
    // Ensure applications list is loaded
    if (!state.applications || state.applications.length === 0) {
      state.applications = await api('/applications');
    }

    if (!state.applications || state.applications.length === 0) {
      if (selectEl) selectEl.innerHTML = `<option value="">-- ${t('providers.no_apps')} --</option>`;
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 32px;">${t('providers.no_apps')}</td></tr>`;
      if (metaEl) metaEl.innerHTML = '';
      return;
    }

    // Determine selected app
    if (!state.selectedAppId || !state.applications.some(a => a.id === state.selectedAppId)) {
      state.selectedAppId = state.applications[0].id;
    }

    if (!keepDropdown) {
      populateProvidersAppDropdown();
    }

    tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 32px;">${t('providers.loading')}</td></tr>`;
    const providers = await api(`/applications/${state.selectedAppId}/auth-methods`);
    state.providers = providers;
    renderProvidersTable(providers);
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--danger); padding: 32px;">Error: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderProvidersTable(providers) {
  const tableBody = document.getElementById('providers-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = providers.map(p => {
    const isGoogle = p.provider === 'GOOGLE';
    const providerName = isGoogle ? 'Google' : 'Facebook';
    const icon = isGoogle
      ? `<svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>`
      : `<svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`;

    const statusBadge = p.isEnabled
      ? `<span class="provider-badge badge-enabled">${t('providers.status_enabled')}</span>`
      : `<span class="provider-badge badge-disabled">${t('providers.status_disabled')}</span>`;

    const clientIdDisplay = p.clientId
      ? `<code style="font-size: 12px; color: var(--text-main);">${escapeHtml(p.clientId)}</code>`
      : `<span style="color: var(--text-dim); font-style: italic;">${t('providers.not_configured')}</span>`;

    const secretDisplay = p.hasSecret
      ? `<span style="font-family: var(--font-mono); font-size: 11px; color: var(--success);">&#x25CF;&#x25CF;&#x25CF;&#x25CF;&#x25CF;&#x25CF;&#x25CF;&#x25CF; (${t('providers.secret_set')})</span>`
      : `<span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-dim);">${t('providers.secret_none')}</span>`;

    const callbackUrl = p.callbackUrl || `${API_BASE}/auth/oauth/${p.provider.toLowerCase()}/callback`;

    return `
      <tr>
        <td>
          <div class="provider-row-title">
            ${icon}
            <span>${providerName}</span>
          </div>
        </td>
        <td>${statusBadge}</td>
        <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${clientIdDisplay}</td>
        <td>${secretDisplay}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <code style="font-size: 11px; color: var(--text-muted);">${escapeHtml(callbackUrl)}</code>
            <button class="btn btn-secondary btn-sm" onclick="copyToClipboard('${escapeHtml(callbackUrl)}', 'Callback URL')" style="padding: 2px 8px; font-size: 11px;">
              ${t('detail.copy')}
            </button>
          </div>
        </td>
        <td style="text-align: right;">
          <div style="display: inline-flex; gap: 6px;">
            <button class="btn btn-secondary btn-sm" onclick="openEditProviderModal('${p.provider}')">
              ${t('providers.configure')}
            </button>
            <button class="btn ${p.isEnabled ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="toggleProvider('${p.provider}')">
              ${p.isEnabled ? t('providers.disable') : t('providers.enable')}
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openEditProviderModal(providerType) {
  const provider = state.providers.find(p => p.provider === providerType);
  if (!provider) return;

  state.activeEditProvider = provider;
  const isGoogle = provider.provider === 'GOOGLE';
  const name = isGoogle ? 'Google' : 'Facebook';

  const modalTitle = document.getElementById('modal-provider-title');
  const modalIcon = document.getElementById('modal-provider-icon');
  const typeInput = document.getElementById('modal-provider-type');
  const clientIdInput = document.getElementById('modal-provider-client-id');
  const clientSecretInput = document.getElementById('modal-provider-client-secret');
  const secretStatus = document.getElementById('modal-provider-secret-status');
  const callbackSpan = document.getElementById('modal-provider-callback');
  const enabledCheckbox = document.getElementById('modal-provider-enabled');

  if (modalTitle) modalTitle.textContent = `${t('provider_modal.title')}: ${name}`;
  if (modalIcon) {
    modalIcon.innerHTML = isGoogle
      ? `<svg width="24" height="24" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>`
      : `<svg width="24" height="24" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`;
  }

  if (typeInput) typeInput.value = provider.provider;
  if (clientIdInput) clientIdInput.value = provider.clientId || '';
  if (clientSecretInput) {
    clientSecretInput.value = '';
    clientSecretInput.type = 'password';
    const secretToggleBtn = document.getElementById('modal-secret-toggle-btn');
    if (secretToggleBtn) secretToggleBtn.textContent = t('detail.reveal');
    clientSecretInput.placeholder = provider.hasSecret
      ? (state.lang === 'vi' ? '•••••••••••••••• (Để trống nếu giữ nguyên secret cũ)' : '•••••••••••••••• (Leave blank to keep current secret)')
      : (state.lang === 'vi' ? 'Nhập Client Secret của nhà cung cấp...' : 'Enter client secret from provider...');
  }
  if (secretStatus) {
    secretStatus.textContent = provider.hasSecret ? `✓ ${t('providers.secret_set')}` : `○ ${t('providers.secret_none')}`;
    secretStatus.style.color = provider.hasSecret ? 'var(--success)' : 'var(--text-dim)';
  }
  const callbackUrl = provider.callbackUrl || `${API_BASE}/auth/oauth/${provider.provider.toLowerCase()}/callback`;
  if (callbackSpan) callbackSpan.textContent = callbackUrl;
  if (enabledCheckbox) enabledCheckbox.checked = Boolean(provider.isEnabled);

  // Populate dynamic developer portal link & instructions
  const guideTitle = document.getElementById('modal-guide-title');
  const portalLink = document.getElementById('modal-provider-portal-link');
  const portalBtnText = document.getElementById('modal-portal-btn-text');
  const guideSteps = document.getElementById('modal-guide-steps');

  if (portalBtnText) {
    portalBtnText.textContent = t('provider_modal.portal_btn');
  }

  if (isGoogle) {
    if (portalLink) portalLink.href = 'https://console.cloud.google.com/apis/credentials';
    if (guideTitle) {
      guideTitle.textContent = state.lang === 'vi'
        ? '📋 4 bước lấy Google Client ID & Secret:'
        : '📋 4 Steps to get Google Client ID & Secret:';
    }
    if (guideSteps) {
      guideSteps.innerHTML = state.lang === 'vi'
        ? `1. Mở <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style="color: #818cf8; text-decoration: underline;">Google Cloud Console &nearr;</a> &rarr; Chọn hoặc tạo một project.<br>` +
          `2. Vào <strong>APIs &amp; Services &rarr; Credentials &rarr; Create Credentials &rarr; OAuth client ID</strong> (Chọn Application type: <em>Web application</em>).<br>` +
          `3. Tại mục <strong>Authorized redirect URIs</strong>, bấm Add URI và dán: <code style="color: #cbd5e1; background: rgba(0,0,0,0.3); padding: 1px 4px; border-radius: 3px;">${callbackUrl}</code> (dùng nút Sao Chép bên dưới).<br>` +
          `4. Sao chép <strong>Client ID</strong> và <strong>Client Secret</strong> dán vào 2 ô bên dưới &amp; tích chọn Kích hoạt.`
        : `1. Open <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style="color: #818cf8; text-decoration: underline;">Google Cloud Console &nearr;</a> &rarr; Select or create a project.<br>` +
          `2. Go to <strong>APIs &amp; Services &rarr; Credentials &rarr; Create Credentials &rarr; OAuth client ID</strong> (Type: <em>Web application</em>).<br>` +
          `3. Under <strong>Authorized redirect URIs</strong>, click Add URI and paste: <code style="color: #cbd5e1; background: rgba(0,0,0,0.3); padding: 1px 4px; border-radius: 3px;">${callbackUrl}</code>.<br>` +
          `4. Copy <strong>Client ID</strong> and <strong>Client Secret</strong> into the fields below &amp; check Enable.`;
    }
  } else {
    if (portalLink) portalLink.href = 'https://developers.facebook.com/apps/';
    if (guideTitle) {
      guideTitle.textContent = state.lang === 'vi'
        ? '📋 4 bước lấy Facebook App ID & Secret:'
        : '📋 4 Steps to get Facebook App ID & Secret:';
    }
    if (guideSteps) {
      guideSteps.innerHTML = state.lang === 'vi'
        ? `1. Mở <a href="https://developers.facebook.com/apps/" target="_blank" style="color: #818cf8; text-decoration: underline;">Meta for Developers &nearr;</a> &rarr; Bấm <strong>Tạo ứng dụng (Create App)</strong>.<br>` +
          `2. Thêm sản phẩm <strong>Facebook Login (Đăng nhập bằng Facebook)</strong> &rarr; Cài đặt.<br>` +
          `3. Tại ô <strong>Valid OAuth Redirect URIs</strong>, dán đường dẫn: <code style="color: #cbd5e1; background: rgba(0,0,0,0.3); padding: 1px 4px; border-radius: 3px;">${callbackUrl}</code>.<br>` +
          `4. Vào <strong>Cài đặt &rarr; Cơ bản (Settings &rarr; Basic)</strong>, sao chép <strong>App ID</strong> (Client ID) và <strong>App Secret</strong> dán vào bên dưới &amp; Bật.`
        : `1. Open <a href="https://developers.facebook.com/apps/" target="_blank" style="color: #818cf8; text-decoration: underline;">Meta for Developers &nearr;</a> &rarr; Click <strong>Create App</strong>.<br>` +
          `2. Add product <strong>Facebook Login</strong> &rarr; Settings.<br>` +
          `3. Under <strong>Valid OAuth Redirect URIs</strong>, paste: <code style="color: #cbd5e1; background: rgba(0,0,0,0.3); padding: 1px 4px; border-radius: 3px;">${callbackUrl}</code>.<br>` +
          `4. Go to <strong>App Settings &rarr; Basic</strong>, copy <strong>App ID</strong> (Client ID) and <strong>App Secret</strong> into the fields below &amp; Enable.`;
    }
  }

  openModal('provider-modal');
}

function toggleModalSecretVisibility() {
  const secretInput = document.getElementById('modal-provider-client-secret');
  const secretToggleBtn = document.getElementById('modal-secret-toggle-btn');
  if (!secretInput) return;
  const isPassword = secretInput.type === 'password';
  secretInput.type = isPassword ? 'text' : 'password';
  if (secretToggleBtn) {
    secretToggleBtn.textContent = isPassword ? t('detail.hide') : t('detail.reveal');
  }
}

function copyProviderCallback() {
  const callbackSpan = document.getElementById('modal-provider-callback');
  if (callbackSpan) {
    copyToClipboard(callbackSpan.textContent.trim(), 'Callback URI');
  }
}

async function saveProviderConfig() {
  const providerType = document.getElementById('modal-provider-type')?.value;
  const clientId = document.getElementById('modal-provider-client-id')?.value.trim();
  const clientSecret = document.getElementById('modal-provider-client-secret')?.value.trim();
  const isEnabled = document.getElementById('modal-provider-enabled')?.checked;
  const saveBtn = document.getElementById('modal-provider-save-btn');

  if (!providerType || !state.selectedAppId) return;
  if (saveBtn) saveBtn.disabled = true;

  try {
    const payload = {
      clientId,
      isEnabled,
    };
    if (clientSecret) {
      payload.clientSecret = clientSecret;
    }

    await api(`/applications/${state.selectedAppId}/auth-methods/${providerType}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    showToast(t('providers.config_saved'));
    closeModal('provider-modal');
    await loadOAuthProviders();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

async function toggleProvider(providerType) {
  if (!state.selectedAppId) return;
  try {
    const updated = await api(`/applications/${state.selectedAppId}/auth-methods/${providerType}/toggle`, {
      method: 'POST',
    });
    showToast(`${t('providers.toggle_success')} (${updated.provider}: ${updated.isEnabled ? t('providers.status_enabled') : t('providers.status_disabled')})`);
    await loadOAuthProviders();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UI HELPERS & NAVIGATION
// ─────────────────────────────────────────────────────────────────────────────
function switchTab(tabId) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  const tabBtn = document.getElementById(`tab-btn-${tabId}`);
  const tabContent = document.getElementById(`tab-${tabId}`);

  if (tabBtn) tabBtn.classList.add('active');
  if (tabContent) tabContent.classList.add('active');

  if (tabId === 'apps') loadApplications();
  if (tabId === 'users') loadUsers();
  if (tabId === 'providers') loadOAuthProviders();
  if (tabId === 'overview' && state.token) loadApplications();
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('show');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('show');
}

function copyToClipboard(text, label = 'Value') {
  navigator.clipboard.writeText(text).then(() => {
    showToast(`${t('toasts.copied')} ${label} ${t('toasts.to_clipboard')}`);
  }).catch(() => {
    showToast(t('toasts.copy_fail'), 'error');
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Apply saved or default language
  setLanguage(state.lang);

  // Check if returning from OAuth flow with token
  const hasCallbackToken = checkOAuthCallbackToken();

  if (state.token && !hasCallbackToken) {
    loadApplications();
  }
});

