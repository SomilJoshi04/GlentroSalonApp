import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { updateProfile } from '../services/vendorApi';

const ProfilePage = () => {
  const { vendor: user, setVendor: updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', businessName: user?.businessName || '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try { const r = await updateProfile(form); updateUser(r.data.data); setEditing(false); } catch (e) { alert('Failed'); }
    setSaving(false);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Profile</h1>
      <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-primary rounded-full flex items-center justify-center text-white text-3xl font-bold">{user?.name?.charAt(0)}</div>
        <h2 className="text-xl font-bold mt-4">{user?.name}</h2>
        <p className="text-slate-500 text-sm">{user?.businessName}</p>
        <p className="text-slate-400 text-xs mt-1">{user?.email}</p>
        <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${user?.isApproved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
          {user?.isApproved ? '✓ Approved' : '⏳ Pending Approval'}
        </span>
      </div>
      <div className="bg-white rounded-2xl p-6 border border-slate-100 space-y-4">
        <div className="flex justify-between"><h3 className="font-semibold">Details</h3><button onClick={() => setEditing(!editing)} className="text-sm text-primary font-medium">{editing ? 'Cancel' : 'Edit'}</button></div>
        {editing ? (
          <div className="space-y-3">
            {[{n:'name',l:'Name'},{n:'phone',l:'Phone'},{n:'businessName',l:'Business Name'}].map(f => (
              <div key={f.n}><label className="text-sm font-medium text-slate-600">{f.l}</label><input value={form[f.n]} onChange={e => setForm({...form, [f.n]: e.target.value})} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm" /></div>
            ))}
            <button onClick={handleSave} disabled={saving} className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        ) : (
          <div className="space-y-3 text-sm">{[['Name', user?.name],['Email', user?.email],['Phone', user?.phone],['Business', user?.businessName]].map(([l,v]) => <div key={l} className="flex justify-between py-2 border-b border-slate-50"><span className="text-slate-400">{l}</span><span className="font-medium">{v}</span></div>)}</div>
        )}
      </div>
    </div>
  );
};
export default ProfilePage;
