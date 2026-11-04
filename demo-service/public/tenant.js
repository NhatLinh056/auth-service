const tenantState = { context: null, current: null, list: [], busy: false, generation: 0 };

function resetTenant() {
  tenantState.generation++;
  tenantState.context = null;
  tenantState.current = null;
  tenantState.list = [];
  document.getElementById('tenant-panel').replaceChildren();
}

async function tenantApi(path = '', method = 'GET', body) {
  const response = await fetch(`${API_BASE}/tenant${path}`, {
    method, headers: { Authorization: `Bearer ${state.token}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(Array.isArray(result.message) ? result.message.join(', ') : result.message || 'Không thể xử lý doanh nghiệp');
  return result;
}

async function loadTenant(selectedId) {
  if (!state.token) return;
  const generation = ++tenantState.generation;
  try {
    const context = await tenantApi('/me');
    const list = context.isSystemAdmin ? await tenantApi() : [];
    const id = selectedId || context.tenant?.id;
    const current = id ? (context.tenant?.id === id ? context.tenant : await tenantApi(`/${encodeURIComponent(id)}`)) : null;
    if (generation !== tenantState.generation || !state.token) return;
    Object.assign(tenantState, { context, list, current });
    renderTenant();
  } catch (error) {
    if (generation !== tenantState.generation) return;
    document.getElementById('tenant-panel').innerHTML = '<h3>Doanh nghiệp</h3><p id="tenant-feedback" role="status"></p><button class="btn btn-secondary btn-sm" onclick="loadTenant()">Thử lại</button>';
    tenantFeedback(error.message, true);
  }
}

function tenantFeedback(message, error = false) {
  const element = document.getElementById('tenant-feedback');
  if (element) { element.textContent = message; element.hidden = false; element.dataset.state = error ? 'error' : 'success'; }
}

function renderTenant() {
  const { context, current, list } = tenantState;
  if (!context) return;
  const escape = escapeHtml;
  const admin = context.isSystemAdmin;
  let html = `<div class="tenant-heading"><div><h3>Doanh nghiệp</h3><p>${admin ? 'Quản lý doanh nghiệp với quyền Super Admin.' : 'Thông tin công ty và quyền sở hữu của bạn.'}</p></div><button class="btn btn-secondary btn-sm" onclick="loadTenant()">Làm mới</button></div><p id="tenant-feedback" class="security-feedback" role="status" hidden></p>`;
  if (admin) html += `<label class="tenant-label">Chọn doanh nghiệp<select onchange="loadTenant(this.value)"><option value="">Doanh nghiệp của tôi</option>${list.map(item => `<option value="${escape(item.id)}" ${current?.id === item.id ? 'selected' : ''}>${escape(item.name)}</option>`).join('')}</select></label>`;

  if (!current) {
    html += `<p class="tenant-help">Bạn chưa thuộc doanh nghiệp nào. Tạo doanh nghiệp để trở thành chủ và quản lý công ty của mình.</p>`;
    if (context.canCreate) html += `<form class="tenant-form" onsubmit="createTenant(event)"><label>Tên doanh nghiệp<input name="name" maxlength="120" required placeholder="Ví dụ: Công ty ABC" /></label><label>Mô tả<textarea name="description" maxlength="500" rows="2" placeholder="Giới thiệu ngắn về doanh nghiệp"></textarea></label><button class="btn btn-primary btn-sm" type="submit">Tạo doanh nghiệp</button></form>`;
  } else {
    html += `<div class="tenant-info"><strong>${escape(current.name)}</strong><span>${escape(current.description || 'Chưa có mô tả')}</span><span>Chủ doanh nghiệp: ${escape(current.owner.name || current.owner.email)} · ${escape(current.owner.email)}</span><span>${current._count.users} thành viên</span><label>Tenant ID<code>${escape(current.id)}</code></label><span class="tenant-role">${current.isOwner ? 'Bạn là chủ doanh nghiệp' : admin ? 'Bạn đang quản trị hệ thống' : 'Bạn là thành viên'}</span></div>`;
    if (current.canManage) {
      if (current.isOwner) {
        html += `<details class="tenant-details"><summary>Chỉnh sửa thông tin</summary><form class="tenant-form" onsubmit="updateTenant(event)"><label>Tên doanh nghiệp<input name="name" maxlength="120" value="${escape(current.name)}" required /></label><label>Mô tả<textarea name="description" maxlength="500" rows="2">${escape(current.description || '')}</textarea></label><button class="btn btn-primary btn-sm" type="submit">Lưu thay đổi</button></form></details>`;
      }
      html += `<details class="tenant-details"><summary>Chuyển quyền sở hữu</summary><p class="tenant-help">Người nhận sẽ trở thành chủ; chủ cũ vẫn là thành viên. Chỉ chọn người đã thuộc doanh nghiệp.</p><form class="tenant-form" onsubmit="transferTenant(event)"><label>Người nhận<select name="userId" required><option value="">Chọn thành viên</option>${current.members.filter(member => member.id !== current.ownerUserId).map(member => `<option value="${escape(member.id)}">${escape(member.name || member.email)} · ${escape(member.email)}</option>`).join('')}</select></label>`;
      if (admin && !current.isOwner) html += `<label>Hoặc ID user chưa thuộc doanh nghiệp<input name="overrideUserId" placeholder="ID tài khoản cần nhận quyền" oninput="this.form.elements.userId.required = !this.value" /></label>`;
      html += `<label>Lý do ${admin && !current.isOwner ? '(bắt buộc)' : '(tùy chọn)'}<textarea name="reason" maxlength="500" rows="2" ${admin && !current.isOwner ? 'required' : ''}></textarea></label><button class="btn btn-secondary btn-sm" type="submit">Xác nhận chuyển quyền</button></form></details>`;
      html += `<div class="tenant-actions"><button class="btn btn-secondary btn-sm" onclick="showTenantAudit()">Xem nhật ký</button>${current.isOwner ? '<button class="btn btn-danger btn-sm" onclick="deleteTenant()">Xóa doanh nghiệp</button>' : ''}</div><div id="tenant-audit" class="tenant-audit" hidden></div>`;
    }
  }
  document.getElementById('tenant-panel').innerHTML = html;
}

async function tenantMutation(action, success, nextId) {
  if (tenantState.busy) return;
  tenantState.busy = true;
  document.querySelectorAll('#tenant-panel button').forEach(button => { button.disabled = true; });
  try {
    const result = await action();
    await loadTenant(nextId === undefined ? result?.id : nextId);
    if (typeof syncUserProfile === 'function') void syncUserProfile();
    if (typeof fetchOrders === 'function') void fetchOrders();
    tenantFeedback(success);
    showToast(success);
  } catch (error) { tenantFeedback(error.message, true); showToast(error.message, 'error'); }
  finally {
    tenantState.busy = false;
    document.querySelectorAll('#tenant-panel button').forEach(button => { button.disabled = false; });
  }
}

function tenantForm(event) { event.preventDefault(); return Object.fromEntries(new FormData(event.target)); }
function createTenant(event) {
  const values = tenantForm(event);
  return tenantMutation(() => tenantApi('', 'POST', values), 'Đã tạo doanh nghiệp. Bạn là chủ doanh nghiệp.');
}
function updateTenant(event) {
  const values = tenantForm(event);
  return tenantMutation(() => tenantApi(`/${tenantState.current.id}`, 'PATCH', values), 'Đã cập nhật doanh nghiệp.');
}
function transferTenant(event) {
  const values = tenantForm(event);
  if (!window.confirm('Chuyển quyền sở hữu cho người đã chọn? Quyền quản lý của chủ cũ sẽ thay đổi.')) return;
  const id = tenantState.current.id;
  return tenantMutation(() => tenantApi(`/${id}/transfer`, 'POST', { userId: values.overrideUserId || values.userId, reason: values.reason }), 'Đã chuyển quyền sở hữu.', id);
}
function deleteTenant() {
  if (!window.confirm('Xóa doanh nghiệp? Tài khoản vẫn được giữ; thao tác xóa chỉ được phép khi không còn thành viên khác.')) return;
  return tenantMutation(() => tenantApi(`/${tenantState.current.id}`, 'DELETE'), 'Đã xóa doanh nghiệp.', null);
}
async function showTenantAudit() {
  try {
    const logs = await tenantApi(`/${tenantState.current.id}/audit`);
    const names = { CREATED: 'Tạo doanh nghiệp', UPDATED: 'Cập nhật thông tin', OWNERSHIP_TRANSFERRED: 'Chuyển quyền sở hữu', ADMIN_OWNERSHIP_TRANSFERRED: 'Super Admin chuyển quyền', DELETED: 'Xóa doanh nghiệp' };
    const element = document.getElementById('tenant-audit');
    element.hidden = false;
    element.innerHTML = logs.map(log => `<p><strong>${escapeHtml(names[log.action] || log.action)}</strong><span>${escapeHtml(new Date(log.createdAt).toLocaleString())}</span><span>Người thực hiện: ${escapeHtml(log.actorUserId)}</span>${log.fromOwnerId ? `<span>Chủ cũ: ${escapeHtml(log.fromOwnerId)} → Chủ mới: ${escapeHtml(log.toOwnerId || '—')}</span>` : ''}${log.reason ? `<span>Lý do: ${escapeHtml(log.reason)}</span>` : ''}</p>`).join('') || '<p>Chưa có nhật ký.</p>';
  } catch (error) { tenantFeedback(error.message, true); }
}
