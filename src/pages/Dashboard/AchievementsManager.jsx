import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Pencil, Trash2, Plus, Check, Star, Upload } from 'lucide-react';

const iconModules = import.meta.glob('/public/assets/icons/*.{png,jpg,jpeg,svg,gif}', { eager: true });
const AVAILABLE_ICONS = Object.keys(iconModules).map(path => path.replace('/public', ''));

const AchievementsManager = () => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState([]);
  const [children, setChildren] = useState([]);
  const [childAchievements, setChildAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({ title: '', icon_url: '' });
  const [editingId, setEditingId] = useState(null);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const { data: childData, error: childError } = await supabase.from('children').select('*').eq('parent_id', user.id).order('created_at', { ascending: true });
      if (childError) throw childError;
      
      const childIds = childData.map(c => c.id);

      const [achData, linkData] = await Promise.all([
        supabase.from('achievements').select('*').eq('parent_id', user.id).order('created_at', { ascending: true }),
        childIds.length > 0 
          ? supabase.from('child_achievements').select('*').in('child_id', childIds) 
          : Promise.resolve({ data: [] })
      ]);

      if (achData.error) throw achData.error;
      if (linkData.error) throw linkData.error;

      setAchievements(achData.data || []);
      setChildren(childData || []);
      setChildAchievements(linkData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (uploadFile) => {
    const fileExt = uploadFile.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `icons/${user.id}/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filePath, uploadFile);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('uploads').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    try {
      setIsUploading(true);
      let finalIconUrl = formData.icon_url;

      if (file) {
        finalIconUrl = await uploadFile(file);
      }

      if (editingId) {
        const { error } = await supabase
          .from('achievements')
          .update({ title: formData.title, icon_url: finalIconUrl })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('achievements')
          .insert([{ title: formData.title, icon_url: finalIconUrl, parent_id: user.id }]);
        if (error) throw error;
      }
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving achievement:', error);
      alert('حدث خطأ أثناء الحفظ. تأكد من إعداد Storage بشكل صحيح.');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({ title: '', icon_url: '' });
    setEditingId(null);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEdit = (ach) => {
    setFormData({ title: ach.title, icon_url: ach.icon_url || '' });
    setEditingId(ach.id);
    setFile(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الإنجاز؟')) return;
    try {
      const { error } = await supabase.from('achievements').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting achievement:', error);
      alert('حدث خطأ أثناء الحذف');
    }
  };

  const toggleAssignment = async (childId, achievementId) => {
    try {
      const exists = childAchievements.find(
        ca => ca.child_id === childId && ca.achievement_id === achievementId
      );

      if (exists) {
        await supabase
          .from('child_achievements')
          .delete()
          .match({ child_id: childId, achievement_id: achievementId });
      } else {
        await supabase
          .from('child_achievements')
          .insert([{ child_id: childId, achievement_id: achievementId }]);
      }
      fetchData();
    } catch (error) {
      console.error('Error toggling assignment:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-[#352c3c]">إدارة الإنجازات</h1>
      </div>

      <Card>
        <h2 className="text-xl font-bold text-[#488b40] mb-4">
          {editingId ? 'تعديل الإنجاز' : 'إضافة إنجاز جديد'}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
            <div className="lg:col-span-4">
              <Input
                id="title"
                label="عنوان الإنجاز"
                placeholder="مثال: ترتيب السرير"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full"
              />
            </div>
            
            <div className="lg:col-span-6 flex flex-col gap-2 w-full min-w-0">
              <label className="text-[#352c3c] font-bold text-lg px-2 whitespace-nowrap">اختر أيقونة الإنجاز أو ارفع صورة</label>
              <div className="flex gap-2 items-center">
                <div className="flex-1 flex overflow-x-auto gap-2 p-2 bg-white border-2 border-[#e2d5cc] rounded-3xl items-center scrollbar-hide snap-x">
                  {AVAILABLE_ICONS.map(iconPath => (
                    <button
                      key={iconPath}
                      type="button"
                      onClick={() => { setFormData({ ...formData, icon_url: iconPath }); setFile(null); }}
                      className={`w-12 h-12 shrink-0 p-2 rounded-2xl border-2 transition-all snap-start ${formData.icon_url === iconPath && !file ? 'border-[#49b5d0] bg-[#49b5d0]/10 scale-110 shadow-sm' : 'border-transparent hover:bg-[#faece3]'}`}
                      title={iconPath.split('/').pop().split('.')[0]}
                    >
                      <img src={iconPath} alt={iconPath.split('/').pop()} className="w-full h-full object-contain drop-shadow-sm" />
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-14 h-14 shrink-0 rounded-3xl border-2 font-bold transition-all flex items-center justify-center shadow-sm ${file ? 'border-[#488b40] text-[#488b40] bg-[#488b40]/10' : 'border-[#49b5d0] text-[#49b5d0] hover:bg-[#49b5d0]/10'}`}
                  title="رفع صورة من الجهاز"
                >
                  <Upload size={24} />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFile(e.target.files[0]);
                      setFormData({ ...formData, icon_url: '' });
                    }
                  }}
                />
              </div>
              {file && <span className="text-sm text-[#488b40] font-bold px-2 truncate">تم اختيار ملف: {file.name}</span>}
            </div>

            <div className="lg:col-span-2 flex gap-2 w-full">
              <Button type="submit" variant="success" className="flex-1 gap-2" disabled={isUploading}>
                {isUploading ? (
                  <span>جاري الرفع...</span>
                ) : (
                  <>
                    <Plus size={20} />
                    <span>{editingId ? 'تحديث' : 'إضافة'}</span>
                  </>
                )}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm} disabled={isUploading}>
                  إلغاء
                </Button>
              )}
            </div>
          </div>
        </form>
      </Card>

      {loading ? (
        <div className="text-center text-[#a99c92] font-bold">جاري التحميل...</div>
      ) : achievements.length === 0 ? (
        <div className="text-center text-[#a99c92] font-bold p-8">لم يتم إضافة أي إنجازات بعد.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {achievements.map((ach) => (
            <Card key={ach.id} className="flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#faece3] flex items-center justify-center p-2">
                    {ach.icon_url ? (
                      <img src={ach.icon_url} alt={ach.title} className="max-w-full max-h-full object-contain" />
                    ) : (
                      <Star size={32} className="text-[#f0a63e]" />
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-[#352c3c]">{ach.title}</h3>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(ach)} className="p-2 text-[#49b5d0] hover:bg-[#49b5d0]/10 rounded-full transition-colors">
                    <Pencil size={20} />
                  </button>
                  <button onClick={() => handleDelete(ach.id)} className="p-2 text-[#c15b40] hover:bg-[#c15b40]/10 rounded-full transition-colors">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              {/* Assignment Section */}
              <div className="mt-4 pt-4 border-t border-[#f0e6de]">
                <h4 className="font-bold text-[#a99c92] mb-3 text-sm">مخصص لـ:</h4>
                {children.length === 0 ? (
                  <p className="text-sm text-[#c15b40]">لم يتم إضافة أبناء بعد.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {children.map(child => {
                      const isAssigned = childAchievements.some(
                        ca => ca.child_id === child.id && ca.achievement_id === ach.id
                      );
                      return (
                        <button
                          key={child.id}
                          onClick={() => toggleAssignment(child.id, ach.id)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold transition-all border-2 ${
                            isAssigned 
                              ? 'border-[#488b40] bg-[#488b40]/10 text-[#488b40]' 
                              : 'border-[#e2d5cc] bg-transparent text-[#a99c92] hover:border-[#49b5d0] hover:text-[#49b5d0]'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center border ${isAssigned ? 'bg-[#488b40] border-[#488b40]' : 'border-[#a99c92]'}`}>
                            {isAssigned && <Check size={10} className="text-white" />}
                          </div>
                          {child.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AchievementsManager;
