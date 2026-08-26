import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import MainLayout from './MainLayout';

const GuestLegalLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    // Explicit source-aware navigation for security and exact routing
    if (location.state?.from === '/login' || location.state?.from === '/register') {
      navigate(location.state.from);
      return;
    }
    
    if (location.key !== 'default') {
      navigate(-1);
    } else {
      // Fallback if accessed directly
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-surface-bright font-inter flex flex-col">
      {/* Desktop Header (Hidden on Mobile since PageHeader handles it) */}
      <header className="hidden md:flex bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center">
          <button 
            onClick={handleBack}
            className="flex items-center gap-1.5 text-gray-600 hover:text-primary-600 transition-colors font-medium text-sm py-1.5 px-2 -ml-2 rounded-lg hover:bg-gray-50"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            Back
          </button>
        </div>
      </header>
      
      {/* Clean Content Area */}
      <main className="w-full px-4 md:px-margin-desktop max-w-container-max mx-auto box-border flex-grow">
        {children || <Outlet />}
      </main>
    </div>
  );
};

const LegalPageLayout = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isGuestRequest = searchParams.get('guest') === 'true';
  
  // If explicitly requested as guest (e.g. from Register page) or no user is logged in
  if (isGuestRequest || !user) {
    return <GuestLegalLayout>{children || <Outlet />}</GuestLegalLayout>;
  }
  
  // Logged-in User -> Existing Authenticated Layout
  return <MainLayout>{children || <Outlet />}</MainLayout>;
};

export default LegalPageLayout;
