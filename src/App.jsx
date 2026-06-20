import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import DashboardLayout from './pages/Dashboard/Layout';
import ChildrenManager from './pages/Dashboard/ChildrenManager';
import AchievementsManager from './pages/Dashboard/AchievementsManager';
import DailyEvaluation from './pages/Dashboard/DailyEvaluation';
import KioskManager from './pages/Dashboard/KioskManager';
import AdminManager from './pages/Dashboard/AdminManager';
import Home from './pages/Dashboard/Home';
import KioskPairing from './pages/Kiosk/KioskPairing';
import KioskDisplay from './pages/Kiosk/KioskDisplay';

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
        <Route index element={<Home />} />
        <Route path="evaluation" element={<DailyEvaluation />} />
        <Route path="children" element={<ChildrenManager />} />
        <Route path="achievements" element={<AchievementsManager />} />
        <Route path="admin" element={<AdminManager />} />
      </Route>

      <Route path="/kiosk" element={<KioskPairing />} />
      <Route path="/kiosk/display" element={<KioskDisplay />} />
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
