import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import FrontendLayout from './components/FrontendLayout';
import Dashboard from './pages/Dashboard';
import MemberList from './pages/MemberList';
import MemberForm from './pages/MemberForm';
import MemberRecharge from './pages/MemberRecharge';
import MemberConsume from './pages/MemberConsume';
import ConsumptionRecords from './pages/ConsumptionRecords';
import ProductManagement from './pages/ProductManagement';
import InventoryManagement from './pages/InventoryManagement';
import InventoryRecords from './pages/InventoryRecords';
import BusinessAnalysis from './pages/BusinessAnalysis';
import FrontendCashier from './pages/FrontendCashier';
import FrontendRecharge from './pages/FrontendRecharge';
import FrontendRegistration from './pages/FrontendRegistration';

import Profile from './pages/Profile';
import Login from './pages/Login';
import NotFound from './pages/NotFound';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* 登录页面 */}
      <Route 
        path="/login" 
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
        } 
      />
      
      {/* 前台收银系统路由 */}
      <Route path="/frontend" element={<FrontendLayout />}>
        <Route index element={<Navigate to="/frontend/cashier" replace />} />
        <Route path="cashier" element={<FrontendCashier />} />
        <Route path="recharge" element={<FrontendRecharge />} />
        <Route path="registration" element={<FrontendRegistration />} />
      </Route>
      
      {/* 后台管理系统路由 */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="members" element={<MemberList />} />
        <Route path="members/add" element={<MemberForm />} />
        <Route path="members/edit/:id" element={<MemberForm />} />
        <Route path="members/recharge" element={<MemberRecharge />} />
        <Route path="members/consume" element={<MemberConsume />} />
        <Route path="consumption-records" element={<ConsumptionRecords />} />
        <Route path="business-analysis" element={<BusinessAnalysis />} />
        <Route path="products" element={<ProductManagement />} />
        <Route path="products/inventory" element={<InventoryManagement />} />
        <Route path="inventory-records" element={<InventoryRecords />} />
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;