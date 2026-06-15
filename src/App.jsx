import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import DashboardLayout from './pages/Dashboard/Layout';
import ChildrenManager from './pages/Dashboard/ChildrenManager';
import AchievementsManager from './pages/Dashboard/AchievementsManager';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#faece3] flex items-center justify-center">
        <div className="text-2xl font-bold text-[#49b5d0] animate-pulse">جاري التحميل...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

const MainApp = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
      
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<div className="text-center p-10"><h2 className="text-2xl font-bold text-[#49b5d0]">أهلاً بك في لوحة تحكم الآباء!</h2><p className="mt-4 text-[#352c3c]">من هنا يمكنك إدارة أبنائك وإنجازاتهم، وستتمكن من تقييمهم يومياً.</p></div>} />
        <Route path="children" element={<ChildrenManager />} />
        <Route path="achievements" element={<AchievementsManager />} />
      </Route>

      <Route path="/kiosk" element={<div>شاشة العرض الرئيسية سيتم بناؤها لاحقاً</div>} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <MainApp />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
