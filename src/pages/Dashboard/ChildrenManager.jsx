import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Pencil, Trash2, Plus, Upload } from 'lucide-react';

const ChildrenManager = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: '', avatar_url: '', reward_image_url: '', kiosk_duration: 10, weekly_star_goal: 10 });
  const [editingId, setEditingId] = useState(null);
  const [file, setFile] = useState(null);
  const [rewardFile, setRewardFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const rewardInputRef = useRef(null);

  useEffect(() => {
    fetchChildren();
  }, [user]);

  const fetchChildren = async () => {
    try {
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('parent_id', user.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setChildren(data || []);
    } catch (error) {
      console.error('Error fetching children:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (uploadFile) => {
    const fileExt = uploadFile.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `avatars/${user.id}/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filePath, uploadFile);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('uploads').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setIsUploading(true);
      let finalAvatarUrl = formData.avatar_url;
      let finalRewardUrl = formData.reward_image_url;

      if (file) {
        finalAvatarUrl = await uploadFile(file);
      }
      if (rewardFile) {
        finalRewardUrl = await uploadFile(rewardFile);
      }

      if (editingId) {
        const { error } = await supabase
          .from('children')
          .update({ name: formData.name, avatar_url: finalAvatarUrl, reward_image_url: finalRewardUrl, kiosk_duration: formData.kiosk_duration, weekly_star_goal: formData.weekly_star_goal })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        if (children.length >= 5) {
          alert('عذراً، الحد الأقصى هو 5 أبناء.');
          return;
        }
        const { error } = await supabase
          .from('children')
          .insert([{ name: formData.name, avatar_url: finalAvatarUrl, reward_image_url: finalRewardUrl, kiosk_duration: formData.kiosk_duration, weekly_star_goal: formData.weekly_star_goal, parent_id: user.id }]);
        if (error) throw error;
      }
      resetForm();
      fetchChildren();
    } catch (error) {
      console.error('Error saving child:', error);
      alert('حدث خطأ أثناء الحفظ. تأكد من تفعيل Storage Bucket في Supabase.');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', avatar_url: '', reward_image_url: '', kiosk_duration: 10, weekly_star_goal: 10 });
    setEditingId(null);
    setFile(null);
    setRewardFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (rewardInputRef.current) rewardInputRef.current.value = '';
  };

  const handleEdit = (child) => {
    setFormData({ name: child.name, avatar_url: child.avatar_url || '', reward_image_url: child.reward_image_url || '', kiosk_duration: child.kiosk_duration || 10, weekly_star_goal: child.weekly_star_goal || 10 });
    setEditingId(child.id);
    setFile(null);
    setRewardFile(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الابن؟')) return;
    try {
      const { error } = await supabase.from('children').delete().eq('id', id);
      if (error) throw error;
      fetchChildren();
    } catch (error) {
      console.error('Error deleting child:', error);
      alert('حدث خطأ أثناء الحذف');
    }
  };

  const handleResetPath = async (id) => {
    if (!window.confirm('هل أنت متأكد من تصفير مسار الإنجاز؟ سيبدأ العد من الصفر دون حذف النجوم السابقة.')) return;
    try {
      const { error } = await supabase
        .from('children')
        .update({ path_reset_timestamp: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      alert('تم تصفير المسار بنجاح!');
      fetchChildren();
    } catch (error) {
      console.error('Error resetting path:', error);
      alert('حدث خطأ أثناء تصفير المسار');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-[#352c3c]">إدارة الأبناء</h1>
        <span className="bg-[#49b5d0]/20 text-[#49b5d0] px-4 py-2 rounded-full font-bold">
          {children.length} / 5 أطفال
        </span>
      </div>

      <Card>
        <h2 className="text-xl font-bold text-[#f0a63e] mb-4">
          {editingId ? 'تعديل بيانات الابن' : 'إضافة ابن جديد'}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 flex flex-col gap-4">
              <Input
                id="name"
                label="اسم الابن"
                placeholder="مثال: أحمد"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <div className="flex flex-col sm:flex-row gap-4">
                <Input
                  id="kiosk_duration"
                  type="number"
                  min="5"
                  max="300"
                  label="مدة العرض بالشاشة (ثواني)"
                  placeholder="10"
                  value={formData.kiosk_duration}
                  onChange={(e) => setFormData({ ...formData, kiosk_duration: parseInt(e.target.value) || 10 })}
                  required
                  className="flex-1"
                />
                <Input
                  id="weekly_star_goal"
                  type="number"
                  min="1"
                  max="100"
                  label="هدف النجوم الأسبوعي"
                  placeholder="10"
                  value={formData.weekly_star_goal}
                  onChange={(e) => setFormData({ ...formData, weekly_star_goal: parseInt(e.target.value) || 10 })}
                  required
                  className="flex-1"
                />
              </div>
            </div>
            
            <div className="lg:col-span-7 flex flex-col md:flex-row gap-4 w-full">
              <div className="flex-1 flex flex-col gap-2 w-full justify-start">
                <label className="text-[#352c3c] font-bold text-lg px-2 whitespace-nowrap">صورة الابن (اختياري)</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex-1 px-4 py-4 rounded-3xl border-2 font-bold transition-all flex items-center justify-center gap-2 ${file ? 'border-[#488b40] text-[#488b40] bg-[#488b40]/10' : 'border-[#49b5d0] text-[#49b5d0] hover:bg-[#49b5d0]/10'}`}
                    title="رفع صورة من الجهاز"
                  >
                    <Upload size={24} />
                    <span>{file ? 'تم اختيار صورة للتحديث' : (formData.avatar_url ? 'تحديث الصورة' : 'رفع صورة من الجهاز')}</span>
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setFile(e.target.files[0]);
                        setFormData({ ...formData, avatar_url: '' });
                      }
                    }}
                  />
                </div>
                {file && <span className="text-sm text-[#488b40] font-bold px-2 truncate">تم اختيار ملف: {file.name}</span>}
                {!file && formData.avatar_url && <span className="text-sm text-[#49b5d0] font-bold px-2">توجد صورة مسجلة مسبقاً</span>}
              </div>

              <div className="flex-1 flex flex-col gap-2 w-full justify-start">
                <label className="text-[#352c3c] font-bold text-lg px-2 whitespace-nowrap">صورة الإنجاز (الميدالية)</label>
                <div className="flex gap-2 items-center">
                  <button
                    type="button"
                    onClick={() => rewardInputRef.current?.click()}
                    className={`flex-1 px-4 py-4 rounded-3xl border-2 font-bold transition-all flex items-center justify-center gap-2 ${rewardFile ? 'border-[#488b40] text-[#488b40] bg-[#488b40]/10' : 'border-[#f0a63e] text-[#f0a63e] hover:bg-[#f0a63e]/10'}`}
                    title="رفع صورة للإنجاز بدلاً من الميدالية"
                  >
                    <Upload size={24} />
                    <span>{rewardFile ? 'تم اختيار صورة للإنجاز' : (formData.reward_image_url ? 'تحديث صورة الإنجاز' : 'صورة الإنجاز (اختياري)')}</span>
                  </button>
                  <input 
                    type="file" 
                    ref={rewardInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setRewardFile(e.target.files[0]);
                        setFormData({ ...formData, reward_image_url: '' });
                      }
                    }}
                  />
                </div>
                {rewardFile && <span className="text-sm text-[#488b40] font-bold px-2 truncate">تم اختيار ملف: {rewardFile.name}</span>}
                {!rewardFile && formData.reward_image_url && <span className="text-sm text-[#f0a63e] font-bold px-2">توجد صورة إنجاز مسجلة</span>}
              </div>
            </div>
          </div>
          
          <div className="flex gap-4 w-full md:w-1/3 mt-2">
            <Button type="submit" variant="primary" className="flex-1 gap-2" disabled={isUploading}>
              {isUploading ? (
                <span>جاري الرفع...</span>
              ) : (
                <>
                  <Plus size={20} />
                  <span>{editingId ? 'تحديث بيانات الابن' : 'إضافة ابن'}</span>
                </>
              )}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm} disabled={isUploading} className="flex-1">
                إلغاء
              </Button>
            )}
          </div>
        </form>
      </Card>

      {loading ? (
        <div className="text-center text-[#a99c92] font-bold">جاري التحميل...</div>
      ) : children.length === 0 ? (
        <div className="text-center text-[#a99c92] font-bold p-8">لم يتم إضافة أي أبناء بعد.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {children.map((child) => (
            <Card key={child.id} className="flex flex-col items-center text-center gap-4 hover:-translate-y-1 transition-transform">
              <div className="w-24 h-24 rounded-full border-4 border-[#faece3] bg-[#f0e6de] overflow-hidden flex items-center justify-center">
                {child.avatar_url ? (
                  <img src={child.avatar_url} alt={child.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl text-[#a99c92]">{child.name.charAt(0)}</span>
                )}
              </div>
              <h3 className="text-2xl font-bold text-[#352c3c]">{child.name}</h3>
              <p className="text-sm text-[#a99c92] font-bold">مدة العرض بالشاشة: {child.kiosk_duration || 10} ثواني</p>
              
              <div className="flex gap-2 w-full mt-2">
                <Button variant="outline" className="flex-1 text-[#f0a63e] border-[#f0a63e] hover:bg-[#f0a63e]/10 whitespace-nowrap px-2" onClick={() => handleResetPath(child.id)}>
                  تصفير المسار
                </Button>
                <Button variant="secondary" className="px-3" onClick={() => handleEdit(child)}>
                  <Pencil size={18} />
                </Button>
                <Button variant="danger" className="px-3" onClick={() => handleDelete(child.id)}>
                  <Trash2 size={18} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChildrenManager;
