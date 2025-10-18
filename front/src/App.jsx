import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import "../src/App.css";
import Menu from './components/Menu';
import Planos from './pages/Planos';
import Login from './pages/Login';
import LoginNaoAutorizado from './pages/LoginNaoAutorizado';
import Dashboard from './pages/Dashboard/Dashboard';
import Success from './pages/Stripe/Success';
import Cancel from './pages/Stripe/Cancel';
import Sobre from './pages/Sobre';
import Termos from './pages/Termos';
import PoliticaPrivacidade from './pages/PoliticaPrivacidade';
import { ToastProvider, GlobalToastContainer } from './components/Toast.jsx';
import CookieConsent from './components/CookieConsent';
import Logo from './components/Logo.jsx';

function App() {
  const [plano, setPlano] = useState('free');

  return (
    <ToastProvider>
      <BrowserRouter>
        {/* <Menu /> */}
        
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/planos' element={<Planos setPlano={setPlano} />} />
          <Route path='/login' element={<Login plano={plano} />} />
          <Route path='/login-nao-autorizado' element={<LoginNaoAutorizado />} />
          <Route path='/dashboard/*' element={<Dashboard plano={plano} />} />
          <Route path='/success?' element={<Success />} />
          <Route path='/cancel' element={<Cancel />} />
          <Route path='/sobre' element={<Sobre />} />
          <Route path='/termos' element={<Termos />} />
          <Route path='/politica-de-privacidade' element={<PoliticaPrivacidade />} />
          <Route path='*' element={<p className='font-bold p-5 w-full text-2xl'><Logo scale={1}/>404 Pagina não encontrada. \: <a href="/login" className='text-blue-300'>Ir para Login</a></p>} />
        </Routes>
        
        <GlobalToastContainer position="top-right" />
        <CookieConsent />
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
