import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Star, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

const getWindowDays = () => {
  const days = [];
  const today = new Date();
  for (let i = -3; i <= 3; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const arName = date.toLocaleDateString('ar-SA', { weekday: 'long' });
    days.push({ date: dateString, name: arName, isToday: i === 0 });
  }
  return days;
};

const KioskDisplay = () => {
  const navigate = useNavigate();
  const [parentId, setParentId] = useState(null);
  const [children, setChildren] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [childAchievements, setChildAchievements] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [daysWindow, setDaysWindow] = useState(getWindowDays());

  const cheerAudio = useRef(null);
  const sadAudio = useRef(null);
  const childrenRef = useRef([]);

  useEffect(() => {
    childrenRef.current = children;
  }, [children]);

  useEffect(() => {
    cheerAudio.current = new Audio('/assets/sounds/kids-cheering-sound-effect.mp3');
    sadAudio.current = new Audio('/assets/sounds/wah-wah-sad-sound-effect.mp3');
    
    const storedParentId = localStorage.getItem('kiosk_parent_id');
    if (!storedParentId) {
      navigate('/kiosk');
      return;
    }
    setParentId(storedParentId);
  }, [navigate]);

  // تحديث نافذة الأيام كل ساعة لضمان بقاء "اليوم" في المنتصف
  useEffect(() => {
    const interval = setInterval(() => {
      setDaysWindow(getWindowDays());
    }, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!parentId) return;
    fetchData();

    // الاستماع المباشر للإضافات على التقييمات
    const channel = supabase
      .channel('kiosk_records_channel')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'daily_records'
      }, (payload) => {
        // نتحقق إذا كان هذا التقييم لأحد أطفالنا باستخدام المرجع لتجنب مشاكل حالة React
        const isOurChild = childrenRef.current.some(c => c.id === payload.new.child_id);
        if (isOurChild) {
          setRecords(prev => {
            // منع التكرار في حال تم استدعاء الحدث مرتين
            if (prev.some(r => r.id === payload.new.id)) return prev;
            
            // تشغيل الاحتفال فقط إذا كان تقييماً جديداً حقيقياً ونجمة
            if (payload.new.status === 'star') {
              playConfettiAndSound();
            } else {
              playSadSound();
            }
            return [...prev, payload.new];
          });
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'daily_records'
      }, (payload) => {
        setRecords(prev => prev.filter(r => r.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [parentId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // جلب بيانات الأبناء
      const { data: childrenData, error: childErr } = await supabase
        .from('children')
        .select('*')
        .eq('parent_id', parentId)
        .order('created_at', { ascending: true });
      if (childErr) throw childErr;

      // جلب جميع الإنجازات للأب
      const { data: achData, error: achErr } = await supabase
        .from('achievements')
        .select('*')
        .eq('parent_id', parentId);
      if (achErr) throw achErr;

      if (!childrenData || childrenData.length === 0) {
        setLoading(false);
        return;
      }

      // جلب الروابط
      const childIds = childrenData.map(c => c.id);
      const { data: linkData, error: linkErr } = await supabase
        .from('child_achievements')
        .select('*')
        .in('child_id', childIds);
      if (linkErr) throw linkErr;

      // جلب التقييمات للـ 7 أيام
      const startDate = daysWindow[0].date;
      const endDate = daysWindow[daysWindow.length - 1].date;

      const { data: recordsData, error: recErr } = await supabase
        .from('daily_records')
        .select('*')
        .in('child_id', childIds)
        .gte('date', startDate)
        .lte('date', endDate);
      
      if (recErr) throw recErr;

      setChildren(childrenData);
      setAchievements(achData);
      setChildAchievements(linkData);
      setRecords(recordsData || []);

    } catch (err) {
      console.error('Error fetching kiosk data:', err);
    } finally {
      setLoading(false);
    }
  };

  // حلقة الانتقال بين الأبناء (Carousel)
  useEffect(() => {
    if (children.length <= 1) return;

    const currentChild = children[currentIndex];
    const duration = (currentChild?.kiosk_duration || 10) * 1000;

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % children.length);
    }, duration);

    return () => clearTimeout(timer);
  }, [currentIndex, children]);

  const playConfettiAndSound = () => {
    if (cheerAudio.current) {
      cheerAudio.current.currentTime = 0;
      cheerAudio.current.play().catch(e => console.error("Audio play failed", e));
    }
    
    const duration = 4000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({ particleCount: 7, angle: 60, spread: 80, origin: { x: 0 }, colors: ['#49b5d0', '#f0a63e', '#488b40', '#c15b40'] });
      confetti({ particleCount: 7, angle: 120, spread: 80, origin: { x: 1 }, colors: ['#49b5d0', '#f0a63e', '#488b40', '#c15b40'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

  const playSadSound = () => {
    if (sadAudio.current) {
      sadAudio.current.currentTime = 0;
      sadAudio.current.play().catch(e => console.error("Audio play failed", e));
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#faece3] flex items-center justify-center text-4xl font-bold text-[#49b5d0] animate-pulse">جاري إعداد الشاشة...</div>;
  }

  if (children.length === 0) {
    return (
      <div className="min-h-screen bg-[#faece3] flex items-center justify-center p-8" dir="rtl">
        <div className="bg-white rounded-[3rem] p-12 text-center shadow-xl">
          <h1 className="text-4xl font-bold text-[#352c3c] mb-4">لم يتم العثور على أبناء</h1>
          <p className="text-[#a99c92] text-xl">يرجى إضافة الأبناء من تطبيق الجوال للبدء في عرض إنجازاتهم.</p>
        </div>
      </div>
    );
  }

  const activeChild = children[currentIndex];
  // معرفة إنجازات هذا الابن
  const activeAchIds = childAchievements.filter(ca => ca.child_id === activeChild.id).map(ca => ca.achievement_id);
  const activeAchievements = achievements.filter(a => activeAchIds.includes(a.id));

  // حساب مجموع النجوم للابن الحالي خلال هذا الأسبوع
  const activeChildWeeklyStars = records.filter(r => r.child_id === activeChild.id && r.status === 'star').length;

  // رسوميات الجدول
  const renderCellMarks = (achievementId, dateString) => {
    const dayRecords = records.filter(r => r.child_id === activeChild.id && r.achievement_id === achievementId && r.date === dateString);
    
    return (
      <div className="flex flex-wrap gap-1 justify-center items-center">
        {dayRecords.map(r => (
          <div key={r.id} className="w-[clamp(1.5rem,3vw,3rem)] h-[clamp(1.5rem,3vw,3rem)] flex items-center justify-center bg-white rounded-full shadow-sm animate-fade-in shrink-0">
            {r.status === 'star' ? (
              <Star className="w-[clamp(1rem,2vw,2rem)] h-[clamp(1rem,2vw,2rem)] text-[#f0a63e] fill-[#f0a63e]" />
            ) : (
              <X className="w-[clamp(1rem,2vw,2rem)] h-[clamp(1rem,2vw,2rem)] text-[#c15b40]" />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-screen w-screen bg-[#faece3] overflow-hidden flex flex-col p-2 md:p-4" dir="rtl">
      
      <AnimatePresence mode="wait">
        <motion.div
          key={activeChild.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="flex-1 w-full flex flex-col bg-white rounded-[3rem] shadow-2xl p-4 md:p-6 border-8 border-[#ffffff]/50 overflow-hidden"
        >
          {/* Header - بيانات الابن (بشكل أفقي لتوفير المساحة العمودية) */}
          <div className="flex flex-row items-center justify-between w-full mb-4 md:mb-6 shrink-0 h-[15vh] max-h-40 px-2 md:px-8">
            <div className="flex items-center gap-4 md:gap-6 h-full">
              <div className="h-full aspect-square rounded-full border-4 border-[#faece3] bg-[#f0e6de] overflow-hidden flex items-center justify-center shadow-lg relative">
                {activeChild.avatar_url ? (
                  <img src={activeChild.avatar_url} alt={activeChild.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[clamp(3rem,6vw,6rem)] text-[#a99c92]">{activeChild.name.charAt(0)}</span>
                )}
              </div>
              <h1 className="text-[clamp(2rem,5vw,5rem)] font-black text-[#352c3c] drop-shadow-sm">{activeChild.name}</h1>
            </div>

            {/* إجمالي النجوم الأسبوعية */}
            <div className="flex items-center gap-3 md:gap-4 bg-[#f0a63e]/10 border-4 border-[#f0a63e]/30 rounded-3xl px-4 md:px-8 py-2 md:py-4 shadow-sm animate-fade-in">
              <Star className="w-[clamp(2rem,6vw,4rem)] h-[clamp(2rem,6vw,4rem)] text-[#f0a63e] fill-[#f0a63e] drop-shadow-md" />
              <div className="flex flex-col items-center">
                <span className="text-[clamp(0.8rem,2vw,1.5rem)] text-[#a99c92] font-bold leading-tight">نجوم الأسبوع</span>
                <span className="text-[clamp(1.5rem,4vw,3rem)] font-black text-[#352c3c] leading-none">{activeChildWeeklyStars}</span>
              </div>
            </div>
          </div>

          {/* Table - جدول الإنجازات */}
          <div className="flex-1 w-full bg-[#faece3]/30 rounded-3xl p-2 md:p-4 overflow-hidden shadow-inner flex flex-col border border-[#e2d5cc]">
            {activeAchievements.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-3xl font-bold text-[#a99c92]">لا يوجد إنجازات مسندة لهذا الابن.</div>
            ) : (
              <div className="flex flex-col w-full h-full text-center gap-2 min-h-0">
                {/* Header Row */}
                <div className="flex w-full h-[10vh] max-h-24 shrink-0 gap-2">
                  <div className="w-[20%] md:w-1/4 shrink-0"></div>
                  {daysWindow.map((day, idx) => (
                    <div key={idx} className="flex-1 min-w-0 h-full">
                      <div className={`h-full flex flex-col items-center justify-center px-1 rounded-2xl transition-all ${day.isToday ? 'bg-[#49b5d0] text-white shadow-lg scale-105' : 'bg-white text-[#a99c92] shadow-sm'}`}>
                        <span className="text-[clamp(1rem,2.5vw,2.5rem)] font-black leading-tight truncate w-full px-1">{day.name}</span>
                        <span className="text-[clamp(0.7rem,1.5vw,1.2rem)] font-bold opacity-80">{day.date.split('-').slice(1).reverse().join('/')}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Body Rows */}
                <div className="flex-1 flex flex-col w-full gap-2 min-h-0">
                  {activeAchievements.map(ach => (
                    <div key={ach.id} className="flex-1 flex w-full gap-2 group min-h-0">
                      
                      {/* Achievement Title Card */}
                      <div className="w-[20%] md:w-1/4 shrink-0 h-full p-1">
                        <div className="h-full bg-white rounded-2xl p-2 md:p-3 shadow-sm border-2 border-transparent group-hover:border-[#f0a63e] transition-colors flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 overflow-hidden">
                           {ach.icon_url ? (
                             <img src={ach.icon_url} alt={ach.title} className="w-[clamp(2rem,4vw,4rem)] h-[clamp(2rem,4vw,4rem)] object-contain shrink-0" />
                           ) : (
                             <Star className="w-[clamp(2rem,4vw,4rem)] h-[clamp(2rem,4vw,4rem)] text-[#f0a63e] shrink-0" />
                           )}
                           <span className="font-bold text-[clamp(1rem,2vw,2rem)] text-[#352c3c] line-clamp-2 md:line-clamp-3 leading-tight">{ach.title}</span>
                        </div>
                      </div>

                      {/* Day Cells */}
                      {daysWindow.map((day, idx) => (
                        <div key={idx} className="flex-1 min-w-0 h-full p-1">
                          <div className={`h-full w-full flex items-center justify-center p-2 rounded-2xl ${day.isToday ? 'bg-white/60 border-2 border-[#49b5d0]/30' : 'bg-transparent'} transition-all`}>
                            {renderCellMarks(ach.id, day.date)}
                          </div>
                        </div>
                      ))}

                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* شريط التقدم بأسفل الشاشة */}
          {children.length > 1 && (
            <div className="mt-4 h-2 shrink-0 w-full bg-[#f0e6de] rounded-full overflow-hidden">
              <motion.div 
                key={`progress-${activeChild.id}`}
                className="h-full bg-[#49b5d0]"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: activeChild.kiosk_duration || 10, ease: "linear" }}
              />
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* حقوق التطوير */}
      <div className="shrink-0 text-center text-[#a99c92] text-[clamp(0.8rem,1.5vw,1.2rem)] mt-2 font-bold z-10">
        تم التطوير بحب من قبل <a href="https://ruman.sa" target="_blank" rel="noopener noreferrer" className="text-[#49b5d0] hover:text-[#f0a63e] transition-colors">وكالة رمان</a>
      </div>

    </div>
  );
};

export default KioskDisplay;
