import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import MainLayout from './MainLayout';

const GuestLegalLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (location.key !== 'default') {
      navigate(-1);
    } else {
      // Fallback if accessed directly
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-surface-bright font-inter flex flex-col">
      {/* Simple Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
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
      <main className="w-full flex-grow">
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
