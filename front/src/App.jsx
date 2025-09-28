import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import "../src/app.css";
import Menu from './components/Menu';
import Planos from './pages/Planos';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Success from './pages/Stripe/Success';
import Cancel from './pages/Stripe/Cancel';
import { ToastProvider, GlobalToastContainer } from './components/Toast.jsx';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';

// Componente interno que usa o contexto de autenticação
function AppRoutes() {
  const [plano, setPlano] = useState('free');
  const { isAuthenticated, needToPay } = useAuth();

  return (
    <Routes>
      <Route path='/' element={<Home logado={isAuthenticated}/>} />
      <Route path='/planos' element={<Planos setPlano={setPlano} />} />
      <Route path='/login' element={<Login plano={plano} />} />
      <Route path='/dashboard/*' element={<Dashboard needToPay={needToPay} plano={plano} />} />
      <Route path='/success?' element={<Success />} />
      <Route path='/cancel' element={<Cancel />} />
    </Routes>
  );
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          {/* <Menu /> */}
          
          <AppRoutes />
          
          <GlobalToastContainer position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
