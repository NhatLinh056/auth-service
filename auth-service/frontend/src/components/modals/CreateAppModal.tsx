import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { applicationsService } from '../../services/applications.service';
import type { Application } from '../../types/application.types';

interface CreateAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newApp: Application) => void;
}

export const CreateAppModal: React.FC<CreateAppModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const newApp = await applicationsService.create({ name: name.trim() });
      showToast(`"${newApp.name}" ${t('toasts.app_created')}`);
      setName('');
      onSuccess(newApp);
    } catch (err: any) {
      showToast(err.message || 'Failed to create application', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop show" id="create-app-modal">
      <div className="modal-content">
        <h3 className="modal-title">{t('create_app.title')}</h3>
        <p className="modal-desc">{t('create_app.desc')}</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('create_app.name_label')}</label>
            <input
              type="text"
              className="form-control"
              id="new-app-name"
              required
              placeholder={t('create_app.placeholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              autoFocus
            />
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
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? '...' : t('apps.create_btn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
