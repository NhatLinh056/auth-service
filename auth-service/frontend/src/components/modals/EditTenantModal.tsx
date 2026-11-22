import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { tenantsService, type TenantSummary } from '../../services/tenants.service';

interface EditTenantModalProps {
  tenant: TenantSummary;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: TenantSummary) => void;
}

export const EditTenantModal: React.FC<EditTenantModalProps> = ({
  tenant,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { lang } = useLanguage();
  const vi = lang === 'vi';
  const { showToast } = useToast();

  const [name, setName] = useState(tenant.name || '');
  const [description, setDescription] = useState(tenant.description || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(tenant.name || '');
    setDescription(tenant.description || '');
  }, [tenant]);

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
      const updated = await tenantsService.update(tenant.id, {
        name: trimmedName,
        description: description.trim() || undefined,
      });
      showToast(
        vi ? 'Đã cập nhật thông tin doanh nghiệp thành công!' : 'Tenant details updated successfully!',
        'success',
      );
      onSuccess(updated);
    } catch (err: any) {
      showToast(err.message || (vi ? 'Không thể cập nhật doanh nghiệp' : 'Failed to update tenant'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop show" id="edit-tenant-modal">
      <div className="modal-content" style={{ maxWidth: 520 }}>
        <h3 className="modal-title">
          {vi ? 'Chỉnh Sửa Thông Tin Doanh Nghiệp' : 'Edit Tenant Information'}
        </h3>
        <p className="modal-desc">
          {vi
            ? 'Cập nhật tên và mô tả hoạt động của doanh nghiệp này.'
            : 'Update the name and description of this tenant.'}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" htmlFor="edit-tenant-name">
              {vi ? 'Tên Doanh Nghiệp' : 'Tenant Name'}{' '}
              <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="text"
              id="edit-tenant-name"
              className="form-control"
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label" htmlFor="edit-tenant-desc">
              {vi ? 'Mô Tả Doanh Nghiệp' : 'Description'}
            </label>
            <textarea
              id="edit-tenant-desc"
              className="form-control"
              rows={3}
              maxLength={500}
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
              id="btn-confirm-edit-tenant"
            >
              {loading ? (vi ? 'Đang lưu...' : 'Saving...') : (vi ? 'Lưu Thay Đổi' : 'Save Changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
