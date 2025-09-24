import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import "../src/app.css";
import Menu from './components/Menu';
import Planos from './pages/Planos';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import api from '../src/Api';
import Success from './pages/Stripe/Success';
import Cancel from './pages/Stripe/Cancel';

function App() {
  const [plano, setPlano] = useState('free');
  const [logado, setLogado] = useState(false);
  const [needToPay, setNeedToPay] = useState(false);

  useEffect(() => {
    // Verificar autenticação usando apenas cookies httpOnly
    api.get('/dashboard')
      .then((res) => {
        if (res.data.user) {
          console.log(res.data)
          setLogado(true);
          setNeedToPay(res.data.user.planInfos?.status !== 'ativo' && res.data.user.planInfos?.planType !== 'free');
        }
      })
      .catch((err) => {
        console.log('Usuário não autenticado ou sessão expirada', err);
        setLogado(false);
      });
  }, []);

  return (
    <BrowserRouter>
      {/* <Menu /> */}
      
      <Routes>
        <Route path='/' element={<Home logado={logado}/>} />
        <Route path='/planos' element={<Planos setPlano={setPlano} setNeedToPay={setNeedToPay} />} />
        <Route path='/login' element={<Login plano={plano} setLogado={setLogado} logado={logado} />} />
        <Route path='/dashboard/*' element={<Dashboard needToPay={needToPay} plano={plano} />} />
        <Route path='/success?' element={<Success />} />
        <Route path='/cancel' element={<Cancel />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
