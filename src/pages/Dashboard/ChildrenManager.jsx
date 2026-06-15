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
  const [formData, setFormData] = useState({ name: '', avatar_url: '', kiosk_duration: 10 });
  const [editingId, setEditingId] = useState(null);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchChildren();
  }, [user]);

  const fetchChildren = async () => {
    try {
      const { data, error } = await supabase
        .from('children')
        .select('*')
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

      if (file) {
        finalAvatarUrl = await uploadFile(file);
      }

      if (editingId) {
        const { error } = await supabase
          .from('children')
          .update({ name: formData.name, avatar_url: finalAvatarUrl, kiosk_duration: formData.kiosk_duration })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        if (children.length >= 5) {
          alert('عذراً، الحد الأقصى هو 5 أبناء.');
          return;
        }
        const { error } = await supabase
          .from('children')
          .insert([{ name: formData.name, avatar_url: finalAvatarUrl, kiosk_duration: formData.kiosk_duration, parent_id: user.id }]);
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
    setFormData({ name: '', avatar_url: '', kiosk_duration: 10 });
    setEditingId(null);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEdit = (child) => {
    setFormData({ name: child.name, avatar_url: child.avatar_url || '', kiosk_duration: child.kiosk_duration || 10 });
    setEditingId(child.id);
    setFile(null);
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex flex-col gap-4 flex-1">
              <Input
                id="name"
                label="اسم الابن"
                placeholder="مثال: أحمد"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
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
              />
            </div>
            <div className="flex-1 flex flex-col gap-2 w-full justify-start">
              <label className="text-[#352c3c] font-bold text-lg px-2">رابط الصورة (اختياري)</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 px-6 py-4 rounded-3xl border-2 border-[#e2d5cc] bg-white text-[#333333] placeholder-[#a99c92] outline-none transition-all duration-300 focus:border-[#49b5d0] focus:ring-4 focus:ring-[#49b5d0]/20 text-left"
                  dir="ltr"
                  placeholder="https://..."
                  value={formData.avatar_url}
                  onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                  disabled={file !== null}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`px-4 py-4 rounded-3xl border-2 font-bold transition-all flex items-center justify-center ${file ? 'border-[#488b40] text-[#488b40] bg-[#488b40]/10' : 'border-[#49b5d0] text-[#49b5d0] hover:bg-[#49b5d0]/10'}`}
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
                      setFormData({ ...formData, avatar_url: '' });
                    }
                  }}
                />
              </div>
              {file && <span className="text-sm text-[#488b40] font-bold px-2">تم اختيار ملف: {file.name}</span>}
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
              <Button type="submit" variant="primary" className="flex-1 md:flex-none gap-2" disabled={isUploading}>
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
                <Button variant="secondary" className="flex-1" onClick={() => handleEdit(child)}>
                  <Pencil size={18} />
                </Button>
                <Button variant="danger" className="flex-1" onClick={() => handleDelete(child.id)}>
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
