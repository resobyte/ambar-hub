'use client';

import { useState, useCallback, ReactNode } from 'react';
import { Modal, ModalSize } from './Modal';
import { Button } from './Button';

type ConfirmVariant = 'default' | 'destructive';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message?: string;
  children?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  size?: ModalSize;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  children,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  size = 'sm',
}: ConfirmModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = useCallback(async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Confirm action failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onConfirm, onClose]);

  const handleCancel = useCallback(() => {
    if (!isLoading) {
      onClose();
    }
  }, [isLoading, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={title}
      size={size}
      closeOnBackdrop={!isLoading}
      closeOnEscape={!isLoading}
      showCloseButton={!isLoading}
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant === 'destructive' ? 'destructive' : 'primary'}
            onClick={handleConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      }
    >
      {message && (
        <p className="text-muted-foreground">{message}</p>
      )}
      {children}
    </Modal>
  );
}

interface UseConfirmModalOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  size?: ModalSize;
}

interface UseConfirmModalReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  ConfirmModalComponent: React.FC<{ onConfirm: () => void | Promise<void>; children?: ReactNode }>;
}

export function useConfirmModal(options: UseConfirmModalOptions): UseConfirmModalReturn {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const ConfirmModalComponent: React.FC<{ onConfirm: () => void | Promise<void>; children?: ReactNode }> = useCallback(
    ({ onConfirm, children }) => (
      <ConfirmModal
        isOpen={isOpen}
        onClose={close}
        onConfirm={onConfirm}
        title={options.title}
        message={options.message}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        variant={options.variant}
        size={options.size}
      >
        {children}
      </ConfirmModal>
    ),
    [isOpen, close, options]
  );

  return { isOpen, open, close, ConfirmModalComponent };
}
