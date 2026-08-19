import React from 'react';
import { Skeleton, SkeletonText, SkeletonAvatar } from '../../../../components/common/Skeleton';

export const NotificationSkeleton = () => {
  return (
    <div className="space-y-6 w-full px-4 md:px-margin-desktop pb-[100px] pt-4">
      <SkeletonText lines={1} className="w-48 mb-6 hidden md:block" lineClassName="h-8" />
      
      <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden divide-y divide-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-4 flex gap-4 items-start">
            <SkeletonAvatar size="w-12 h-12" className="shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <SkeletonText lines={1} className="w-3/4" lineClassName="h-4" />
              <SkeletonText lines={1} className="w-1/2" lineClassName="h-3" />
            </div>
            <Skeleton className="w-2 h-2 rounded-full shrink-0 mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
};
