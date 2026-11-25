import { useEffect } from 'react';
import type React from 'react';

/**
 * Shared modal keyboard (Escape) and focus restoration hook.
 * Always call before any conditional early return in modal components.
 */
export function useModalA11y(
  isOpen: boolean,
  onClose: () => void,
  disabled = false,
): { handleBackdropClick: (e: React.MouseEvent<HTMLDivElement>) => void } {
  useEffect(() => {
    if (!isOpen) return;
    const previousActive = document.activeElement as HTMLElement | null;
    return () => {
      if (previousActive && typeof previousActive.focus === 'function') {
        previousActive.focus();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || disabled) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, disabled, onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !disabled) {
      onClose();
    }
  };

  return { handleBackdropClick };
}
