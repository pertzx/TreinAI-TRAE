import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiCheckCircle, FiMapPin, FiLoader } from 'react-icons/fi';
import api from '../../Api';

const Success = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [localAtivado, setLocalAtivado] = useState(false);
  const [localInfo, setLocalInfo] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    const updateSubscription = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get('session_id');
        const localId = params.get('local_id'); // Novo parâmetro para identificar o local

        if (!sessionId) return;

        // Consulta a sessão para confirmar status do pagamento - usando cookies httpOnly
        const res = await api.get(`/session-status?session_id=${sessionId}`);

        if (res.data.status === 'paid' || res.data.status === 'active') {
          console.log('✅ Pagamento realizado com sucesso!');
          
          // Se há um localId, ativar o local
          if (localId) {
            try {
              console.log('🏢 Ativando local:', localId);
              
              const ativarRes = await api.post('/ativar-local', {
                localId: localId
              });

              if (ativarRes.data.success) {
                setLocalAtivado(true);
                setLocalInfo(ativarRes.data.local);
                console.log('✅ Local ativado com sucesso:', ativarRes.data.local);
              } else {
                throw new Error(ativarRes.data.error || 'Erro ao ativar local');
              }
            } catch (localErr) {
              console.error('❌ Erro ao ativar local:', localErr);
              setErro('Local criado, mas houve erro na ativação. Entre em contato com o suporte.');
            }
          }
        } else {
          console.warn('⚠️ Pagamento não confirmado. Entre em contato com o suporte.');
          setErro('Pagamento não confirmado. Entre em contato com o suporte.');
        }
      } catch (err) {
        console.error('❌ Erro no processamento:', err);
        setErro('Erro ao processar pagamento. Entre em contato com o suporte.');
      } finally {
        setLoading(false);
      }
    };

    updateSubscription();
  }, []);

  useEffect(() => {
    // Verificar autenticação usando apenas cookies httpOnly
    api.post('/dashboard')
      .then((res) => {
        if (res.data.user) {
          setUser(res.data.user);
        }
      })
      .catch((err) => {
        console.log('Erro ao buscar dados do usuário', err);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#10151e] flex flex-col items-center justify-center text-white p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <FiLoader className="animate-spin text-4xl mb-4 mx-auto text-blue-400" />
          <h2 className="text-xl font-semibold mb-2">Processando pagamento...</h2>
          <p className="text-gray-400">Aguarde enquanto confirmamos seu pagamento</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#10151e] flex flex-col items-center justify-center text-white p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        {erro ? (
          // Tela de Erro
          <>
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiCheckCircle className="text-white text-2xl" />
            </div>
            <h1 className="text-2xl font-bold mb-4 text-red-400">Ops! Algo deu errado</h1>
            <p className="mb-6 text-gray-300">{erro}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-red-600 hover:bg-red-700 py-3 px-6 rounded-lg font-semibold transition-colors"
            >
              Voltar ao Dashboard
            </button>
          </>
        ) : localAtivado && localInfo ? (
          // Tela de Sucesso com Local Ativado
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <FiCheckCircle className="text-white text-2xl" />
            </motion.div>
            <h1 className="text-2xl font-bold mb-2 text-green-400">Local Ativado com Sucesso!</h1>
            <div className="bg-gray-800 rounded-lg p-4 mb-6 text-left">
              <div className="flex items-center gap-2 mb-2">
                <FiMapPin className="text-blue-400" />
                <span className="font-semibold">{localInfo.localName}</span>
              </div>
              <p className="text-sm text-gray-400 mb-1">
                <strong>Tipo:</strong> {localInfo.localType}
              </p>
              <p className="text-sm text-gray-400 mb-1">
                <strong>Localização:</strong> {localInfo.city}, {localInfo.state}
              </p>
              <p className="text-sm text-gray-400">
                <strong>Status:</strong> <span className="text-green-400">Ativo</span>
              </p>
            </div>
            <p className="mb-6 text-gray-300">
              Seu local foi ativado e já está disponível na plataforma!
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate('/dashboard/locais')}
                className="bg-blue-600 hover:bg-blue-700 py-3 px-6 rounded-lg font-semibold transition-colors"
              >
                Ver Meus Locais
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-gray-600 hover:bg-gray-700 py-2 px-6 rounded-lg font-medium transition-colors"
              >
                Voltar ao Dashboard
              </button>
            </div>
          </>
        ) : (
          // Tela de Sucesso Padrão (sem local)
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <FiCheckCircle className="text-white text-2xl" />
            </motion.div>
            <h1 className="text-2xl font-bold mb-4 text-green-400">Pagamento Concluído!</h1>
            <p className="mb-6 text-gray-300">Obrigado por assinar o seu plano.</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-blue-600 hover:bg-blue-700 py-3 px-6 rounded-lg font-semibold transition-colors"
            >
              Voltar ao Dashboard
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default Success;
