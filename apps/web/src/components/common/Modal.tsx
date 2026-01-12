'use client';

import { useEffect, useRef, useCallback, ReactNode } from 'react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  const hasInitialFocus = useRef(false);

  // Use a ref for onClose to avoid re-running effects when the callback changes
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onCloseRef.current();
      }
    },
    [closeOnEscape]
  );

  useEffect(() => {
    if (isOpen) {
      // Only capture previous element and set initial focus once when modal first opens
      if (!wasOpen.current) {
        previousActiveElement.current = document.activeElement as HTMLElement;
        hasInitialFocus.current = false;
      }

      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      wasOpen.current = true;

      // Focus the modal for accessibility - only on initial open
      if (!hasInitialFocus.current) {
        hasInitialFocus.current = true;
        setTimeout(() => {
          modalRef.current?.focus();
        }, 0);
      }
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);

      // Only restore body overflow and focus when modal is actually closing
      if (wasOpen.current && !isOpen) {
        document.body.style.overflow = 'unset';
        if (previousActiveElement.current) {
          previousActiveElement.current.focus();
        }
        wasOpen.current = false;
        hasInitialFocus.current = false;
      }
    };
  }, [isOpen, handleEscape]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modal = modalRef.current;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    modal.addEventListener('keydown', handleTabKey);
    return () => modal.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnBackdrop) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`bg-card w-full ${sizeClasses[size]} shadow-2xl border-0 sm:border border-border animate-in fade-in zoom-in duration-200 flex flex-col outline-none min-h-screen sm:min-h-0 sm:h-auto sm:max-h-[85vh] sm:rounded-xl sm:m-6`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-border shrink-0">
          <h3 id="modal-title" className="text-lg sm:text-xl font-bold text-foreground pr-4">
            {title}
          </h3>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted shrink-0"
              aria-label="Close modal"
              type="button"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="p-4 sm:p-6 pt-0 sm:pt-0 border-t border-border shrink-0">
            <div className="pt-4">{footer}</div>
          </div>
        )}
      </div>
    </div>
  );
}
