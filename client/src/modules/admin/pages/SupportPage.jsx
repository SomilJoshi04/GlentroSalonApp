import React from 'react';

const SupportPage = () => {
  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-md text-[28px] text-on-surface">Support & Tickets</h1>
          <p className="font-body-md text-muted-text mt-1">Manage vendor and customer support requests.</p>
        </div>
      </div>
      
      <div className="bg-surface rounded-2xl border border-border p-12 flex flex-col items-center justify-center text-center shadow-sm">
        <div className="w-16 h-16 bg-surface-variant rounded-full flex items-center justify-center mb-4 text-muted-text">
          <span className="material-symbols-outlined text-[32px]">headset_mic</span>
        </div>
        <h3 className="font-headline-sm text-[18px] text-on-surface mb-2">No Support Tickets</h3>
        <p className="font-body-sm text-muted-text max-w-md">
          There are currently no open support tickets. All issues have been resolved.
        </p>
      </div>
    </div>
  );
};

export default SupportPage;
