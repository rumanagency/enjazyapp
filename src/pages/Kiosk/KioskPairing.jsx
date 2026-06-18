import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';

const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  if (/SmartTV|AppleTV|Roku|Fire|Xbox|PlayStation|Tizen|WebOS/i.test(ua)) return 'شاشة ذكية / تلفاز';
  if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) return 'جهاز لوحي (تابلت)';
  if (/Mobile|iPhone|Android/i.test(ua)) return 'هاتف ذكي';
  if (/Windows|Macintosh|Linux/i.test(ua)) return 'جهاز كمبيوتر';
  return 'جهاز غير معروف';
};

const KioskPairing = () => {
  const [pairingCode, setPairingCode] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // التحقق مما إذا كان مقترناً بالفعل
    const parentId = localStorage.getItem('kiosk_parent_id');
    if (parentId) {
      navigate('/kiosk/display');
      return;
    }

    generateCode();
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    // الاستماع عبر Realtime لتغير parent_id
    const channel = supabase
      .channel('kiosk_pairing_channel')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'kiosk_sessions',
        filter: `id=eq.${sessionId}`
      }, (payload) => {
        if (payload.new.parent_id) {
          // تم الربط بنجاح!
          localStorage.setItem('kiosk_parent_id', payload.new.parent_id);
          localStorage.setItem('kiosk_session_id', payload.new.id);
          navigate('/kiosk/display');
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, navigate]);

  const generateCode = async () => {
    try {
      // توليد كود 6 أرقام عشوائي
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      const { data, error } = await supabase
        .from('kiosk_sessions')
        .insert([{ code, device_info: getDeviceInfo() }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // كود متكرر، حاول مرة أخرى
          generateCode();
        } else {
          throw error;
        }
      } else {
        setPairingCode(code);
        setSessionId(data.id);
      }
    } catch (err) {
      console.error('Error generating pairing code:', err);
      setError('حدث خطأ أثناء توليد كود الربط. تأكد من إعدادات قاعدة البيانات.');
    }
  };

  const dashboardUrl = `${window.location.origin}/dashboard/kiosk?code=${pairingCode}`;

  return (
    <div className="min-h-screen bg-[#faece3] flex items-center justify-center p-8" dir="rtl">
      <div className="bg-white rounded-[3rem] shadow-xl p-12 max-w-2xl w-full text-center space-y-12">
        <div>
          <h1 className="text-4xl font-black text-[#352c3c] mb-4">ربط شاشة إنجازي</h1>
          <p className="text-[#a99c92] text-xl">
            افتح تطبيق إنجازي في جوالك، واذهب إلى الإعدادات ثم "ربط الشاشة"، وأدخل الكود التالي:
          </p>
        </div>

        {error ? (
          <div className="text-red-500 font-bold p-4 bg-red-50 rounded-xl">{error}</div>
        ) : !pairingCode ? (
          <div className="text-2xl text-[#49b5d0] font-bold animate-pulse">جاري توليد الكود...</div>
        ) : (
          <div className="flex flex-col items-center gap-12">
            <div className="text-8xl font-black text-[#f0a63e] tracking-widest drop-shadow-sm">
              {pairingCode}
            </div>
            
            <div className="flex flex-col items-center gap-4">
              <p className="text-[#a99c92] font-bold">أو امسح الرمز بواسطة كاميرا الجوال</p>
              <div className="p-4 bg-white rounded-3xl shadow-lg border-4 border-[#e2d5cc]">
                <QRCodeSVG value={dashboardUrl} size={200} fgColor="#352c3c" />
              </div>
            </div>
          </div>
        )}

        <div className="pt-8 border-t-2 border-[#f0e6de]">
          <div className="w-16 h-16 rounded-full border-4 border-[#49b5d0] border-t-transparent animate-spin mx-auto"></div>
          <p className="mt-4 text-[#49b5d0] font-bold text-lg">بانتظار الارتباط...</p>
        </div>
      </div>
    </div>
  );
};

export default KioskPairing;
