import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Star, LogOut, LayoutDashboard } from 'lucide-react';
import Button from '../../components/ui/Button';

const DashboardLayout = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'اللوحة الرئيسية', icon: LayoutDashboard, end: true },
    { path: '/dashboard/children', label: 'إدارة الأبناء', icon: Users },
    { path: '/dashboard/achievements', label: 'إدارة الإنجازات', icon: Star },
  ];

  return (
    <div className="min-h-screen bg-[#faece3] flex flex-col md:flex-row">
      {/* Sidebar / Topbar */}
      <aside className="w-full md:w-72 bg-white border-b md:border-b-0 md:border-l border-[#f0e6de] flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.04)] z-10">
        <div className="p-6 text-center border-b border-[#f0e6de]">
          <h2 className="text-3xl font-bold text-[#49b5d0]">إنجازي</h2>
          <p className="text-[#f0a63e] font-bold mt-1 text-sm">لوحة تحكم الآباء</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 flex flex-row md:flex-col overflow-x-auto md:overflow-visible">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all whitespace-nowrap md:whitespace-normal ${
                    isActive
                      ? 'bg-[#49b5d0]/10 text-[#49b5d0]'
                      : 'text-[#a99c92] hover:bg-[#faece3] hover:text-[#49b5d0]'
                  }`
                }
              >
                <Icon size={24} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#f0e6de]">
          <Button 
            variant="danger" 
            className="w-full gap-2" 
            onClick={handleSignOut}
          >
            <LogOut size={20} />
            <span>تسجيل الخروج</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
