<div dir="rtl" style="text-align: right; font-family: 'Baloo Bhaijaan 2', sans-serif;">

<div align="center">
  <a href="https://ruman.sa">
    <picture>
      <source srcset="public/assets/img/H_Colored_LogoWhite@2x.png" media="(prefers-color-scheme: dark)">
      <img src="public/assets/img/H_Colored_Logo@2x.png" alt="Ruman Agency Logo" width="150" />
    </picture>
  </a>
</div>

# تطبيق إنجازي Enjazy App 🚀

[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

**إنجازي** هو نظام تفاعلي متكامل (لوحة عرض ذكية + لوحة تحكم للآباء) صُمم خصيصاً لمساعدة الآباء على متابعة وتطوير إنجازات أطفالهم اليومية بأسلوب محفز، عصري، وطفولي مبهج.

## ✨ مميزات النظام

- **لوحة تحكم الآباء (Admin Dashboard):** لإدارة الأبناء (إضافة، تعديل، حذف) وإدارة الإنجازات (تعيين الإنجازات لأطفال محددين أو للجميع).
- **تصميم طفولي وجذاب (Kids-Friendly UI):** واجهات ناعمة، ألوان مبهجة، زوايا دائرية وحركات تفاعلية جذابة مخصصة للأطفال.
- **تحديثات لحظية (Realtime Updates):** بفضل `Supabase`، تظهر التقييمات فوراً على شاشة العرض الكبيرة (التلفاز) دون الحاجة لتحديث الصفحة.
- **مؤثرات صوتية ومرئية:** احتفالات عند إنجاز المهام باستخدام `Lottie Animations` وتأثيرات صوتية مبهجة لتشجيع الطفل.
- **دعم الرفع السحابي:** إمكانية رفع صور شخصية للأبناء وأيقونات خاصة للإنجازات والمهام.
- **دعم كامل للغة العربية (RTL):** مبني بشكل أساسي لدعم اللغة العربية من اليمين لليسار.

## 🛠 التقنيات المستخدمة

- **Frontend:** React.js, Vite
- **Styling:** TailwindCSS v4
- **Backend & Database:** Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Icons:** Lucide React

## 📥 طريقة التثبيت والتشغيل

1. **استنساخ المستودع:**
   ```bash
   git clone https://github.com/rumanagency/enjazyapp.git
   cd enjazyapp
   ```

2. **تثبيت الحزم:**
   ```bash
   npm install
   ```

3. **إعداد متغيرات البيئة:**
   قم بإنشاء ملف `.env` في المسار الرئيسي وأضف بيانات Supabase الخاصة بك:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **إعداد قاعدة البيانات (Supabase):**
   - قم بإنشاء مشروع جديد في منصة Supabase.
   - افتح **SQL Editor** داخل لوحة تحكم Supabase الخاص بك.
   - انسخ جميع الأكواد الموجودة في الملفات التالية داخل مجلد `supabase/` بالترتيب وقم بتشغيلها (Run):
     1. `schema.sql`: لبناء الجداول والسياسات الأمنية (RLS).
     2. `phase5_schema.sql`: لإضافة جداول الشاشة الذكية الكشك.
     3. `admin_functions.sql`: لبرمجة دوال الأمان وحماية السوبر أدمن.
     4. `create_super_admin.sql`: لإنشاء حساب الإدارة الأولية (السوبر أدمن).

5. **استخدام حساب السوبر أدمن الأساسي 👑:**
   بعد تنفيذ سكربتات قاعدة البيانات، سيتم إنشاء حساب السوبر أدمن الافتراضي وهو الحساب الوحيد المخول بإنشاء حسابات آباء جديدة.
   - **البريد الإلكتروني:** `hi@ruman.sa`
   - **كلمة المرور:** `Ruman123@!`
   
   *(سجل دخولك بهذا الحساب، وتوجه إلى شاشة "إدارة الآباء" لإنشاء مستخدمين للتطبيق).*

6. **تشغيل خادم التطوير:**
   ```bash
   npm run dev
   ```

## 📝 الحقوق والمطورين

تم تصميم وبرمجة هذا النظام بواسطة **صالح** من **وكالة رمان (Ruman Agency)**.

- 📧 **البريد الإلكتروني:** [hi@ruman.sa](mailto:hi@ruman.sa)
- 📱 **واتساب:** [+966539294989](https://wa.me/966539294989)
- 🌐 **الموقع الإلكتروني:** [https://ruman.sa](https://ruman.sa)

---
<div align="center">
  صُنع بحب 💖 لدعم أبنائنا وتحفيزهم
</div>
</div>
