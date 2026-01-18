'use client';

import ContentLoader, { IContentLoaderProps } from 'react-content-loader';

interface SkeletonProps extends IContentLoaderProps {
    className?: string;
    width?: string | number;
    height?: string | number;
    variant?: 'rect' | 'circle';
}

export const Skeleton = ({
    className,
    width = '100%',
    height = '100%',
    variant = 'rect',
    backgroundColor = 'var(--bl-color-neutral-lighter, #f3f3f3)',
    foregroundColor = 'var(--bl-color-neutral-light, #ecebeb)',
    ...props
}: SkeletonProps) => {
    return (
        <div className={className} style={{ width: typeof width === 'number' ? `${width}px` : width, height: typeof height === 'number' ? `${height}px` : height }}>
            <ContentLoader
                speed={2}
                width="100%"
                height="100%"
                backgroundColor={backgroundColor}
                foregroundColor={foregroundColor}
                backgroundOpacity={0.5}
                {...props}
            >
                {variant === 'circle' ? (
                    <circle cx="50%" cy="50%" r="50%" />
                ) : (
                    <rect x="0" y="0" rx="4" ry="4" width="100%" height="100%" />
                )}
            </ContentLoader>
        </div>
    );
};
