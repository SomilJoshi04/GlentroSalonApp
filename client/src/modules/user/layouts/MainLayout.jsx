import { Outlet } from 'react-router-dom';
import TopNav from '../../../components/common/TopNav';
import BottomNav from '../../../components/common/BottomNav';

const MainLayout = () => {
  return (
    <div className="bg-background text-on-background antialiased min-h-screen pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0 pt-[env(safe-area-inset-top)] md:pt-16 max-w-[100vw] overflow-x-hidden">
      <TopNav />
      
      {/* Main Content */}
      <main className="w-full px-4 md:px-margin-desktop max-w-container-max mx-auto box-border">
        <Outlet />
      </main>
      
      <BottomNav />
    </div>
  );
};

export default MainLayout;
