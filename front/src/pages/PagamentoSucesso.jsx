import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaCheckCircle, FaMapMarkerAlt, FaEnvelope, FaArrowRight } from 'react-icons/fa';
import Logo from '../components/Logo';

const PagamentoSucesso = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Scroll para o topo da página
    window.scrollTo(0, 0);
  }, []);

  const handleVerMeusLocais = () => {
    navigate('/dashboard/locais');
  };

  const handleVoltarDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
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

        {/* Ícone de Sucesso */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mb-6"
        >
          <FaCheckCircle className="text-6xl text-green-500 mx-auto" />
        </motion.div>

        {/* Título */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold text-gray-800 mb-4"
        >
          Pagamento Realizado com Sucesso!
        </motion.h1>

        {/* Descrição */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-gray-600 mb-6 space-y-3"
        >
          <div className="flex items-center justify-center gap-2">
            <FaMapMarkerAlt className="text-blue-500" />
            <span>Seu local foi ativado com sucesso!</span>
          </div>
          
          <div className="flex items-center justify-center gap-2">
            <FaEnvelope className="text-blue-500" />
            <span>Você receberá um e-mail de confirmação</span>
          </div>
          
          <p className="text-sm">
            Agora você pode começar a receber clientes e gerenciar seu espaço através da plataforma.
          </p>
        </motion.div>

        {/* Botões de Ação */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          <button
            onClick={handleVerMeusLocais}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <FaMapMarkerAlt />
            Ver Meus Locais
            <FaArrowRight />
          </button>
          
          <button
            onClick={handleVoltarDashboard}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Voltar ao Dashboard
          </button>
        </motion.div>

        {/* Informação Adicional */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 p-4 bg-blue-50 rounded-lg"
        >
          <p className="text-sm text-blue-700">
            <strong>Próximos passos:</strong> Configure as informações do seu local, 
            adicione fotos e comece a atrair clientes!
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PagamentoSucesso;