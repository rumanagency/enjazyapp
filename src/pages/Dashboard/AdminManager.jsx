import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { UserPlus, ShieldCheck, Trash2, Ban, CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// إنشاء عميل منفصل لعدم تدمير جلسة السوبر أدمن الحالية عند إضافة مستخدم جديد
const adminAuthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  }
});

const AdminManager = () => {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // حالة إدارة قائمة المستخدمين
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // حماية إضافية للواجهة
  const isSuperAdmin = user?.user_metadata?.is_super_admin === true;

  useEffect(() => {
    if (isSuperAdmin) {
      fetchUsers();
    }
  }, [isSuperAdmin]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_users');
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAddParent = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // إنشاء المستخدم باستخدام العميل المنفصل
      const { data, error: signUpError } = await adminAuthClient.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      // نجاح التسجيل
      setSuccess(`تم إضافة حساب الوالد بنجاح: ${email}`);
      setEmail('');
      setPassword('');
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#49b5d0', '#f0a63e', '#488b40']
      });

      // تحديث الجدول
      fetchUsers();

    } catch (err) {
      console.error('Error adding parent:', err);
      setError(err.message || 'حدث خطأ أثناء إضافة المستخدم.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBan = async (targetUid, currentBanStatus) => {
    const actionName = currentBanStatus ? 'فك الحظر عن' : 'حظر';
    if (!window.confirm(`هل أنت متأكد أنك تريد ${actionName} هذا المستخدم؟`)) return;

    try {
      const { error } = await supabase.rpc('admin_toggle_user_ban', { 
        target_uid: targetUid, 
        ban: !currentBanStatus 
      });
      if (error) throw error;
      
      alert(`تم ${actionName} المستخدم بنجاح.`);
      fetchUsers();
    } catch (err) {
      alert('خطأ: ' + err.message);
    }
  };

  const handleDeleteUser = async (targetUid) => {
    if (!window.confirm('تحذير خطير ⚠️: هل أنت متأكد من حذف هذا المستخدم نهائياً؟ سيتم حذف جميع بياناته وأبنائه وتقييماته بالكامل ولا يمكن التراجع عن ذلك!')) return;
    
    // تأكيد ثاني للمزيد من الأمان
    if (!window.confirm('تأكيد أخير: هل أنت متأكد 100% أنك تريد تدمير بيانات هذا المستخدم؟')) return;

    try {
      const { error } = await supabase.rpc('admin_delete_user', { 
        target_uid: targetUid 
      });
      if (error) throw error;
      
      alert('تم حذف المستخدم وجميع بياناته بنجاح.');
      fetchUsers();
    } catch (err) {
      alert('خطأ أثناء الحذف: ' + err.message);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <ShieldCheck size={80} className="text-[#c15b40] opacity-50" />
        <h1 className="text-3xl font-bold text-[#352c3c]">عذراً، لا تملك الصلاحية</h1>
        <p className="text-[#a99c92] text-xl">هذه الصفحة مخصصة للسوبر أدمن فقط.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <ShieldCheck className="text-[#49b5d0]" size={32} />
        <h1 className="text-3xl font-bold text-[#352c3c]">إدارة الآباء (سوبر أدمن)</h1>
      </div>

      <Card className="p-8">
        <div className="mb-8 text-center">
          <div className="w-20 h-20 bg-[#49b5d0]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="text-[#49b5d0]" size={40} />
          </div>
          <h2 className="text-2xl font-bold text-[#352c3c]">إضافة حساب والد جديد</h2>
          <p className="text-[#a99c92] mt-2">سيتمكن هذا الحساب من الدخول وإضافة أبنائه الخاصين بشكل مستقل ومحمي.</p>
        </div>

        <form onSubmit={handleAddParent} className="space-y-6">
          <Input
            id="parent-email"
            type="email"
            label="البريد الإلكتروني للوالد"
            placeholder="parent@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            dir="ltr"
            className="text-left"
          />

          <Input
            id="parent-password"
            type="password"
            label="كلمة المرور الابتدائية"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            dir="ltr"
            className="text-left"
          />

          {error && (
            <div className="p-4 bg-[#c15b40]/10 border border-[#c15b40]/20 rounded-2xl text-[#c15b40] font-bold text-center">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-[#488b40]/10 border border-[#488b40]/20 rounded-2xl text-[#488b40] font-bold text-center">
              {success}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full text-lg h-14"
            disabled={loading}
          >
            {loading ? 'جاري الإضافة...' : 'إنشاء الحساب الآن'}
          </Button>
        </form>
      </Card>

      {/* قسم جدول المستخدمين */}
      <Card className="p-4 md:p-8 overflow-hidden">
        <h2 className="text-2xl font-bold text-[#352c3c] mb-6 border-b border-[#f0e6de] pb-4">المستخدمون المسجلون (الآباء)</h2>
        
        {loadingUsers ? (
          <div className="text-center text-[#a99c92] font-bold py-10 animate-pulse">جاري جلب بيانات المستخدمين...</div>
        ) : users.length === 0 ? (
          <div className="text-center text-[#a99c92] font-bold py-10">لا يوجد مستخدمين.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-[#faece3] text-[#352c3c]">
                  <th className="p-4 rounded-r-xl font-bold">البريد الإلكتروني</th>
                  <th className="p-4 font-bold">تاريخ التسجيل</th>
                  <th className="p-4 font-bold">الحالة</th>
                  <th className="p-4 rounded-l-xl font-bold text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-[#f0e6de] hover:bg-[#faece3]/30 transition-colors">
                    <td className="p-4 font-bold text-[#49b5d0]">{u.email} {u.is_super_admin && <span className="text-xs bg-[#f0a63e] text-white px-2 py-1 rounded-full mr-2">أدمن</span>}</td>
                    <td className="p-4 text-[#a99c92]" dir="ltr">
                      {new Date(u.created_at).toLocaleDateString('ar-SA')}
                    </td>
                    <td className="p-4">
                      {u.is_banned ? (
                        <span className="flex items-center gap-1 text-[#c15b40] font-bold text-sm bg-[#c15b40]/10 px-3 py-1 rounded-full w-fit">
                          <Ban size={16} /> محظور
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[#488b40] font-bold text-sm bg-[#488b40]/10 px-3 py-1 rounded-full w-fit">
                          <CheckCircle size={16} /> نشط
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {!u.is_super_admin && (
                          <>
                            <Button 
                              variant={u.is_banned ? 'success' : 'secondary'} 
                              className="px-4 py-2 text-sm gap-1"
                              onClick={() => handleToggleBan(u.id, u.is_banned)}
                            >
                              <Ban size={16} />
                              {u.is_banned ? 'فك الحظر' : 'حظر'}
                            </Button>
                            
                            <Button 
                              variant="danger" 
                              className="px-4 py-2 text-sm gap-1"
                              onClick={() => handleDeleteUser(u.id)}
                            >
                              <Trash2 size={16} />
                              حذف نهائي
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminManager;
