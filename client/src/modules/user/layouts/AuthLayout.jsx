import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md bg-surface-card p-8 rounded-3xl shadow-elevated border border-border">
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
