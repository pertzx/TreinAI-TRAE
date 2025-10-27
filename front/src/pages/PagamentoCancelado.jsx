import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaTimesCircle, FaRedo, FaHome, FaInfoCircle } from 'react-icons/fa';
import Logo from '../components/Logo';

const PagamentoCancelado = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Scroll para o topo da página
    window.scrollTo(0, 0);
  }, []);

  const handleTentarNovamente = () => {
    navigate('/dashboard/locais');
  };

  const handleVoltarDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center"
      >
        {/* Logo */}
        <div className="mb-6">
          <Logo scale={1.2} />
        </div>

        {/* Ícone de Cancelamento */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mb-6"
        >
          <FaTimesCircle className="text-6xl text-red-500 mx-auto" />
        </motion.div>

        {/* Título */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold text-gray-800 mb-4"
        >
          Pagamento Cancelado
        </motion.h1>

        {/* Descrição */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-gray-600 mb-6 space-y-3"
        >
          <p>
            O pagamento foi cancelado e nenhuma cobrança foi realizada.
          </p>
          
          <div className="flex items-center justify-center gap-2 text-sm">
            <FaInfoCircle className="text-blue-500" />
            <span>O local criado foi removido automaticamente</span>
          </div>
        </motion.div>

        {/* Informação sobre o que aconteceu */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200"
        >
          <h3 className="font-semibold text-yellow-800 mb-2">O que aconteceu?</h3>
          <ul className="text-sm text-yellow-700 text-left space-y-1">
            <li>• Pagamento foi cancelado pelo usuário</li>
            <li>• Local foi removido do sistema</li>
            <li>• Nenhuma cobrança foi realizada</li>
            <li>• Você pode tentar novamente a qualquer momento</li>
          </ul>
        </motion.div>

        {/* Botões de Ação */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-3"
        >
          <button
            onClick={handleTentarNovamente}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <FaRedo />
            Tentar Novamente
          </button>
          
          <button
            onClick={handleVoltarDashboard}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <FaHome />
            Voltar ao Dashboard
          </button>
        </motion.div>

        {/* Suporte */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-6 text-sm text-gray-500"
        >
          <p>
            Precisa de ajuda? Entre em contato com nosso{' '}
            <button
              onClick={() => navigate('/dashboard/suporte')}
              className="text-blue-600 hover:text-blue-700 underline"
            >
              suporte
            </button>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PagamentoCancelado;