import React from 'react';
import { Skeleton, SkeletonImage, SkeletonText, SkeletonAvatar } from '../../../../components/common/Skeleton';

export const SalonDetailSkeleton = () => {
  return (
    <div className="bg-background min-h-screen pb-[100px]">
      {/* Hero Skeleton */}
      <SkeletonImage className="h-[320px] w-full" rounded="rounded-none" />

      <div className="relative -mt-10 bg-background rounded-t-[32px] pt-8 px-4 md:px-margin-desktop flex flex-col gap-8 z-20">
        {/* Salon Header */}
        <header className="flex gap-4 items-center">
          <SkeletonAvatar size="w-16 h-16" className="shrink-0" />
          <div className="flex flex-col flex-1 gap-2">
            <SkeletonText lines={1} className="w-3/4" lineClassName="h-6" />
            <SkeletonText lines={1} className="w-1/2" lineClassName="h-4" />
          </div>
        </header>

        {/* Navigation Tabs Skeleton */}
        <div className="flex gap-6 pb-2 border-b border-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="w-16 h-5 rounded-md" />
          ))}
        </div>

        {/* Services List Skeleton */}
        <section className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center p-4 rounded-xl border border-border shadow-sm">
              <div className="flex flex-col flex-1 pr-4 gap-2">
                <SkeletonText lines={1} className="w-2/3" lineClassName="h-5" />
                <SkeletonText lines={1} className="w-1/3" lineClassName="h-3" />
                <SkeletonText lines={1} className="w-1/4" lineClassName="h-4" />
              </div>
              <SkeletonAvatar size="w-10 h-10" />
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};
