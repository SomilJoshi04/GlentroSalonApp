import React from 'react';
import { Skeleton, SkeletonText } from '../../../../components/common/Skeleton';

export const BookingListSkeleton = () => {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-surface rounded-2xl p-5 border border-border shadow-sm flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <SkeletonText lines={1} className="w-48" lineClassName="h-5" />
              <div className="flex gap-2">
                <SkeletonText lines={1} className="w-24" lineClassName="h-4" />
                <SkeletonText lines={1} className="w-32" lineClassName="h-4" />
              </div>
            </div>
            <Skeleton className="w-20 h-6 rounded-full" />
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <SkeletonText lines={1} className="w-24" lineClassName="h-4" />
            <SkeletonText lines={1} className="w-16" lineClassName="h-5" />
          </div>
        </div>
      ))}
    </div>
  );
};
