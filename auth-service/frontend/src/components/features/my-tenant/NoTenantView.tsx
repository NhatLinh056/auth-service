import React, { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useToast } from '../../../contexts/ToastContext';
import { CreateTenantModal } from '../../modals/CreateTenantModal';
import {
  tenantsService,
  type TenantLookupResult,
  type TenantSummary,
} from '../../../services/tenants.service';

interface NoTenantViewProps {
  onCreated: (newTenant: TenantSummary) => void;
  onApplied: () => void;
}

export const NoTenantView: React.FC<NoTenantViewProps> = ({
  onCreated,
  onApplied,
}) => {
  const { lang } = useLanguage();
  const vi = lang === 'vi';
  const { showToast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Lookup state
  const [tenantIdInput, setTenantIdInput] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [verifiedTenant, setVerifiedTenant] = useState<TenantLookupResult | null>(null);

  // Submit apply state
  const [applying, setApplying] = useState(false);

  // UUID v4 format regex
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const handleVerifyId = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const id = tenantIdInput.trim();
    if (!id) {
      setLookupError(vi ? 'Vui lòng nhập Tenant ID UUID' : 'Please enter UUID Tenant ID');
      setVerifiedTenant(null);
      return;
    }

    if (!uuidRegex.test(id)) {
      setLookupError(vi ? 'Tenant ID phải là định dạng UUID hợp lệ (ví dụ: 8d262b9a-4e2a-4639-b94f-a728b762551f)' : 'Tenant ID must be a valid UUID format');
      setVerifiedTenant(null);
      return;
    }

    setLookupLoading(true);
    setLookupError(null);
    setVerifiedTenant(null);

    try {
      const result = await tenantsService.lookup(id);
      setVerifiedTenant(result);
    } catch (err: any) {
      setLookupError(err.message || (vi ? 'Không tìm thấy doanh nghiệp với Tenant ID này' : 'Tenant not found with this ID'));
      setVerifiedTenant(null);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleConfirmApply = async () => {
    if (!verifiedTenant) return;
    setApplying(true);
    try {
      await tenantsService.applyJoin(verifiedTenant.id);
      showToast(
        vi
          ? `Đã gửi yêu cầu xin gia nhập doanh nghiệp "${verifiedTenant.name}". Vui lòng chờ Chủ sở hữu phê duyệt!`
          : `Sent join request to "${verifiedTenant.name}". Please wait for Owner approval!`,
        'success',
      );
      onApplied();
    } catch (err: any) {
      showToast(err.message || (vi ? 'Không thể gửi yêu cầu gia nhập' : 'Failed to submit join request'), 'error');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div style={{ maxWidth: 840, margin: '20px auto' }}>
      <div className="card-panel" id="scene6ActionPanelClean">
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="panel-title" style={{ fontSize: 16 }}>
              {vi ? 'Tùy Chọn Khi Chưa Thuộc Doanh Nghiệp' : 'Options When Not In Organization'}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              {vi
                ? 'Bạn có thể tự tạo doanh nghiệp mới hoặc nhập Tenant ID để gửi yêu cầu gia nhập.'
                : 'You can create your own organization or enter a Tenant ID to request access.'}
            </p>
          </div>
          <span className="badge badge-secondary">
            {vi ? 'CHƯA CÓ TENANT' : 'NO TENANT'}
          </span>
        </div>

        <div className="panel-body" style={{ padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Option 1: Create Tenant */}
            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                padding: 24,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🏢</div>
                <strong style={{ fontSize: 16, color: '#fff', display: 'block', marginBottom: 8 }}>
                  {vi ? 'Tạo Doanh Nghiệp Mới' : 'Create New Tenant'}
                </strong>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 20px' }}>
                  {vi
                    ? 'Tạo doanh nghiệp của riêng bạn và tự động trở thành Chủ sở hữu (Tenant Owner) với toàn quyền quản trị thành viên.'
                    : 'Establish your own organization and automatically become Tenant Owner with complete member management rights.'}
                </p>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsCreateOpen(true)}
                style={{ width: '100%', padding: '10px 16px' }}
                id="btn-open-create-tenant-modal"
              >
                {vi ? '+ Tạo Doanh Nghiệp' : '+ Create Tenant'}
              </button>
            </div>

            {/* Option 2: Join by Tenant ID */}
            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                padding: 24,
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 36, marginBottom: 12, textAlign: 'center' }}>🔑</div>
                <strong style={{ fontSize: 16, color: '#fff', display: 'block', textAlign: 'center', marginBottom: 8 }}>
                  {vi ? 'Gia Nhập Theo Tenant ID' : 'Join by Tenant ID'}
                </strong>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 16px', textAlign: 'center' }}>
                  {vi
                    ? 'Nhập mã Tenant ID UUID do quản trị viên doanh nghiệp cung cấp để tra cứu thông tin và gửi yêu cầu gia nhập.'
                    : 'Enter the UUID Tenant ID provided by your organization admin to verify and send a join request.'}
                </p>

                {/* Input + Verify Button */}
                <form onSubmit={handleVerifyId} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input
                    type="text"
                    id="input-lookup-tenant-id"
                    placeholder={vi ? 'Nhập Tenant ID UUID...' : 'Enter UUID Tenant ID...'}
                    value={tenantIdInput}
                    onChange={(e) => {
                      setTenantIdInput(e.target.value);
                      if (lookupError) setLookupError(null);
                    }}
                    disabled={lookupLoading || applying}
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-medium)',
                      color: '#fff',
                      padding: '8px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontFamily: 'monospace',
                      flex: 1,
                    }}
                  />
                  <button
                    type="submit"
                    className="btn btn-secondary btn-sm"
                    disabled={lookupLoading || applying || !tenantIdInput.trim()}
                    id="btn-verify-tenant-id"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {lookupLoading ? (vi ? 'Đang tra...' : 'Checking...') : (vi ? 'Kiểm Tra' : 'Verify')}
                  </button>
                </form>

                {/* Error Banner */}
                {lookupError && (
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 6,
                      padding: '8px 12px',
                      fontSize: 12,
                      color: 'var(--danger)',
                      marginBottom: 12,
                    }}
                  >
                    {lookupError}
                  </div>
                )}

                {/* Verified Result Card (Scene 6 Wireframe) */}
                {verifiedTenant && (
                  <div
                    style={{
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: 6,
                      padding: '12px 14px',
                      marginBottom: 14,
                    }}
                  >
                    <div style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>
                      ✓ {vi ? 'TÌM THẤY DOANH NGHIỆP' : 'TENANT VERIFIED'}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginTop: 2 }}>
                      {verifiedTenant.name}
                    </div>
                    {verifiedTenant.description && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {verifiedTenant.description}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                      {vi ? 'Chủ sở hữu:' : 'Owner:'}{' '}
                      <strong style={{ color: '#e2e8f0' }}>{verifiedTenant.ownerName || verifiedTenant.ownerEmail}</strong>
                      {verifiedTenant.ownerName && verifiedTenant.ownerEmail && (
                        <code style={{ marginLeft: 4 }}>({verifiedTenant.ownerEmail})</code>
                      )}{' '}
                      | {vi ? 'Thành viên:' : 'Members:'} <strong>{verifiedTenant.memberCount}</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Apply Button */}
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmApply}
                disabled={!verifiedTenant || applying}
                id="btn-confirm-apply-tenant"
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  opacity: verifiedTenant ? 1 : 0.45,
                  cursor: verifiedTenant ? 'pointer' : 'not-allowed',
                }}
              >
                {applying
                  ? (vi ? 'Đang gửi yêu cầu...' : 'Submitting...')
                  : (vi ? 'Xác Nhận Gửi Yêu Cầu Gia Nhập' : 'Confirm & Submit Join Request')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal create tenant */}
      <CreateTenantModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={(newTenant) => {
          setIsCreateOpen(false);
          onCreated(newTenant);
        }}
      />
    </div>
  );
};
