import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, CheckCircle, XCircle, Smartphone, Monitor, MapPin, Clock, User } from 'lucide-react';
import Logo from '../components/Logo';
import { useToast } from '../components/Toast.jsx';
import api from '../Api.js'

const LoginNaoAutorizado = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [error, setError] = useState('');

  // Extrair parâmetros da URL
  const ticket = searchParams.get('ticket');

  useEffect(() => {
    // Validar se todos os parâmetros necessários estão presentes
    if (!ticket) {
      setError('Link inválido ou parâmetros ausentes');
    }
  }, [ticket]);

  const handleBlockDevice = async () => {
    if (!ticket) {
      setError('Parâmetros inválidos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post(`/login-nao-autorizado`, {
        ticket
      })

      const data = response.data;

      if (data.success) {
        setBlocked(true);
        setDeviceInfo(data.data);
        showSuccess('Dispositivo bloqueado com sucesso!');
      } else {
        setError(data.message || 'Erro ao bloquear dispositivo');
        showError(data.message || 'Erro ao bloquear dispositivo');
      }
    } catch (error) {
      console.error('Erro ao bloquear dispositivo:', error);
      setError('Erro de conexão. Tente novamente.');
      showError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  if (error && !ticket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mb-6">
            <Logo scale={1.2} />
          </div>
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Link Inválido</h1>
          <p className="text-gray-600 mb-6">
            Este link de segurança é inválido ou expirou. Verifique se você copiou o link completo do e-mail.
          </p>
          <button
            onClick={handleGoToLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Ir para Login
          </button>
        </div>
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mb-6">
            <Logo scale={1.2} />
          </div>
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Dispositivo Bloqueado</h1>
          <p className="text-gray-600 mb-6">
            O dispositivo foi bloqueado com sucesso. Ele não poderá mais acessar sua conta.
          </p>
          
          {deviceInfo && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Smartphone className="w-4 h-4 mr-2" />
                Informações do Dispositivo
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                {deviceInfo.deviceInfo?.browser && (
                  <div className="flex items-center">
                    <Monitor className="w-4 h-4 mr-2" />
                    <span>{deviceInfo.deviceInfo.browser}</span>
                  </div>
                )}
                {deviceInfo.deviceInfo?.os && (
                  <div className="flex items-center">
                    <Smartphone className="w-4 h-4 mr-2" />
                    <span>{deviceInfo.deviceInfo.os}</span>
                  </div>
                )}
                {deviceInfo.deviceInfo?.location && (
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{deviceInfo.deviceInfo.location.city}, {deviceInfo.deviceInfo.location.country}</span>
                  </div>
                )}
                {deviceInfo.blockedAt && (
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>Bloqueado em: {new Date(deviceInfo.blockedAt).toLocaleString('pt-BR')}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <button
            onClick={handleGoToLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Ir para Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <Logo scale={1.2} />
        </div>
        
        <div className="text-center mb-8">
          <div className="bg-orange-100 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <Shield className="w-10 h-10 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Alerta de Segurança</h1>
          <p className="text-gray-600">
            Detectamos um novo acesso à sua conta. Se não foi você, bloqueie este dispositivo imediatamente.
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-yellow-800 mb-1">Ação Necessária</h3>
              <p className="text-sm text-yellow-700">
                Se você não reconhece este acesso, clique no botão abaixo para bloquear o dispositivo e proteger sua conta.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <XCircle className="w-5 h-5 text-red-600 mr-3" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleBlockDevice}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Bloqueando...
              </>
            ) : (
              <>
                <Shield className="w-5 h-5 mr-2" />
                Bloquear Dispositivo
              </>
            )}
          </button>
          
          <button
            onClick={handleGoToLogin}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            <User className="w-5 h-5 mr-2" />
            Era eu, ir para Login
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Este link de segurança expira em 24 horas por motivos de segurança.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginNaoAutorizado;