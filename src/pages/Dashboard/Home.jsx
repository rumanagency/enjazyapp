import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import KioskManager from './KioskManager';
import { Settings, BarChart2, MonitorPlay, Save } from 'lucide-react';

const Home = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Stats state
  const [stats, setStats] = useState({
    childrenCount: 0,
    totalAchievements: 0,
    starsThisWeek: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Account State
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [updatingAccount, setUpdatingAccount] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      
      // Get children count
      const { data: children, error: cErr } = await supabase
        .from('children')
        .select('id')
        .eq('parent_id', user.id);
        
      if (cErr) throw cErr;
      
      const childrenIds = children.map(c => c.id);

      // Get total achievements
      const { count: achCount, error: aErr } = await supabase
        .from('achievements')
        .select('*', { count: 'exact', head: true })
        .eq('parent_id', user.id);
        
      if (aErr) throw aErr;

      // Get stars this week
      const getStartOfWeek = () => {
        const d = new Date();
        d.setDate(d.getDate() - d.getDay()); // Sunday
        d.setHours(0, 0, 0, 0);
        return d;
      };
      
      const startOfWeekStr = getStartOfWeek().toISOString();

      let starsThisWeek = 0;
      if (childrenIds.length > 0) {
        const { count: starsCount, error: sErr } = await supabase
          .from('daily_records')
          .select('*', { count: 'exact', head: true })
          .in('child_id', childrenIds)
          .eq('status', 'star')
          .gte('created_at', startOfWeekStr);
          
        if (sErr) throw sErr;
        starsThisWeek = starsCount || 0;
      }

      setStats({
        childrenCount: children.length,
        totalAchievements: achCount || 0,
        starsThisWeek: starsThisWeek
      });

    } catch (err) {
      console.error("Error fetching stats", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleUpdateAccount = async (e) => {
    e.preventDefault();
    setUpdatingAccount(true);
    setMessage({ type: '', text: '' });

    try {
      const updates = {};
      if (email !== user.email) updates.email = email;
      if (password) updates.password = password;

      if (Object.keys(updates).length === 0) {
        setMessage({ type: 'info', text: 'لا يوجد تغييرات للحفظ' });
        setUpdatingAccount(false);
        return;
      }

      const { data, error } = await supabase.auth.updateUser(updates);
      
      if (error) throw error;
      
      setMessage({ type: 'success', text: 'تم تحديث البيانات بنجاح!' });
      setPassword(''); // Clear password field after successful update
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setUpdatingAccount(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col min-h-0" dir="rtl">
      <div className="flex justify-between items-center shrink-0">
        <h1 className="text-3xl font-bold text-[#352c3c]">اللوحة الرئيسية</h1>
      </div>

      {/* Tabs Header */}
      <div className="flex gap-2 border-b-2 border-[#f0e6de] pb-0 shrink-0 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-lg rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-white text-[#49b5d0] border-t-2 border-r-2 border-l-2 border-[#f0e6de] relative top-[2px]'
              : 'bg-transparent text-[#a99c92] hover:bg-white/50 border-t-2 border-r-2 border-l-2 border-transparent'
          }`}
        >
          <BarChart2 size={20} />
          إحصائيات وحسابي
        </button>
        <button
          onClick={() => setActiveTab('kiosk')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-lg rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === 'kiosk'
              ? 'bg-white text-[#49b5d0] border-t-2 border-r-2 border-l-2 border-[#f0e6de] relative top-[2px]'
              : 'bg-transparent text-[#a99c92] hover:bg-white/50 border-t-2 border-r-2 border-l-2 border-transparent'
          }`}
        >
          <MonitorPlay size={20} />
          ربط الشاشة الذكية
        </button>
      </div>

      {/* Tabs Content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in pb-8">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-white border-2 border-[#e2d5cc] p-6 text-center shadow-sm hover:border-[#49b5d0]/50 transition-colors">
                <h3 className="text-[#a99c92] font-bold text-lg mb-2">عدد الأبناء</h3>
                <div className="text-4xl font-black text-[#49b5d0]">
                  {loadingStats ? '...' : stats.childrenCount}
                </div>
              </Card>
              <Card className="bg-white border-2 border-[#e2d5cc] p-6 text-center shadow-sm hover:border-[#f0a63e]/50 transition-colors">
                <h3 className="text-[#a99c92] font-bold text-lg mb-2">إجمالي الإنجازات</h3>
                <div className="text-4xl font-black text-[#f0a63e]">
                  {loadingStats ? '...' : stats.totalAchievements}
                </div>
              </Card>
              <Card className="bg-white border-2 border-[#e2d5cc] p-6 text-center shadow-sm hover:border-[#488b40]/50 transition-colors">
                <h3 className="text-[#a99c92] font-bold text-lg mb-2">نجوم هذا الأسبوع</h3>
                <div className="text-4xl font-black text-[#488b40]">
                  {loadingStats ? '...' : stats.starsThisWeek}
                </div>
              </Card>
            </div>

            {/* Account Settings */}
            <Card className="bg-white border-2 border-[#e2d5cc] p-6 max-w-2xl">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-[#f0e6de]">
                <Settings className="text-[#f0a63e]" size={28} />
                <h2 className="text-2xl font-bold text-[#352c3c]">إعدادات الحساب</h2>
              </div>
              
              <form onSubmit={handleUpdateAccount} className="space-y-6">
                {message.text && (
                  <div className={`p-4 rounded-xl font-bold text-center ${
                    message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' :
                    message.type === 'success' ? 'bg-green-50 text-green-600 border border-green-200' :
                    'bg-blue-50 text-blue-600 border border-blue-200'
                  }`}>
                    {message.text}
                  </div>
                )}
                
                <div>
                  <label className="block text-[#a99c92] font-bold mb-2">البريد الإلكتروني</label>
                  <Input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    dir="ltr"
                    className="text-left bg-[#faece3]/30"
                  />
                  <p className="text-sm text-[#a99c92] mt-2">يمكنك تعديل البريد الإلكتروني وسيتم تغييره مباشرة</p>
                </div>
                
                <div>
                  <label className="block text-[#a99c92] font-bold mb-2">كلمة المرور الجديدة</label>
                  <Input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="اترك الحقل فارغاً إذا لم ترغب بتغييرها"
                    dir="ltr"
                    className="text-left bg-[#faece3]/30"
                  />
                </div>

                <div className="pt-4">
                  <Button type="submit" disabled={updatingAccount} className="w-full md:w-auto gap-2 text-lg py-3 px-8">
                    <Save size={24} />
                    {updatingAccount ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {activeTab === 'kiosk' && (
          <div className="animate-fade-in h-full">
            <div className="bg-white rounded-3xl overflow-hidden min-h-[600px] border-2 border-[#e2d5cc]">
              {/* Hide the inner header from KioskManager using CSS */}
              <style>{`
                .kiosk-manager-header { display: none !important; }
              `}</style>
              <div className="p-4 md:p-8">
                <KioskManager />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
