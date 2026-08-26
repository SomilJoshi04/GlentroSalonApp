import React from 'react';
import { getImageUrl } from '../../../utils/imageUtils';

const VendorDetailsModal = ({ vendor, onClose }) => {
  if (!vendor) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      {/* Blurred overlay */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-md" 
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative bg-surface w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up-fade border border-border">
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border bg-background-alt/50 flex justify-between items-center sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            <button 
              onClick={onClose}
              className="sm:hidden p-2 -ml-2 rounded-full text-muted-text hover:text-on-surface hover:bg-surface-variant transition-colors shrink-0"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 overflow-hidden">
              {vendor.avatar ? (
                <img src={getImageUrl(vendor.avatar)} alt={vendor.businessName} className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-[20px] sm:text-[24px]">storefront</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-on-surface truncate">{vendor.businessName || vendor.name}</h2>
              <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 mt-0.5 sm:mt-1">
                <span className="text-xs font-medium text-muted-text truncate block">{vendor.email}</span>
                <span className="hidden sm:block w-1 h-1 rounded-full bg-border shrink-0"></span>
                <span className="text-xs font-medium text-muted-text truncate block">{vendor.phone}</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="hidden sm:flex p-2 rounded-full text-muted-text hover:text-on-surface hover:bg-surface-variant transition-colors shrink-0 ml-4"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* Business & Personal Info Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Personal Details */}
            <div className="bg-background-alt rounded-2xl p-5 border border-border">
              <h3 className="flex items-center gap-2 text-sm font-bold text-on-surface mb-4 uppercase tracking-wider">
                <span className="material-symbols-outlined text-primary text-[20px]">person</span>
                Vendor Details
              </h3>
              <div className="space-y-4">
                <DetailRow label="Full Name" value={vendor.name} />
                <DetailRow label="Role" value={vendor.role} className="capitalize" />
                <DetailRow label="Account Status" value={vendor.accountStatus} />
                <DetailRow 
                  label="Approval Status" 
                  value={
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${vendor.isApproved ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning-dark'}`}>
                      {vendor.isApproved ? 'Approved' : 'Pending'}
                    </span>
                  } 
                />
              </div>
            </div>

            {/* Business Details */}
            <div className="bg-background-alt rounded-2xl p-5 border border-border">
              <h3 className="flex items-center gap-2 text-sm font-bold text-on-surface mb-4 uppercase tracking-wider">
                <span className="material-symbols-outlined text-primary text-[20px]">business</span>
                Business Details
              </h3>
              <div className="space-y-4">
                <DetailRow label="Business Type" value={vendor.businessType ? vendor.businessType.replace('_', ' ') : 'N/A'} className="capitalize" />
                <DetailRow label="Business Email" value={vendor.businessEmail || 'N/A'} />
                <DetailRow label="Business Contact" value={vendor.businessContact || 'N/A'} />
                <DetailRow label="Total Salons" value={`${vendor.salonCount || 0} Salons`} />
              </div>
            </div>

          </div>

          {/* Location & Address */}
          <div className="bg-background-alt rounded-2xl p-5 border border-border">
            <h3 className="flex items-center gap-2 text-sm font-bold text-on-surface mb-4 uppercase tracking-wider">
              <span className="material-symbols-outlined text-primary text-[20px]">location_on</span>
              Address & Location
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <DetailRow label="Registered Address" value={vendor.registeredAddress || 'Not provided'} block />
              </div>
              <DetailRow label="City" value={vendor.city || 'N/A'} />
              <DetailRow label="State" value={vendor.state || 'N/A'} />
              <DetailRow label="Country" value={vendor.country || 'N/A'} />
            </div>
          </div>

          {/* KYC Documents */}
          <div className="bg-background-alt rounded-2xl p-5 border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-on-surface uppercase tracking-wider">
                <span className="material-symbols-outlined text-primary text-[20px]">verified_user</span>
                KYC Documents
              </h3>
              <span className={`px-2.5 py-1 text-xs font-bold rounded-lg uppercase tracking-wide flex items-center gap-1.5 ${
                  vendor.kycStatus === 'verified' ? 'bg-green-50 text-green-700 border border-green-200' : 
                  vendor.kycStatus === 'submitted' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 
                  vendor.kycStatus === 'rejected' ? 'bg-red-50 text-red-700 border border-red-200' : 
                  'bg-yellow-50 text-yellow-700 border border-yellow-200'
                }`}>
                {vendor.kycStatus || 'Pending'}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <DetailRow label="Aadhaar Number" value={vendor.kyc?.aadhaarNumber || 'Not provided'} />
                <div className="flex gap-4">
                  <DocumentPreview label="Aadhaar Front" url={vendor.kyc?.aadhaarFront} />
                  <DocumentPreview label="Aadhaar Back" url={vendor.kyc?.aadhaarBack} />
                </div>
              </div>
              <div className="space-y-4">
                <DetailRow label="PAN Number" value={vendor.kyc?.panNumber || 'Not provided'} />
                <DocumentPreview label="PAN Card" url={vendor.kyc?.panCard} />
              </div>
            </div>
            {vendor.kycRejectReason && (
              <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded-xl text-sm text-error">
                <span className="font-bold">Rejection Reason:</span> {vendor.kycRejectReason}
              </div>
            )}
          </div>

          {/* Bank Details */}
          <div className="bg-background-alt rounded-2xl p-5 border border-border">
            <h3 className="flex items-center gap-2 text-sm font-bold text-on-surface mb-4 uppercase tracking-wider">
              <span className="material-symbols-outlined text-primary text-[20px]">account_balance</span>
              Bank & Payout Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <DetailRow label="Account Holder" value={vendor.bank?.accountHolderName || 'N/A'} />
              <DetailRow label="Bank Name" value={vendor.bank?.bankName || 'N/A'} />
              <DetailRow label="Account Number" value={vendor.bank?.accountNumber || 'N/A'} />
              <DetailRow label="IFSC Code" value={vendor.bank?.ifscCode || 'N/A'} />
              <DetailRow label="Branch" value={vendor.bank?.bankBranch || 'N/A'} />
              <DetailRow label="UPI ID" value={vendor.bank?.upiId || 'N/A'} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// Helper component for label/value rows
const DetailRow = ({ label, value, className = '', block = false }) => (
  <div className={`flex ${block ? 'flex-col gap-1' : 'flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4'}`}>
    <span className="text-xs font-medium text-muted-text">{label}</span>
    <span className={`text-sm font-semibold text-on-surface ${className}`}>{value}</span>
  </div>
);

// Helper component for document thumbnails
const DocumentPreview = ({ label, url }) => {
  return (
    <div className="flex-1">
      <span className="block text-xs font-medium text-muted-text mb-2">{label}</span>
      {url ? (
        <a 
          href={getImageUrl(url)} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block relative rounded-xl border border-border overflow-hidden bg-surface-variant aspect-[3/2] group"
        >
          <img 
            src={getImageUrl(url)} 
            alt={label} 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="material-symbols-outlined text-white">open_in_new</span>
          </div>
        </a>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-surface-variant/50 aspect-[3/2] flex flex-col items-center justify-center text-muted-text">
          <span className="material-symbols-outlined text-[24px] mb-1 opacity-50">description</span>
          <span className="text-[10px] uppercase font-bold tracking-wider">No Doc</span>
        </div>
      )}
    </div>
  );
};

export default VendorDetailsModal;
