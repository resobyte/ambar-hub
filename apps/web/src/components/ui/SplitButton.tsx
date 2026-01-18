'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';
import { Button, ButtonVariant, ButtonSize } from './Button';

export interface SplitButtonAction {
    label: string;
    icon?: string;
    onClick: () => void;
    disabled?: boolean;
}

interface SplitButtonProps {
    label: string;
    icon?: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    onClick: () => void;
    actions: SplitButtonAction[];
}

export function SplitButton({
    label,
    icon,
    variant = 'primary',
    size = 'medium',
    disabled = false,
    loading = false,
    onClick,
    actions,
}: SplitButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleActionClick = (action: SplitButtonAction) => {
        action.onClick();
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className="relative inline-flex" data-split-button>
            <div className="flex">
                <Button
                    variant={variant}
                    size={size}
                    icon={icon}
                    disabled={disabled}
                    loading={loading}
                    onClick={onClick}
                >
                    {label}
                </Button>
                <button
                    type="button"
                    disabled={disabled || loading}
                    onClick={() => setIsOpen(!isOpen)}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    className={`
                        inline-flex items-center justify-center px-2
                        border-l border-white/20
                        rounded-r-lg -ml-px
                        ${variant === 'primary' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}
                        ${variant === 'secondary' ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' : ''}
                        ${variant === 'danger' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
                        ${size === 'small' ? 'h-8' : size === 'large' ? 'h-12' : 'h-10'}
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-colors
                    `}
                >
                    <svg
                        className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    ref={menuRef}
                    className="absolute top-full right-0 mt-1 min-w-[160px] bg-card border border-border rounded-lg shadow-lg z-50 py-1"
                    role="menu"
                >
                    {actions.map((action, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={() => handleActionClick(action)}
                            disabled={action.disabled}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            role="menuitem"
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

SplitButton.displayName = 'SplitButton';
