import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Star, LogOut, LayoutDashboard, CalendarCheck, MonitorPlay } from 'lucide-react';
import Button from '../../components/ui/Button';

const DashboardLayout = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isSuperAdmin = user?.user_metadata?.is_super_admin === true;

  const navItems = [
    { path: '/dashboard', label: 'اللوحة الرئيسية', icon: LayoutDashboard, end: true },
    { path: '/dashboard/evaluation', label: 'التقييم اليومي', icon: CalendarCheck },
    { path: '/dashboard/children', label: 'إدارة الأبناء', icon: Users },
    { path: '/dashboard/achievements', label: 'إدارة الإنجازات', icon: Star },
    { path: '/dashboard/kiosk', label: 'ربط الشاشة', icon: MonitorPlay },
  ];

  if (isSuperAdmin) {
    navItems.push({ path: '/dashboard/admin', label: 'إدارة الآباء (سوبر أدمن)', icon: Users });
  }

  return (
    <div className="min-h-screen bg-[#faece3] flex flex-col md:flex-row">
      {/* Sidebar / Topbar */}
      <aside className="w-full md:w-72 bg-white border-b md:border-b-0 md:border-l border-[#f0e6de] flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.04)] z-10">
        <div className="p-6 flex flex-col items-center justify-center text-center border-b border-[#f0e6de]">
          <img src="/assets/enjazy_logo.svg" alt="إنجازي" className="h-12 w-auto object-contain" />
          <p className="text-[#f0a63e] font-bold mt-2 text-sm">لوحة تحكم الآباء</p>
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

        <div className="p-4 border-t border-[#f0e6de] flex flex-col gap-4">
          <Button 
            variant="danger" 
            className="w-full gap-2" 
            onClick={handleSignOut}
          >
            <LogOut size={20} />
            <span>تسجيل الخروج</span>
          </Button>
          <div className="text-center text-[#a99c92] text-sm font-bold">
            تم التطوير بحب من قبل <a href="https://ruman.sa" target="_blank" rel="noopener noreferrer" className="text-[#49b5d0] hover:text-[#f0a63e] transition-colors">وكالة رمان</a>
          </div>
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
