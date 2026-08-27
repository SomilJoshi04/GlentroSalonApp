import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { forgotPasswordAPI, verifyOTPAPI, resetPasswordAPI } from '../../../../services/api/authApi';
import { useSettings } from '../../../../context/SettingContext';
import { getImageUrl } from '../../../../utils/imageUtils';

const ForgotPasswordPage = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [resetToken, setResetToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const returnUrl = location.state?.returnUrl || '/login';

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await forgotPasswordAPI({ email });
      setSuccess(res.data.message);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('OTP must be exactly 6 digits');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await verifyOTPAPI({ email, otp });
      setResetToken(res.data.data.resetToken);
      setSuccess('OTP verified successfully!');
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await resetPasswordAPI({ resetToken, newPassword });
      setSuccess(res.data.message);
      setTimeout(() => {
        navigate(returnUrl, { replace: true });
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loginImage = settings?.loginPageImage ? getImageUrl(settings.loginPageImage) : 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?q=80&w=2070&auto=format&fit=crop';

  return (
    <div className="min-h-screen flex w-full relative overflow-x-hidden font-inter">

      {/* Background with Split Effect */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${loginImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'right'
        }}
      ></div>
      {/* Heavy gradient overlay: Solid purple left, translucent right */}
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#2D0B5A] from-40% via-[#2D0B5A]/80 to-[#2D0B5A]/20 backdrop-blur-sm"></div>

      {/* LEFT SIDE: Visuals (Hidden on Mobile) */}
      <div className="hidden lg:flex w-1/2 relative items-center justify-center p-12 z-10">
        <div className="relative w-full max-w-[400px] aspect-[1/1.2] rounded-[32px] shadow-2xl z-10 bg-surface overflow-hidden">
          <img
            src={loginImage}
            alt="Premium Salon Interior"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
        </div>

        {/* Floating Glass Elements */}
        <div className="absolute top-[20%] left-[15%] w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/30 shadow-xl flex items-center justify-center animate-bounce z-20" style={{ animationDuration: '4s' }}>
          <span className="material-symbols-outlined text-white text-3xl">cut</span>
        </div>
        <div className="absolute bottom-[25%] left-[25%] w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/30 shadow-xl flex items-center justify-center animate-bounce z-20" style={{ animationDuration: '5s', animationDelay: '1s' }}>
          <span className="material-symbols-outlined text-white text-2xl">lock_reset</span>
        </div>
      </div>

      {/* RIGHT SIDE: Forgot Password Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 z-20">

        <div className="w-full max-w-[480px] bg-white/80 backdrop-blur-xl rounded-[32px] p-8 sm:p-10 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] border border-white/60 relative">

          {/* Back Button */}
          <Link
            to={returnUrl}
            className="absolute top-8 left-8 text-gray-400 hover:text-[#2D0B5A] transition-colors p-1 rounded-full hover:bg-white/50 z-10 flex items-center justify-center"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>

          {/* Heading */}
          <div className="mb-8 mt-2 pr-24 pl-10">
            {/* Logo */}
            <div className="flex items-center gap-2 mb-6">
              {settings?.appLogo ? (
                <img src={getImageUrl(settings.appLogo)} alt={`${settings?.appName || 'GlentroSalon'} Logo`} className="h-8 md:h-10 object-contain" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#31105D] to-[#8854C0] flex items-center justify-center text-white font-bold text-lg shadow-md">
                  {(settings?.appName || 'GlentroSalon').charAt(0)}
                </div>
              )}
              <span className="font-headline-md text-xl font-bold text-[#2D0B5A]">
                {settings?.appName || 'GlentroSalon'}
              </span>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Forgot Password
            </h1>
            <p className="text-gray-600 text-sm leading-relaxed">
              {step === 1 && 'Enter your email address and we will send you a verification code.'}
              {step === 2 && 'Enter the 6-digit code sent to your email.'}
              {step === 3 && 'Create a new, strong password.'}
            </p>
          </div>

          {/* Error & Success Messages */}
          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-2 animate-fade-in">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm flex items-center gap-2 animate-fade-in">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              {success}
            </div>
          )}

          {/* STEP 1: Email Form */}
          {step === 1 && (
            <form onSubmit={handleSendOTP} className="space-y-5 animate-fade-in">
              <div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">mail</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address"
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1578]/20 focus:border-[#4A1578] transition-all shadow-sm"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-3.5 mt-2 rounded-xl bg-gradient-to-r from-[#31105D] to-[#8854C0] text-white font-semibold text-[15px] shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Send Code'}
              </button>
            </form>
          )}

          {/* STEP 2: OTP Form */}
          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-5 animate-fade-in">
              <div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">password</span>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    placeholder="6-digit OTP"
                    required
                    maxLength={6}
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-800 text-center tracking-[0.5em] text-lg font-bold focus:outline-none focus:ring-2 focus:ring-[#4A1578]/20 focus:border-[#4A1578] transition-all shadow-sm"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-3.5 mt-2 rounded-xl bg-gradient-to-r from-[#31105D] to-[#8854C0] text-white font-semibold text-[15px] shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Verify Code'}
              </button>
            </form>
          )}

          {/* STEP 3: Reset Password Form */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-5 animate-fade-in">
              <div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">lock</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New Password"
                    required
                    minLength={6}
                    className="w-full pl-12 pr-12 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1578]/20 focus:border-[#4A1578] transition-all shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>
              <div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">lock</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm New Password"
                    required
                    minLength={6}
                    className="w-full pl-12 pr-12 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1578]/20 focus:border-[#4A1578] transition-all shadow-sm"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword}
                className="w-full py-3.5 mt-2 rounded-xl bg-gradient-to-r from-[#31105D] to-[#8854C0] text-white font-semibold text-[15px] shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Reset Password'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
