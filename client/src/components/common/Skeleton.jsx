import React from 'react';

// Base Skeleton Primitive
export const Skeleton = ({ className = '', style = {}, rounded = 'rounded-md', ...props }) => {
  return (
    <div
      className={`bg-surface-variant/80 animate-pulse-soft overflow-hidden relative ${rounded} ${className}`}
      style={{
        ...style,
      }}
      {...props}
    >
      {/* Optional shimmer effect across the skeleton */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
};

// Common Text Skeleton
export const SkeletonText = ({ lines = 1, className = '', lineClassName = 'h-4', lastLineShort = true }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={`${lineClassName} ${lastLineShort && i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full'}`} 
        />
      ))}
    </div>
  );
};

// Common Avatar/Circle Skeleton
export const SkeletonAvatar = ({ size = 'w-12 h-12', className = '' }) => {
  return <Skeleton rounded="rounded-full" className={`${size} ${className}`} />;
};

// Common Image/Thumbnail Skeleton
export const SkeletonImage = ({ className = 'w-full aspect-video', rounded = 'rounded-xl' }) => {
  return <Skeleton rounded={rounded} className={className} />;
};

// Common Button Skeleton
export const SkeletonButton = ({ className = 'w-24 h-10', rounded = 'rounded-xl' }) => {
  return <Skeleton rounded={rounded} className={className} />;
};
