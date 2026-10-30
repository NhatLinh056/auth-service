import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { rolesService } from '../../services/roles.service';
import type { User, Role } from '../../types/auth.types';

interface AssignRoleModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedUser: User) => void;
}

export const AssignRoleModal: React.FC<AssignRoleModalProps> = ({
  user,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [selectedRole, setSelectedRole] = useState<Role>('USER');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setSelectedRole(user.role);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      await rolesService.assignRole(user.id, selectedRole);
      showToast(
        `${t('toasts.status_updated')} ${
          selectedRole === 'ADMIN' ? t('table.role_admin') : t('table.role_user')
        }.`,
      );
      onSuccess({ ...user, role: selectedRole });
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to update role', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop show" id="assign-role-modal">
      <div className="modal-content">
        <h3 className="modal-title">{t('role_modal.title')}</h3>
        <p className="modal-desc">
          <span>{t('role_modal.desc_prefix')}</span> <strong>{user.email}</strong>
        </p>

        <div className="form-group">
          <label className="form-label">{t('role_modal.select_label')}</label>
          <select
            className="form-control"
            id="role-modal-select"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as Role)}
            disabled={loading}
          >
            <option value="USER">{t('table.role_user')}</option>
            <option value="ADMIN">{t('table.role_admin')}</option>
          </select>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            {t('modal.cancel')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? '...' : t('modal.save')}
          </button>
        </div>
      </div>
    </div>
  );
};
