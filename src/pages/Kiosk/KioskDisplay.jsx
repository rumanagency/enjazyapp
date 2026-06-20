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

  // تحديث نافذة الأيام كل ساعة لضمان بقاء "اليوم" في المنتصف

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

    // الاستماع لحذف الجلسة (إلغاء الربط)
    const sessionId = localStorage.getItem('kiosk_session_id');
    let sessionChannel;
    if (sessionId) {
      sessionChannel = supabase
        .channel('kiosk_session_delete')
        .on('postgres_changes', {
          event: 'DELETE',
          schema: 'public',
          table: 'kiosk_sessions',
          filter: `id=eq.${sessionId}`
        }, () => {
          // تم إلغاء الربط من لوحة التحكم
          localStorage.removeItem('kiosk_parent_id');
          localStorage.removeItem('kiosk_session_id');
          navigate('/kiosk');
        })
        .subscribe();
    }

    return () => {
      supabase.removeChannel(channel);
      if (sessionChannel) supabase.removeChannel(sessionChannel);
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

  // حساب تقدم المسار للابن الحالي
  const getStartOfWeek = () => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay()); // Sunday
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const startOfWeek = getStartOfWeek();
  const resetTimestamp = activeChild.path_reset_timestamp ? new Date(activeChild.path_reset_timestamp) : new Date(0);
  const effectiveStartDate = resetTimestamp > startOfWeek ? resetTimestamp : startOfWeek;

  let validStars = 0;
  let validCrosses = 0;
  
  records.forEach(r => {
    if (r.child_id === activeChild.id) {
      const recordTime = r.created_at ? new Date(r.created_at) : new Date(r.date);
      if (recordTime >= effectiveStartDate) {
        if (r.status === 'star') validStars++;
        else if (r.status === 'cross') validCrosses++;
      }
    }
  });

  const progress = Math.max(0, validStars - validCrosses);
  const weeklyGoal = activeChild.weekly_star_goal || 10;
  const progressPercentage = Math.min(100, Math.max(0, (progress / weeklyGoal) * 100));
  const isCompleted = progressPercentage >= 100;

  // رسوميات الجدول
  const renderCellMarks = (achievementId, dateString) => {
    const dayRecords = records.filter(r => r.child_id === activeChild.id && r.achievement_id === achievementId && r.date === dateString);
    
    return (
      <div className="flex flex-row flex-nowrap gap-0.5 md:gap-1 justify-center items-center h-full w-full px-0.5 md:px-1 overflow-hidden">
        {dayRecords.map(r => (
          <div key={r.id} className="flex-1 aspect-square min-w-0 max-w-[2rem] max-h-[2rem] flex items-center justify-center bg-white rounded-full shadow-sm animate-fade-in shrink">
            {r.status === 'star' ? (
              <Star className="w-[70%] h-[70%] text-[#f0a63e] fill-[#f0a63e] shrink-0" />
            ) : (
              <X className="w-[70%] h-[70%] text-[#c15b40] shrink-0" />
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
          className="flex-1 w-full flex flex-col bg-white rounded-[3rem] shadow-2xl p-3 md:p-6 border-8 border-[#ffffff]/50 overflow-hidden min-h-0"
        >
          {/* Header - بيانات الابن (بشكل أفقي لتوفير المساحة العمودية) */}
          <div className="flex flex-row items-center justify-between w-full mb-2 md:mb-4 shrink-0 h-[12vh] max-h-32 px-2 md:px-8 gap-4 md:gap-8">
            <div className="flex items-center gap-4 md:gap-6 h-full shrink-0">
              <div className="h-full aspect-square rounded-full border-4 border-[#faece3] bg-[#f0e6de] overflow-hidden flex items-center justify-center shadow-lg relative">
                {activeChild.avatar_url ? (
                  <img src={activeChild.avatar_url} alt={activeChild.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[clamp(2rem,8vh,5rem)] text-[#a99c92]">{activeChild.name.charAt(0)}</span>
                )}
              </div>
              <h1 className="text-[clamp(1.5rem,5vh,4rem)] font-black text-[#352c3c] drop-shadow-sm whitespace-nowrap">{activeChild.name}</h1>
            </div>

            {/* مسار الإنجاز */}
            <div className="flex-1 flex flex-col justify-center h-full relative">
              <div className="flex justify-between items-end mb-2 md:mb-4 px-2">
                <span className="text-[clamp(0.8rem,2vh,1.2rem)] font-bold text-[#f0a63e]">مسار الإنجاز</span>
                <span className="text-[clamp(1rem,2.5vh,1.5rem)] font-bold text-[#a99c92]">{progress} / {weeklyGoal}</span>
              </div>
              <div className="relative w-full h-4 md:h-6 bg-[#f0e6de] rounded-full border-2 border-[#e2d5cc]">
                
                {/* خط التقدم */}
                <motion.div 
                  className="absolute top-0 right-0 h-full bg-gradient-to-l from-[#f0a63e] to-[#f4c88a] rounded-full"
                  initial={false}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ type: "spring", stiffness: 50, damping: 10 }}
                />

                {/* الأرنب */}
                <motion.div 
                  className="absolute top-1/2 z-10 w-[clamp(2.5rem,6vh,4.5rem)] h-[clamp(2.5rem,6vh,4.5rem)] md:w-[clamp(3rem,7vh,5rem)] md:h-[clamp(3rem,7vh,5rem)]"
                  initial={false}
                  animate={{ 
                    right: `${progressPercentage}%`,
                    x: '50%',
                    y: '-50%',
                    opacity: isCompleted ? 0 : 1,
                    scale: isCompleted ? 0.5 : 1
                  }}
                  transition={{ type: "spring", stiffness: 50, damping: 10 }}
                >
                  <img src="/assets/img/Rabbit Kick Scooter.svg" alt="Rabbit" className="w-full h-full object-contain drop-shadow-md" style={{ transform: 'scaleX(-1)' }} />
                </motion.div>
              </div>
            </div>

            {/* الميدالية / الهدف */}
            <motion.div 
              className="h-[clamp(4rem,10vh,6rem)] aspect-square md:h-[clamp(5rem,12vh,8rem)] bg-white rounded-full p-1 md:p-1.5 shadow-md border-2 md:border-4 border-[#f0a63e] flex items-center justify-center shrink-0"
              initial={false}
              animate={{
                scale: isCompleted ? 1.15 : 1,
                borderColor: isCompleted ? '#488b40' : '#f0a63e',
                boxShadow: isCompleted ? '0 10px 25px -5px rgba(72,139,64,0.4)' : '0 4px 6px -1px rgba(0,0,0,0.1)'
              }}
              transition={{ type: "spring", stiffness: 50, damping: 10 }}
            >
              <img src={activeChild.reward_image_url || "/assets/img/medal.png"} alt="Medal" className={`w-full h-full rounded-full ${activeChild.reward_image_url ? 'object-cover' : 'object-contain'}`} />
            </motion.div>
          </div>

          {/* Table - جدول الإنجازات */}
          <div className="flex-1 w-full bg-[#faece3]/30 rounded-3xl p-2 overflow-hidden shadow-inner flex flex-col border border-[#e2d5cc] min-h-0">
            {activeAchievements.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-3xl font-bold text-[#a99c92]">لا يوجد إنجازات مسندة لهذا الابن.</div>
            ) : (
              <div className="flex flex-col w-full h-full text-center gap-2 min-h-0">
                {/* Header Row */}
                <div className="flex w-full h-[8vh] max-h-16 shrink-0 gap-1 md:gap-2 mb-2 @container">
                  <div className="w-[20%] md:w-1/4 shrink-0"></div>
                  {daysWindow.map((day, idx) => (
                    <div key={idx} className="flex-1 min-w-0 h-full">
                      <div className={`h-full flex flex-col items-center justify-center px-1 rounded-xl transition-all ${day.isToday ? 'bg-[#49b5d0] text-white shadow-md scale-[1.02]' : 'bg-white text-[#a99c92] shadow-sm'}`}>
                        <span className="text-[clamp(0.7rem,30cqh,1.2rem)] font-black leading-tight truncate w-full px-1 text-center">{day.name}</span>
                        <span className="text-[clamp(0.6rem,25cqh,1rem)] font-bold opacity-80">{day.date.split('-').slice(1).reverse().join('/')}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Body Rows */}
                <div className="flex-1 flex flex-col w-full gap-1 min-h-0">
                  {activeAchievements.map(ach => (
                    <div key={ach.id} className="flex-1 flex w-full gap-1 md:gap-2 group min-h-0 @container">
                      
                      {/* Achievement Title Card */}
                      <div className="w-[25%] md:w-1/4 shrink-0 h-full p-0.5 md:p-1">
                        <div className="h-full bg-white rounded-xl md:rounded-2xl p-1 md:px-3 shadow-sm border-2 border-transparent group-hover:border-[#f0a63e] transition-colors flex flex-row items-center justify-start gap-1.5 md:gap-3 overflow-hidden">
                           {ach.icon_url ? (
                             <img src={ach.icon_url} alt={ach.title} className="h-[75%] max-h-[2.5rem] aspect-square object-contain shrink-0" />
                           ) : (
                             <Star className="h-[75%] max-h-[2.5rem] aspect-square text-[#f0a63e] shrink-0" />
                           )}
                           <span className="font-bold text-[clamp(0.65rem,3.5cqh,1.1rem)] text-[#352c3c] line-clamp-2 leading-tight text-right flex-1 min-w-0 break-words">{ach.title}</span>
                        </div>
                      </div>

                      {/* Day Cells */}
                      {daysWindow.map((day, idx) => (
                        <div key={idx} className="flex-1 min-w-0 h-full p-0.5 md:p-1">
                          <div className={`h-full w-full flex items-center justify-center p-1 rounded-xl ${day.isToday ? 'bg-white/60 border-2 border-[#49b5d0]/30' : 'bg-transparent'} transition-all overflow-hidden`}>
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
