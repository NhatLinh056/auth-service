import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { tenantsService, type TenantSummary } from '../../services/tenants.service';

interface CreateTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newTenant: TenantSummary) => void;
}

export const CreateTenantModal: React.FC<CreateTenantModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { lang } = useLanguage();
  const vi = lang === 'vi';
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast(vi ? 'Tên doanh nghiệp không được để trống' : 'Tenant name cannot be empty', 'error');
      return;
    }

    setLoading(true);
    try {
      const created = await tenantsService.create({
        name: trimmedName,
        description: description.trim() || undefined,
      });
      showToast(
        vi ? `Đã tạo doanh nghiệp "${created.name}" thành công!` : `Created tenant "${created.name}" successfully!`,
        'success',
      );
      setName('');
      setDescription('');
      onSuccess(created);
    } catch (err: any) {
      showToast(err.message || (vi ? 'Không thể tạo doanh nghiệp' : 'Failed to create tenant'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop show" id="create-tenant-modal">
      <div className="modal-content" style={{ maxWidth: 520 }}>
        <h3 className="modal-title">
          {vi ? 'Tạo Doanh Nghiệp Mới' : 'Create New Tenant'}
        </h3>
        <p className="modal-desc">
          {vi
            ? 'Bạn sẽ tự động trở thành Chủ sở hữu (Tenant Owner) với toàn quyền quản trị thành viên và thiết lập doanh nghiệp.'
            : 'You will automatically become the Tenant Owner with full administrative control over members and settings.'}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" htmlFor="new-tenant-name">
              {vi ? 'Tên Doanh Nghiệp / Tổ Chức' : 'Tenant / Organization Name'}{' '}
              <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="text"
              id="new-tenant-name"
              className="form-control"
              required
              maxLength={120}
              placeholder={vi ? 'Ví dụ: Global Corp, Acme Studio...' : 'e.g. Global Corp, Acme Studio...'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label" htmlFor="new-tenant-desc">
              {vi ? 'Mô Tả Doanh Nghiệp' : 'Description'}
            </label>
            <textarea
              id="new-tenant-desc"
              className="form-control"
              rows={3}
              maxLength={500}
              placeholder={vi ? 'Mô tả ngắn gọn về lĩnh vực hoạt động (tùy chọn)...' : 'Brief description of the organization (optional)...'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              {vi ? 'Hủy' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !name.trim()}
              id="btn-confirm-create-tenant"
            >
              {loading ? (vi ? 'Đang tạo...' : 'Creating...') : (vi ? 'Xác Nhận Tạo' : 'Create Tenant')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
