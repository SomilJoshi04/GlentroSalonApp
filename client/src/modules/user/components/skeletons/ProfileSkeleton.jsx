import React from 'react';
import { Skeleton, SkeletonText, SkeletonAvatar } from '../../../../components/common/Skeleton';

export const ProfileSkeleton = () => {
  return (
    <div className="w-full max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto flex flex-col pb-4 pt-4 space-y-6">
      <SkeletonText lines={1} className="w-32 hidden md:block mb-8" lineClassName="h-8" />
      
      {/* Profile Header Skeleton */}
      <div className="bg-surface rounded-3xl p-6 border border-border shadow-sm flex flex-col items-center justify-center text-center">
        <SkeletonAvatar size="w-24 h-24" className="mb-4" />
        <SkeletonText lines={1} className="w-48 mb-2" lineClassName="h-6" />
        <SkeletonText lines={1} className="w-32 mb-4" lineClassName="h-4" />
        <Skeleton className="w-32 h-10 rounded-full" />
      </div>

      {/* Form Fields Skeleton */}
      <div className="bg-surface rounded-3xl p-6 border border-border shadow-sm space-y-5">
        <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
          <SkeletonText lines={1} className="w-40" lineClassName="h-6" />
        </div>
        
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonText lines={1} className="w-24" lineClassName="h-4" />
            <Skeleton className="w-full h-12 rounded-xl" />
          </div>
        ))}

        <Skeleton className="w-full h-12 rounded-xl mt-4" />
      </div>
    </div>
  );
};
