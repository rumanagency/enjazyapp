import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { MonitorPlay, CheckCircle, Trash2, Monitor, Smartphone, Tablet } from 'lucide-react';

const KioskManager = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const fetchSessions = async () => {
    setLoadingSessions(true);
    const { data, error: fetchError } = await supabase
      .from('kiosk_sessions')
      .select('*')
      .eq('parent_id', user.id)
      .order('created_at', { ascending: false });
    
    if (!fetchError && data) {
      setSessions(data);
    }
    setLoadingSessions(false);
  };

  useEffect(() => {
    fetchSessions();
  }, [user.id, success]);

  useEffect(() => {
    const urlCode = searchParams.get('code');
    if (urlCode) {
      setCode(urlCode);
    }
  }, [searchParams]);

  const handleUnlink = async (sessionId) => {
    if (!window.confirm('هل أنت متأكد من إلغاء ربط هذه الشاشة؟')) return;
    
    try {
      const { error: deleteError } = await supabase
        .from('kiosk_sessions')
        .delete()
        .eq('id', sessionId);
        
      if (deleteError) throw deleteError;
      fetchSessions();
    } catch (err) {
      console.error('Error unlinking session:', err);
      alert('حدث خطأ أثناء إلغاء الربط');
    }
  };

  const getDeviceIcon = (deviceInfo) => {
    if (!deviceInfo) return <Monitor className="text-[#49b5d0]" size={24} />;
    if (deviceInfo.includes('هاتف')) return <Smartphone className="text-[#49b5d0]" size={24} />;
    if (deviceInfo.includes('لوحي')) return <Tablet className="text-[#49b5d0]" size={24} />;
    return <Monitor className="text-[#49b5d0]" size={24} />;
  };

  const handlePairing = async (e) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      setError('يرجى إدخال كود صحيح مكون من 6 أرقام');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // البحث عن الجلسة بالكود
      const { data: session, error: fetchError } = await supabase
        .from('kiosk_sessions')
        .select('*')
        .eq('code', code)
        .single();

      if (fetchError || !session) {
        throw new Error('الكود غير صحيح أو انتهت صلاحيته');
      }

      // تحديث الجلسة لمعرف الأب
      const { error: updateError } = await supabase
        .from('kiosk_sessions')
        .update({ parent_id: user.id })
        .eq('id', session.id);

      if (updateError) throw updateError;

      setSuccess(true);
      setCode('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center kiosk-manager-header">
        <h1 className="text-3xl font-bold text-[#352c3c]">ربط الشاشة الرئيسية</h1>
      </div>

      <Card className="text-center p-12">
        <MonitorPlay size={80} className="mx-auto text-[#49b5d0] mb-6" />
        
        <h2 className="text-2xl font-bold text-[#352c3c] mb-4">عرض الإنجازات على التلفاز</h2>
        <p className="text-[#a99c92] mb-8">
          لتحويل أي شاشة ذكية (تلفاز أو آيباد) إلى لوحة عرض حية لإنجازات أطفالك، افتح الرابط التالي في متصفح الشاشة:
          <br/>
          <strong className="text-[#f0a63e] text-lg select-all bg-[#f0e6de] px-4 py-2 rounded-xl inline-block mt-4">
            {window.location.origin}/kiosk
          </strong>
        </p>

        {success ? (
          <div className="bg-[#488b40]/10 border-2 border-[#488b40] rounded-3xl p-8 flex flex-col items-center gap-4">
            <CheckCircle size={60} className="text-[#488b40]" />
            <h3 className="text-2xl font-bold text-[#488b40]">تم الربط بنجاح!</h3>
            <p className="text-[#488b40]">ستبدأ الشاشة الآن بعرض إنجازات أطفالك.</p>
            <Button variant="outline" className="mt-4" onClick={() => setSuccess(false)}>ربط شاشة أخرى</Button>
          </div>
        ) : (
          <form onSubmit={handlePairing} className="flex flex-col gap-6 max-w-sm mx-auto bg-[#faece3] p-8 rounded-3xl">
            <h3 className="font-bold text-[#352c3c]">أدخل الكود الظاهر على الشاشة:</h3>
            <Input
              id="code"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center text-4xl font-black tracking-widest"
              maxLength={6}
              required
            />
            {error && <p className="text-red-500 font-bold">{error}</p>}
            <Button type="submit" variant="primary" className="w-full text-lg h-14" disabled={loading || code.length !== 6}>
              {loading ? 'جاري الربط...' : 'ربط الشاشة'}
            </Button>
          </form>
        )}
      </Card>

      <Card className="p-8">
        <h2 className="text-2xl font-bold text-[#352c3c] mb-6 flex items-center gap-3">
          <Monitor size={28} className="text-[#f0a63e]" />
          الشاشات المربوطة
        </h2>
        
        {loadingSessions ? (
          <div className="text-center text-[#a99c92] py-8 font-bold animate-pulse">جاري تحميل الشاشات...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center text-[#a99c92] py-8 bg-[#faece3]/50 rounded-2xl border-2 border-dashed border-[#e2d5cc]">
            لا توجد شاشات مربوطة حالياً
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map(session => (
              <div key={session.id} className="flex items-center justify-between p-4 bg-white border-2 border-[#f0e6de] rounded-2xl hover:border-[#49b5d0] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#faece3] flex items-center justify-center shrink-0">
                    {getDeviceIcon(session.device_info)}
                  </div>
                  <div className="text-right">
                    <h3 className="font-bold text-[#352c3c]">{session.device_info || 'جهاز غير معروف'}</h3>
                    <p className="text-sm text-[#a99c92]">
                      تم الربط في: {new Date(session.created_at).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="!text-red-500 !border-red-200 hover:!bg-red-50 h-10 px-4"
                  onClick={() => handleUnlink(session.id)}
                >
                  <Trash2 size={20} className="ml-2" />
                  إلغاء الربط
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default KioskManager;
