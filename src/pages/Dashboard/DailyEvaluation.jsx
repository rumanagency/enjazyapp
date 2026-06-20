import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import confetti from 'canvas-confetti';
import { Star, X } from 'lucide-react';
import { motion } from 'framer-motion';

const DailyEvaluation = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [activeChild, setActiveChild] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [dailyRecords, setDailyRecords] = useState([]);
  const [weeklyRecords, setWeeklyRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Audio references
  const cheerAudio = useRef(null);
  const sadAudio = useRef(null);

  useEffect(() => {
    cheerAudio.current = new Audio('/assets/sounds/kids-cheering-sound-effect.mp3');
    sadAudio.current = new Audio('/assets/sounds/wah-wah-sad-sound-effect.mp3');
    fetchChildren();
  }, [user]);

  useEffect(() => {
    if (activeChild) {
      fetchAchievementsAndRecords(activeChild.id);
    }
  }, [activeChild]);

  // Use local timezone date to avoid UTC rollover issues
  const getToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const fetchChildren = async () => {
    try {
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('parent_id', user.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setChildren(data || []);
      if (data && data.length > 0) {
        setActiveChild(data[0]);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching children:', error);
      setLoading(false);
    }
  };

  const fetchAchievementsAndRecords = async (childId) => {
    setLoading(true);
    try {
      const { data: linkData, error: linkError } = await supabase
        .from('child_achievements')
        .select('achievement_id')
        .eq('child_id', childId);
      
      if (linkError) throw linkError;

      const achievementIds = linkData.map(l => l.achievement_id);
      
      let achData = [];
      if (achievementIds.length > 0) {
        const { data, error } = await supabase
          .from('achievements')
          .select('*')
          .in('id', achievementIds);
        if (error) throw error;
        achData = data;
      }
      setAchievements(achData);

      const getStartOfWeek = () => {
        const d = new Date();
        d.setDate(d.getDate() - d.getDay()); // Sunday
        return d;
      };

      const startOfWeek = getStartOfWeek();
      const child = children.find(c => c.id === childId);
      const resetTimestamp = child?.path_reset_timestamp ? new Date(child.path_reset_timestamp) : new Date(0);
      const effectiveStartDate = resetTimestamp > startOfWeek ? resetTimestamp : startOfWeek;
      const effectiveStartDateStr = `${effectiveStartDate.getFullYear()}-${String(effectiveStartDate.getMonth() + 1).padStart(2, '0')}-${String(effectiveStartDate.getDate()).padStart(2, '0')}`;

      const { data: recordsData, error: recordsError } = await supabase
        .from('daily_records')
        .select('*')
        .eq('child_id', childId)
        .gte('date', effectiveStartDateStr);
      
      if (recordsError) throw recordsError;
      
      setWeeklyRecords(recordsData || []);
      const today = getToday();
      setDailyRecords((recordsData || []).filter(r => r.date === today));
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const playConfettiAndSound = () => {
    if (cheerAudio.current) {
      cheerAudio.current.currentTime = 0;
      cheerAudio.current.play().catch(e => console.error("Audio play failed", e));
    }
    
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#49b5d0', '#f0a63e', '#488b40', '#c15b40'] });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#49b5d0', '#f0a63e', '#488b40', '#c15b40'] });
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

  const handleEvaluate = async (achievementId, status) => {
    const today = getToday();
    const recordsForThisAchievement = dailyRecords.filter(r => r.achievement_id === achievementId);
    
    if (recordsForThisAchievement.length >= 5) {
      alert('الحد الأقصى هو 5 تقييمات لهذا الإنجاز اليوم.');
      return;
    }

    try {
      const newRecord = {
        child_id: activeChild.id,
        achievement_id: achievementId,
        date: today,
        status: status
      };

      const { data, error } = await supabase
        .from('daily_records')
        .insert([newRecord])
        .select();

      // IF there is a DB error (like Unique constraint not removed), alert the user exactly!
      if (error) {
        alert('خطأ من قاعدة البيانات: ' + error.message);
        return;
      }

      if (data && data.length > 0) {
        setDailyRecords(prev => [...prev, data[0]]);
        setWeeklyRecords(prev => [...prev, data[0]]);
      } else {
        // Fallback
        fetchAchievementsAndRecords(activeChild.id);
      }

      if (status === 'star') {
        playConfettiAndSound();
      } else {
        playSadSound();
      }

    } catch (error) {
      console.error('Error recording evaluation:', error);
      alert('حدث خطأ غير متوقع: ' + error.message);
    }
  };

  const handleUndo = async (recordId) => {
    if (!window.confirm('هل أنت متأكد من التراجع عن هذا التقييم؟')) return;
    try {
      const { error } = await supabase
        .from('daily_records')
        .delete()
        .eq('id', recordId);
      
      if (error) {
         alert('خطأ في التراجع: ' + error.message);
         return;
      }
      setDailyRecords(prev => prev.filter(r => r.id !== recordId));
      setWeeklyRecords(prev => prev.filter(r => r.id !== recordId));
    } catch (error) {
      alert('حدث خطأ غير متوقع: ' + error.message);
    }
  };

  const renderEvaluationMarks = (achievementId) => {
    const records = dailyRecords.filter(r => r.achievement_id === achievementId);
    const marks = [];
    
    for (let i = 0; i < 5; i++) {
      if (i < records.length) {
        const r = records[i];
        marks.push(
          <button 
            key={r?.id || i} 
            onClick={() => r?.id && handleUndo(r.id)}
            title="انقر للتراجع عن هذا التقييم"
            className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm animate-bounce hover:ring-2 ring-red-400 transition-all cursor-pointer"
          >
            {r?.status === 'star' ? <Star size={20} className="text-[#f0a63e] fill-[#f0a63e]" /> : <X size={20} className="text-[#c15b40]" />}
          </button>
        );
      } else {
        marks.push(
          <div key={`empty-${i}`} className="w-8 h-8 flex items-center justify-center bg-[#faece3] rounded-full opacity-50 border border-[#e2d5cc]"></div>
        );
      }
    }
    return <div className="flex gap-2 justify-center my-3">{marks}</div>;
  };

  const getStartOfWeekDisplay = () => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay()); // Sunday
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const startOfWeekDisplay = getStartOfWeekDisplay();
  const resetTimestampDisplay = activeChild?.path_reset_timestamp ? new Date(activeChild.path_reset_timestamp) : new Date(0);
  const effectiveStartDateDisplay = resetTimestampDisplay > startOfWeekDisplay ? resetTimestampDisplay : startOfWeekDisplay;

  let validStars = 0;
  let validCrosses = 0;
  weeklyRecords.forEach(r => {
    const recordTime = r.created_at ? new Date(r.created_at) : new Date(r.date);
    if (recordTime >= effectiveStartDateDisplay) {
      if (r.status === 'star') validStars++;
      else if (r.status === 'cross') validCrosses++;
    }
  });

  const progress = Math.max(0, validStars - validCrosses);
  const weeklyGoal = activeChild?.weekly_star_goal || 10;
  const progressPercentage = Math.min(100, Math.max(0, (progress / weeklyGoal) * 100));
  const isCompleted = progressPercentage >= 100;

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-[#352c3c]">التقييم اليومي</h1>
      </div>

      {children.length === 0 ? (
        <div className="text-center text-[#a99c92] font-bold p-8 border-2 border-dashed border-[#e2d5cc] rounded-3xl">
          <p className="text-xl mb-4">لم يتم العثور على أبناء مرتبطين بهذا الحساب.</p>
        </div>
      ) : (
        <>
          <div className="flex overflow-x-auto gap-4 pb-2 snap-x scrollbar-hide">
            {children.map(child => (
              <button
                key={child.id}
                onClick={() => setActiveChild(child)}
                className={`flex-none snap-start flex items-center gap-3 px-6 py-3 rounded-full font-bold transition-all border-2 ${
                  activeChild?.id === child.id
                    ? 'border-[#49b5d0] bg-[#49b5d0]/10 text-[#49b5d0] shadow-md scale-105'
                    : 'border-[#e2d5cc] bg-white text-[#a99c92] hover:border-[#49b5d0]/50'
                }`}
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-[#f0e6de] flex items-center justify-center shrink-0">
                  {child.avatar_url ? (
                    <img src={child.avatar_url} alt={child.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm">{child.name.charAt(0)}</span>
                  )}
                </div>
                {child.name}
              </button>
            ))}
          </div>

          {!loading && activeChild && (
            <Card className="my-6 bg-white shadow-sm border-2 border-[#e2d5cc] p-4 md:p-6">
              <div className="flex flex-row items-center justify-between gap-4 md:gap-8 w-full">
                
                {/* مسار الإنجاز */}
                <div className="flex-1 flex flex-col justify-center relative">
                  <div className="flex justify-between items-end mb-2 md:mb-4 px-2">
                    <span className="font-bold text-[clamp(0.9rem,3vw,1.2rem)] text-[#f0a63e]">مسار إنجاز {activeChild.name}</span>
                    <span className="font-bold text-[clamp(0.9rem,3vw,1.2rem)] text-[#a99c92]">{progress} / {weeklyGoal}</span>
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
                      className="absolute top-1/2 z-10 w-[clamp(2.5rem,6vh,4.5rem)] h-[clamp(2.5rem,6vh,4.5rem)] md:w-[3.5rem] md:h-[3.5rem]"
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

                {/* الميدالية */}
                <motion.div 
                  className="w-[clamp(4rem,10vh,6rem)] h-[clamp(4rem,10vh,6rem)] md:w-[5rem] md:h-[5rem] bg-white rounded-full p-1 md:p-1.5 shadow-md border-2 md:border-4 flex items-center justify-center shrink-0"
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
            </Card>
          )}

          {loading ? (
            <div className="text-center text-[#a99c92] font-bold py-10">جاري التحميل...</div>
          ) : achievements.length === 0 ? (
            <Card className="text-center">
              <p className="text-[#a99c92] font-bold">لا يوجد إنجازات مخصصة لهذا الطفل حتى الآن.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {achievements.map(ach => {
                const recordsCount = dailyRecords.filter(r => r.achievement_id === ach.id).length;
                const isMaxedOut = recordsCount >= 5;

                return (
                  <Card key={ach.id} className="flex flex-col gap-4 items-center text-center">
                    <div className="w-20 h-20 rounded-3xl bg-[#faece3] flex items-center justify-center p-3 shadow-inner">
                      {ach.icon_url ? (
                        <img src={ach.icon_url} alt={ach.title} className="max-w-full max-h-full object-contain drop-shadow-md" />
                      ) : (
                        <Star size={40} className="text-[#f0a63e]" />
                      )}
                    </div>
                    
                    <h3 className="text-2xl font-bold text-[#352c3c]">{ach.title}</h3>
                    
                    {renderEvaluationMarks(ach.id)}

                    <div className="flex gap-4 w-full mt-2">
                      <Button 
                        variant="danger" 
                        className="flex-1 rounded-3xl h-14" 
                        onClick={() => handleEvaluate(ach.id, 'cross')}
                        disabled={isMaxedOut}
                      >
                        <X size={28} />
                      </Button>
                      <Button 
                        variant="success" 
                        className="flex-1 rounded-3xl h-14 relative overflow-hidden group" 
                        onClick={() => handleEvaluate(ach.id, 'star')}
                        disabled={isMaxedOut}
                      >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        <Star size={28} className="fill-white" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DailyEvaluation;
