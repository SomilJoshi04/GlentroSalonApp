import React from 'react';
import { Skeleton, SkeletonText, SkeletonAvatar } from '../../../../components/common/Skeleton';

export const BookingSkeleton = () => {
  return (
    <div className="bg-background min-h-screen pb-[180px] w-full max-w-container-max mx-auto relative pt-4">
      <main className="px-4 md:px-margin-desktop">
        {/* Staff Selection Skeleton */}
        <section className="mb-6">
          <SkeletonText lines={1} className="w-24 mb-2" lineClassName="h-3" />
          <div className="flex items-center gap-4 p-4 rounded-xl border border-border shadow-sm">
            <SkeletonAvatar size="w-12 h-12" />
            <div className="flex-1">
              <SkeletonText lines={1} className="w-48 mb-1" lineClassName="h-4" />
              <SkeletonText lines={1} className="w-24" lineClassName="h-3" />
            </div>
          </div>
        </section>

        {/* Date Selector Skeleton */}
        <section className="mb-8">
          <div className="flex justify-between items-end mb-4">
            <SkeletonText lines={1} className="w-32" lineClassName="h-6" />
          </div>
          <div className="flex overflow-x-auto gap-3 pb-2 hide-scrollbar">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="w-[64px] h-[84px] shrink-0 rounded-[18px]" />
            ))}
          </div>
        </section>

        {/* Time Slots Skeleton */}
        <section className="flex flex-col gap-6">
          <div>
            <SkeletonText lines={1} className="w-24 mb-3" lineClassName="h-4" />
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </div>
          </div>
          <div>
            <SkeletonText lines={1} className="w-24 mb-3 mt-2" lineClassName="h-4" />
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer CTA Skeleton */}
      <div className="fixed bottom-[72px] md:bottom-0 left-0 w-full max-w-container-max md:left-1/2 md:-translate-x-1/2 bg-surface/95 border-t border-border p-4 pb-6 shadow-elevated z-40">
        <Skeleton className="w-full h-[56px] rounded-xl" />
      </div>
    </div>
  );
};
