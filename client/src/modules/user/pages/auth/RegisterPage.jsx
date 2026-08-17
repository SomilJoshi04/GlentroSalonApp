import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { registerUser } from '../../../../services/api/authApi';
import Button from '../../../../components/common/Button';
import Input from '../../../../components/common/Input';

const RegisterPage = () => {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
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
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }
    setLoading(true);
    setError('');
    try {
      const res = await registerUser(formData);
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
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-text-primary mb-1">Create Account</h2>
      <p className="text-text-secondary text-sm mb-6">Join us to discover amazing salons</p>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Full Name" name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" required />
        <Input label="Email" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="your@email.com" required />
        <Input label="Phone" type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+91 9876543210" required />
        <Input label="Password" type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Min 6 characters" required />
        <Input label="Confirm Password" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Re-enter password" required />
        <Button type="submit" loading={loading} className="w-full" size="lg">Create Account</Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Already have an account?{' '}
        <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700">Sign In</Link>
      </p>
    </div>
  );
};

export default RegisterPage;
