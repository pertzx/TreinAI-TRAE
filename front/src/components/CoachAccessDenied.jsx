import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaLock, FaUserTie, FaCrown } from 'react-icons/fa';
import { motion } from 'framer-motion';

const CoachAccessDenied = ({ tema = 'dark' }) => {
  const navigate = useNavigate();
  const isDark = tema === 'dark';

  const theme = {
    bg: isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900',
    card: isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200',
    primaryBtn: isDark ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-indigo-500 hover:bg-indigo-600 text-white',
    secondaryBtn: isDark ? 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600' : 'bg-white hover:bg-gray-50 text-gray-900 border-gray-300',
    text: isDark ? 'text-gray-300' : 'text-gray-600',
    accent: isDark ? 'text-yellow-400' : 'text-yellow-600'
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${theme.bg}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`max-w-md w-full ${theme.card} border rounded-2xl p-8 text-center shadow-xl`}
      >
        {/* Ícone de Acesso Negado */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="relative mb-6"
        >
          <div className={`w-20 h-20 mx-auto rounded-full ${isDark ? 'bg-red-900/30' : 'bg-red-100'} flex items-center justify-center`}>
            <FaLock className={`text-3xl ${isDark ? 'text-red-400' : 'text-red-500'}`} />
          </div>
          <div className="absolute -top-2 -right-2">
            <FaUserTie className={`text-2xl ${theme.accent}`} />
          </div>
        </motion.div>

        {/* Título */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold mb-4"
        >
          Acesso Restrito
        </motion.h1>

        {/* Descrição */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-6"
        >
          <p className={`${theme.text} mb-4`}>
            Esta página é exclusiva para usuários com o <span className={`font-semibold ${theme.accent}`}>Plano Coach</span> ativo.
          </p>
          <div className={`${theme.card} border rounded-lg p-4 mb-4`}>
            <div className="flex items-center justify-center mb-2">
              <FaCrown className={`text-xl ${theme.accent} mr-2`} />
              <span className="font-semibold">Plano Coach</span>
            </div>
            <ul className={`text-sm ${theme.text} space-y-1`}>
              <li>• Painel completo de coach</li>
              <li>• Gestão de alunos</li>
              <li>• Funis de venda CoachFunnels</li>
              <li>• Ferramentas profissionais</li>
            </ul>
          </div>
        </motion.div>

        {/* Botões de Ação */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          <button
            onClick={() => navigate('/dashboard/configuracoes')}
            className={`w-full px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${theme.primaryBtn} transform hover:scale-105`}
          >
            Upgrade para Plano Coach
          </button>
          
          <button
            onClick={() => navigate('/dashboard')}
            className={`w-full px-6 py-3 rounded-xl font-medium border transition-all duration-200 ${theme.secondaryBtn}`}
          >
            Voltar ao Dashboard
          </button>
        </motion.div>

        {/* Informação Adicional */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className={`text-xs ${theme.text} mt-6`}
        >
          Precisa de ajuda? Entre em contato com nosso suporte.
        </motion.p>
      </motion.div>
    </div>
  );
};

export default CoachAccessDenied;