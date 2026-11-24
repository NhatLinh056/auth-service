import React, { useEffect, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  const { lang } = useLanguage();
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  // Focus cancel button on open for safety on destructive actions
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        cancelBtnRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen || isLoading) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const defaultConfirmText =
    confirmText || (lang === 'vi' ? 'Xác nhận' : 'Confirm');
  const defaultCancelText =
    cancelText || (lang === 'vi' ? 'Hủy bỏ' : 'Cancel');

  const btnConfirmClass =
    variant === 'danger'
      ? 'btn btn-danger'
      : variant === 'warning'
      ? 'btn btn-warning'
      : 'btn btn-primary';

  const iconBg =
    variant === 'danger'
      ? 'rgba(239, 68, 68, 0.15)'
      : variant === 'warning'
      ? 'rgba(245, 158, 11, 0.15)'
      : 'rgba(59, 130, 246, 0.15)';

  const iconColor =
    variant === 'danger'
      ? '#ef4444'
      : variant === 'warning'
      ? '#f59e0b'
      : '#3b82f6';

  return (
    <div
      className="modal-backdrop show"
      onClick={() => {
        if (!isLoading) onClose();
      }}
      style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 480,
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
          border: '1px solid var(--border-subtle, #334155)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: iconBg,
              color: iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {variant === 'danger' ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            ) : variant === 'warning' ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <h3
              id="confirm-dialog-title"
              className="modal-title"
              style={{ fontSize: 18, margin: '0 0 8px 0', color: '#fff' }}
            >
              {title}
            </h3>
            <div
              className="modal-desc"
              style={{
                fontSize: 14,
                lineHeight: 1.5,
                color: 'var(--text-dim, #94a3b8)',
                margin: '0 0 20px 0',
              }}
            >
              {message}
            </div>
          </div>
        </div>

        <div
          className="modal-actions"
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            marginTop: 8,
          }}
        >
          <button
            ref={cancelBtnRef}
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isLoading}
            style={{ padding: '8px 16px', minWidth: 80 }}
          >
            {defaultCancelText}
          </button>

          <button
            type="button"
            className={btnConfirmClass}
            onClick={async () => {
              await onConfirm();
            }}
            disabled={isLoading}
            style={{ padding: '8px 18px', minWidth: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            {isLoading && (
              <span
                style={{
                  width: 14,
                  height: 14,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  display: 'inline-block',
                }}
              />
            )}
            <span>{defaultConfirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
