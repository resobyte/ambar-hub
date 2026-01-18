'use client';

import { useEffect, ReactNode, useState } from 'react';
import { Skeleton } from './Skeleton';

export type ModalSize = 'small' | 'medium' | 'large' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    footer?: ReactNode;
    size?: ModalSize;
    closeOnBackdrop?: boolean;
}

const sizeMap: Record<string, string> = {
    small: 'small',
    medium: 'medium',
    large: 'large',
    sm: 'small',
    md: 'medium',
    lg: 'large',
    xl: 'large',
    full: 'large',
};

export function Modal({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'medium',
    closeOnBackdrop = true,
}: ModalProps) {
    const [BlDialog, setBlDialog] = useState<any>(null);
    const mappedSize = sizeMap[size] || 'medium';

    useEffect(() => {
        import('@trendyol/baklava/dist/baklava-react').then((mod) => {
            setBlDialog(() => mod.BlDialog);
        }).catch(console.error);
    }, []);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    // Fallback to Skeleton until Baklava loads
    if (!BlDialog) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                <Skeleton height={200} width={400} className="rounded-xl" />
            </div>
        );
    }

    return (
        <BlDialog
            open={isOpen}
            caption={title}
            size={mappedSize as any}
            onBlClose={onClose}
            onBlOverlayClick={closeOnBackdrop ? onClose : undefined}
        >
            <div className="p-4">{children}</div>
            {footer && (
                <div slot="footer" className="flex gap-2 justify-end">
                    {footer}
                </div>
            )}
        </BlDialog>
    );
}

Modal.displayName = 'Modal';
