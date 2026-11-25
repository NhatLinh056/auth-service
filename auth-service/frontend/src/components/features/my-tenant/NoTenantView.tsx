import React, { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useToast } from '../../../contexts/ToastContext';
import { CreateTenantModal } from '../../modals/CreateTenantModal';
import { IconBuilding, IconCheck, IconKey, IconPlus } from '../../common/Icons';
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
    <div className="page-container page-container--narrow">
      <div className="card-panel" id="scene6ActionPanelClean">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">
              {vi ? 'Tùy Chọn Khi Chưa Thuộc Doanh Nghiệp' : 'Options When Not In Organization'}
            </h2>
            <p className="card-subtitle">
              {vi
                ? 'Bạn có thể tự tạo doanh nghiệp mới hoặc nhập Tenant ID để gửi yêu cầu gia nhập.'
                : 'You can create your own organization or enter a Tenant ID to request access.'}
            </p>
          </div>
          <span className="badge badge-secondary">
            {vi ? 'CHƯA CÓ TENANT' : 'NO TENANT'}
          </span>
        </div>

        <div className="panel-body">
          <div className="grid-2-col">
            {/* Option 1: Create Tenant */}
            <div className="option-tile option-tile-center">
              <div>
                <div className="icon-well icon-well--lg">
                  <IconBuilding size={22} />
                </div>
                <strong style={{ fontSize: 16, color: 'var(--text-main)', display: 'block', marginBottom: 8 }}>
                  {vi ? 'Tạo Doanh Nghiệp Mới' : 'Create New Tenant'}
                </strong>
                <p className="card-subtitle" style={{ marginBottom: 16 }}>
                  {vi
                    ? 'Tạo doanh nghiệp của riêng bạn và tự động trở thành Chủ sở hữu (Tenant Owner) với toàn quyền quản trị thành viên.'
                    : 'Establish your own organization and automatically become Tenant Owner with complete member management rights.'}
                </p>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => setIsCreateOpen(true)}
                id="btn-open-create-tenant-modal"
              >
                <IconPlus size={14} />
                <span>{vi ? 'Tạo Doanh Nghiệp' : 'Create Tenant'}</span>
              </button>
            </div>

            {/* Option 2: Join by Tenant ID */}
            <div className="option-tile">
              <div>
                <div className="option-tile-center">
                  <div className="icon-well icon-well--lg icon-well--teal">
                    <IconKey size={22} />
                  </div>
                  <strong style={{ fontSize: 16, color: 'var(--text-main)', display: 'block', marginBottom: 8 }}>
                    {vi ? 'Gia Nhập Theo Tenant ID' : 'Join by Tenant ID'}
                  </strong>
                  <p className="card-subtitle" style={{ marginBottom: 16 }}>
                    {vi
                      ? 'Nhập mã Tenant ID UUID do quản trị viên doanh nghiệp cung cấp để tra cứu thông tin và gửi yêu cầu gia nhập.'
                      : 'Enter the UUID Tenant ID provided by your organization admin to verify and send a join request.'}
                  </p>
                </div>

                {/* Input + Verify Button */}
                <form onSubmit={handleVerifyId} className="inline-code-row" style={{ width: '100%', marginBottom: 12 }}>
                  <input
                    type="text"
                    id="input-lookup-tenant-id"
                    className="form-control form-control-mono"
                    placeholder={vi ? 'Nhập Tenant ID UUID...' : 'Enter UUID Tenant ID...'}
                    value={tenantIdInput}
                    onChange={(e) => {
                      setTenantIdInput(e.target.value);
                      if (lookupError) setLookupError(null);
                    }}
                    disabled={lookupLoading || applying}
                  />
                  <button
                    type="submit"
                    className="btn btn-secondary btn-sm"
                    disabled={lookupLoading || applying || !tenantIdInput.trim()}
                    id="btn-verify-tenant-id"
                  >
                    {lookupLoading ? (vi ? 'Đang tra…' : 'Checking…') : (vi ? 'Kiểm Tra' : 'Verify')}
                  </button>
                </form>

                {/* Error Banner */}
                {lookupError && (
                  <div className="info-banner info-banner--danger" role="alert" style={{ marginBottom: 12 }}>
                    {lookupError}
                  </div>
                )}

                {/* Verified Result Card */}
                {verifiedTenant && (
                  <div className="info-banner info-banner--success" style={{ flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                    <div className="inline-code-row" style={{ fontWeight: 600, fontSize: 12 }}>
                      <IconCheck size={13} />
                      <span>{vi ? 'TÌM THẤY DOANH NGHIỆP' : 'TENANT VERIFIED'}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>
                      {verifiedTenant.name}
                    </div>
                    {verifiedTenant.description && (
                      <div className="card-subtitle" style={{ margin: 0 }}>
                        {verifiedTenant.description}
                      </div>
                    )}
                    <div className="form-hint" style={{ marginTop: 2 }}>
                      {vi ? 'Chủ sở hữu:' : 'Owner:'}{' '}
                      <strong style={{ color: 'var(--text-main)' }}>{verifiedTenant.ownerName || verifiedTenant.ownerEmail}</strong>
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
                className="btn btn-primary btn-block"
                onClick={handleConfirmApply}
                disabled={!verifiedTenant || applying}
                id="btn-confirm-apply-tenant"
              >
                {applying
                  ? (vi ? 'Đang gửi yêu cầu…' : 'Submitting…')
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
