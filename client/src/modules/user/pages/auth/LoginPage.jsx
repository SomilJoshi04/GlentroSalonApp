import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { loginUser } from '../../../../services/api/authApi';
import Button from '../../../../components/common/Button';
import Input from '../../../../components/common/Input';

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { state } = useLocation();
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await loginUser(formData);
      setAuth('user', res.data.data.user, res.data.data.token);
      
      const pendingBookingStr = sessionStorage.getItem('pendingBooking');
      if (pendingBookingStr) {
        try {
          const pendingBooking = JSON.parse(pendingBookingStr);
          navigate(`/salon/${pendingBooking.salon}/checkout`, { state: pendingBooking, replace: true });
          return;
        } catch (e) {
          console.error('Failed to parse pending booking', e);
        }
      }
      
      if (state?.from) {
        navigate(state.from, { state: state.bookingState, replace: true });
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 2 && !state?.from) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="animate-fade-in relative pt-4">
      {/* Back Button */}
      <button 
        onClick={handleBack}
        className="absolute top-0 left-0 p-2 -ml-2 mt-0 text-on-surface-variant hover:bg-soft-primary transition-colors rounded-full active:scale-95 duration-150"
      >
        <span className="material-symbols-outlined">arrow_back</span>
      </button>

      <div className="mt-8">
        <h2 className="text-2xl font-bold text-text-primary mb-1">Welcome back</h2>
        <p className="text-text-secondary text-sm mb-6">Sign in to continue booking</p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="your@email.com"
          required
        />
        <Input
          label="Password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Enter your password"
          required
        />
        <Button type="submit" loading={loading} className="w-full" size="lg">
          Sign In
        </Button>
      </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary-600 font-semibold hover:text-primary-700 transition-colors">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
