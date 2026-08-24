import { useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { updateVendorKyc } from '../../services/vendorApi';
import { getImageUrl } from '../../../../utils/imageUtils';
import toast from 'react-hot-toast';

const KycTab = ({ onProfileUpdate }) => {
  const { vendor } = useAuth();
  
  const [form, setForm] = useState({
    aadhaarNumber: vendor?.kyc?.aadhaarNumber || '',
    panNumber: vendor?.kyc?.panNumber || ''
  });
  
  const [files, setFiles] = useState({
    aadhaarFront: null,
    aadhaarBack: null,
    panCard: null
  });

  const [saving, setSaving] = useState(false);

  const handleFileChange = (e, field) => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({ ...prev, [field]: e.target.files[0] }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = new FormData();
      data.append('aadhaarNumber', form.aadhaarNumber);
      data.append('panNumber', form.panNumber);
      
      if (files.aadhaarFront) data.append('aadhaarFront', files.aadhaarFront);
      if (files.aadhaarBack) data.append('aadhaarBack', files.aadhaarBack);
      if (files.panCard) data.append('panCard', files.panCard);

      const r = await updateVendorKyc(data);
      onProfileUpdate(r.data.data);
      toast.success('KYC details updated successfully.');
      setFiles({ aadhaarFront: null, aadhaarBack: null, panCard: null });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update KYC.');
    }
    setSaving(false);
  };

  const kycStatus = vendor?.kycStatus || 'pending';
  const statusColors = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    submitted: 'bg-blue-50 text-blue-700 border-blue-200',
    verified: 'bg-green-50 text-green-700 border-green-200',
    rejected: 'bg-red-50 text-red-700 border-red-200'
  };

  return (
    <div className="space-y-6">
      <div className={`p-4 rounded-xl border flex items-start gap-3 ${statusColors[kycStatus]}`}>
        <span className="material-symbols-outlined mt-0.5">
          {kycStatus === 'verified' ? 'verified' : kycStatus === 'rejected' ? 'error' : 'info'}
        </span>
        <div>
          <h4 className="font-semibold capitalize text-sm">Status: {kycStatus}</h4>
          <p className="text-sm mt-1 opacity-90">
            {kycStatus === 'pending' && 'Please submit your KYC documents to get verified.'}
            {kycStatus === 'submitted' && 'Your documents are under review by the admin team.'}
            {kycStatus === 'verified' && 'Your KYC is verified.'}
            {kycStatus === 'rejected' && `KYC Rejected. Reason: ${vendor?.kycRejectReason || 'Please re-upload valid documents.'}`}
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Aadhaar details */}
          <div className="space-y-4 p-5 bg-background-alt rounded-2xl border border-border">
            <h4 className="font-semibold text-on-surface">Aadhaar Details</h4>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-on-surface">Aadhaar Number</label>
              <input type="text" value={form.aadhaarNumber} onChange={e => setForm({...form, aadhaarNumber: e.target.value})} className="w-full bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm outline-none transition-all" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-on-surface">Aadhaar Front Image</label>
              <input type="file" accept="image/*,.pdf" onChange={e => handleFileChange(e, 'aadhaarFront')} className="w-full text-sm text-muted-text file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
              {vendor?.kyc?.aadhaarFront && !files.aadhaarFront && (
                <p className="text-xs text-success flex items-center gap-1 mt-1"><span className="material-symbols-outlined text-[14px]">check_circle</span> Document uploaded</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-on-surface">Aadhaar Back Image</label>
              <input type="file" accept="image/*,.pdf" onChange={e => handleFileChange(e, 'aadhaarBack')} className="w-full text-sm text-muted-text file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
              {vendor?.kyc?.aadhaarBack && !files.aadhaarBack && (
                <p className="text-xs text-success flex items-center gap-1 mt-1"><span className="material-symbols-outlined text-[14px]">check_circle</span> Document uploaded</p>
              )}
            </div>
          </div>

          {/* PAN Details */}
          <div className="space-y-4 p-5 bg-background-alt rounded-2xl border border-border">
            <h4 className="font-semibold text-on-surface">PAN Details</h4>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-on-surface">PAN Number</label>
              <input type="text" value={form.panNumber} onChange={e => setForm({...form, panNumber: e.target.value})} className="w-full bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm outline-none transition-all uppercase" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-on-surface">PAN Card Image</label>
              <input type="file" accept="image/*,.pdf" onChange={e => handleFileChange(e, 'panCard')} className="w-full text-sm text-muted-text file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
              {vendor?.kyc?.panCard && !files.panCard && (
                <p className="text-xs text-success flex items-center gap-1 mt-1"><span className="material-symbols-outlined text-[14px]">check_circle</span> Document uploaded</p>
              )}
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-border flex justify-end">
          <button type="submit" disabled={saving || kycStatus === 'verified'} className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-medium rounded-xl transition-all disabled:opacity-70 flex items-center gap-2 shadow-sm">
            {saving ? 'Saving...' : 'Submit KYC Documents'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default KycTab;
