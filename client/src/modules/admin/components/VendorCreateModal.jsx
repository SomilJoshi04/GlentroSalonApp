import { useState } from 'react';
import { createVendor } from '../services/adminApi';
import toast from 'react-hot-toast';

const VendorCreateModal = ({ isOpen, onClose, onCreated }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    businessName: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await createVendor(form);
      if (res.data?.success) {
        toast.success('Vendor created successfully');
        onCreated();
        onClose();
        setForm({ name: '', email: '', phone: '', businessName: '', password: '' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create vendor');
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-surface w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-slide-up-fade">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background-alt/50">
          <h3 className="font-semibold text-lg text-on-surface">Add New Vendor</h3>
          <button onClick={onClose} className="text-muted-text hover:text-on-surface transition-colors p-1">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-on-surface">Vendor Name <span className="text-error">*</span></label>
            <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-4 py-2 bg-background-alt border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" placeholder="John Doe" />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-on-surface">Email Address <span className="text-error">*</span></label>
            <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-4 py-2 bg-background-alt border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" placeholder="john@example.com" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-on-surface">Phone Number <span className="text-error">*</span></label>
            <input type="tel" required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-4 py-2 bg-background-alt border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" placeholder="+91 9876543210" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-on-surface">Business Name <span className="text-error">*</span></label>
            <input type="text" required value={form.businessName} onChange={e => setForm({...form, businessName: e.target.value})} className="w-full px-4 py-2 bg-background-alt border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" placeholder="John's Salons & Spa" />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-on-surface">Password <span className="text-error">*</span></label>
            <input type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full px-4 py-2 bg-background-alt border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" placeholder="Minimum 6 characters" minLength="6" />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-muted-text hover:text-on-surface transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-5 py-2 text-sm font-medium bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
              ) : 'Create Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorCreateModal;
