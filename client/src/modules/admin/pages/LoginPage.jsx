import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { loginAdmin } from '../services/adminApi';
import { useSettings } from '../../../context/SettingContext';
import { getImageUrl } from '../../../utils/imageUtils';

const LoginPage = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { setAuth } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const res = await loginAdmin(form);
      setAuth('admin', res.data.data.user, res.data.data.token);
      navigate('/admin');
    } catch (err) { setError(err.response?.data?.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {settings?.appLogo ? (
            <div className="inline-flex items-center justify-center mb-4">
              <img src={getImageUrl(settings.appLogo)} alt="App Logo" className="w-16 h-16 rounded-2xl object-contain" />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl shadow-lg mb-4">
              <span className="material-symbols-outlined text-white text-[32px]">bolt</span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-text-primary">{settings?.appName || 'Admin Panel'}</h1>
          <p className="text-text-secondary text-sm mt-1">Management Portal</p>
        </div>
        <div className="bg-surface-card rounded-2xl shadow-card p-8 border border-border">
          {error && <div className="mb-4 px-4 py-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required
                className="w-full px-4 py-3 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500" placeholder="admin@salon.com" /></div>
            <div><label className="block text-sm font-medium text-text-secondary mb-1.5">Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={form.password} onChange={e => setForm({...form, password: e.target.value})} required
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500" placeholder="Enter password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-primary-600 transition-colors flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-all disabled:opacity-50">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
export default LoginPage;
