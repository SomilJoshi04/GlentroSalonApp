import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { registerVendor } from '../services/vendorApi';

const RegisterPage = () => {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', businessName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const { confirmPassword, ...data } = formData;
      const res = await registerVendor(data);
      setAuth('vendor', res.data.data.vendor, res.data.data.token);
      navigate('/vendor'); }
    catch (err) { setError(err.response?.data?.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  const fields = [
    { name: 'name', label: 'Full Name', type: 'text', placeholder: 'Your name' },
    { name: 'businessName', label: 'Business Name', type: 'text', placeholder: 'Salon name' },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'vendor@email.com' },
    { name: 'phone', label: 'Phone', type: 'tel', placeholder: '+91 9876543210' },
    { name: 'password', label: 'Password', type: 'password', placeholder: 'Min 6 characters' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-soft-primary via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary-dark rounded-2xl shadow-lg mb-4"><span className="text-3xl">💈</span></div>
          <h1 className="text-2xl font-bold">Register as Vendor</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
          {error && <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map(f => (
              <div key={f.name}>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label>
                <input type={f.type} value={formData[f.name]} onChange={e => setFormData({...formData, [f.name]: e.target.value})} required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder={f.placeholder} />
              </div>
            ))}
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-all disabled:opacity-50">
              {loading ? 'Registering...' : 'Create Account'}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">
            Already registered? <Link to="/login" className="text-primary font-semibold">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
};
export default RegisterPage;
