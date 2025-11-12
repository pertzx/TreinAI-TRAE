import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaMapMarkerAlt, FaImage, FaCheck, FaTimes, FaSpinner, FaEye, FaCode } from 'react-icons/fa';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/Toast';
import LocalForm from '../../../components/LocalForm';
import api from '../../../Api';

const CriarLocal = ({ tema, user }) => {
  const { showError, showSuccess } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: formulário, 2: pagamento, 3: confirmação
  const [localData, setLocalData] = useState(null);
  const [showPayload, setShowPayload] = useState(false);
  const [currentPayload, setCurrentPayload] = useState(null);

  const theme = {
    light: {
      bg: 'bg-white',
      text: 'text-gray-900',
      card: 'bg-gray-50',
      border: 'border-gray-200',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
      input: 'bg-white border-gray-300 text-gray-900',
      muted: 'text-gray-600'
    },
    dark: {
      bg: 'bg-gray-900',
      text: 'text-white',
      card: 'bg-gray-800',
      border: 'border-gray-700',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
      input: 'bg-gray-800 border-gray-600 text-white',
      muted: 'text-gray-400'
    }
  };

  const currentTheme = theme[tema] || theme.light;

  // Função para sanitizar dados do local
  const sanitizeLocalData = (data) => {
    const sanitized = {
      localName: data.localName?.trim() || '',
      localDescricao: data.localDescricao?.trim() || '',
      link: data.link?.trim() || '',
      localType: data.localType || 'outro',
      country: data.country || 'Brasil',
      countryCode: data.countryCode || 'BR',
      state: data.state || '',
      city: data.city || ''
    };

    // Adicionar userId se disponível
    if (user?._id) {
      sanitized.userId = user._id;
    }

    // Preservar arquivo de imagem (File object)
    if (data.image instanceof File) {
      sanitized.image = data.image;
    }

    return sanitized;
  };

  // Função para criar local diretamente
  const criarLocalDireto = async (formData) => {
    try {
      setLoading(true);

      // Validar dados básicos
      if (!formData.localName || !formData.localType) {
        throw new Error('Nome e tipo do local são obrigatórios');
      }

      // Sanitizar dados
      const sanitizedData = sanitizeLocalData(formData);

      // Preparar payload para visualização
      const payloadPreview = {
        ...sanitizedData,
        image: formData.image ? {
          name: formData.image.name,
          size: formData.image.size,
          type: formData.image.type
        } : null
      };

      // Mostrar payload antes da requisição
      setCurrentPayload(payloadPreview);
      setShowPayload(true);

      // Aguardar confirmação do usuário
      const confirmed = await new Promise((resolve) => {
        const confirmButton = document.getElementById('confirm-payload');
        const cancelButton = document.getElementById('cancel-payload');
        
        const handleConfirm = () => {
          confirmButton?.removeEventListener('click', handleConfirm);
          cancelButton?.removeEventListener('click', handleCancel);
          resolve(true);
        };
        
        const handleCancel = () => {
          confirmButton?.removeEventListener('click', handleConfirm);
          cancelButton?.removeEventListener('click', handleCancel);
          resolve(false);
        };

        // Aguardar os botões serem renderizados
        setTimeout(() => {
          document.getElementById('confirm-payload')?.addEventListener('click', handleConfirm);
          document.getElementById('cancel-payload')?.addEventListener('click', handleCancel);
        }, 100);
      });

      setShowPayload(false);

      if (!confirmed) {
        setLoading(false);
        return;
      }

      // Criar FormData para envio
      const submitData = new FormData();
      
      // Adicionar campos de texto (excluindo image para evitar duplicação)
      Object.keys(sanitizedData).forEach(key => {
        if (key !== 'image' && sanitizedData[key] !== null && sanitizedData[key] !== undefined) {
          submitData.append(key, sanitizedData[key]);
        }
      });

      // Adicionar imagem se existir
      if (formData.image) {
        console.log('Tem imagem:', formData.image);
        console.log(formData.image);
        submitData.append('image', formData.image);
      }

      // Fazer requisição
      const response = await api.post('/criar-local-direto', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const result = response.data;

      if (result.success) {
        console.log(result);
        
        // Verificar se há URL de pagamento para redirecionamento
        if (result.payment?.url) {
          setLocalData(result.local);
          showSuccess('Local criado! Redirecionando para pagamento...');
          
          // Redirecionar imediatamente para o Stripe
          window.location.href = result.payment.url;
          return; // Evitar continuar a execução
        } else {
          // Fluxo antigo (sem pagamento)
          setLocalData(result.local);
          setStep(3); // Ir para confirmação
          showSuccess('Local criado com sucesso!');
        }
      } else {
        throw new Error(result.message || 'Erro ao criar local');
      }

    } catch (error) {
      console.error('Erro ao criar local:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erro ao criar local';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (formData) => {
    criarLocalDireto(formData);
  };

  const resetForm = () => {
    setStep(1);
    setLocalData(null);
  };

  return (
    <div className={`min-h-screen ${currentTheme.bg} ${currentTheme.text} p-6`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">
            <FaMapMarkerAlt className="inline mr-2 text-blue-600" />
            Criar Novo Local
          </h1>
          <p className={`${currentTheme.muted} text-lg`}>
            Cadastre seu local na plataforma TreinAI
          </p>
        </motion.div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    step >= stepNum
                      ? 'bg-blue-600 text-white'
                      : `${currentTheme.card} ${currentTheme.border} border`
                  }`}
                >
                  {step > stepNum ? <FaCheck /> : stepNum}
                </div>
                {stepNum < 3 && (
                  <div
                    className={`w-16 h-1 ${
                      step > stepNum ? 'bg-blue-600' : currentTheme.border
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`${currentTheme.card} rounded-lg p-6 shadow-lg`}
            >
              <LocalForm
                onSubmit={handleFormSubmit}
                loading={loading}
                tema={tema}
              />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`${currentTheme.card} rounded-lg p-6 shadow-lg text-center`}
            >
              <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-4">Redirecionando para Pagamento</h2>
              <p className={currentTheme.muted}>
                Seu local foi criado com sucesso! Você será redirecionado para o Stripe para completar o pagamento.
              </p>
              <div className={`${currentTheme.bg} rounded-lg p-4 mt-4 text-left`}>
                <h3 className="font-bold mb-2">Próximos passos:</h3>
                <ul className={`${currentTheme.muted} text-sm space-y-1`}>
                  <li>• Complete o pagamento no Stripe</li>
                  <li>• Seu local será ativado automaticamente</li>
                  <li>• Você receberá um email de confirmação</li>
                </ul>
              </div>
            </motion.div>
          )}

          {step === 3 && localData && (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`${currentTheme.card} rounded-lg p-6 shadow-lg text-center`}
            >
              <FaCheck className="text-6xl text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-4 text-green-600">
                Local Criado com Sucesso!
              </h2>
              
              <div className={`${currentTheme.bg} rounded-lg p-4 mb-6 text-left`}>
                <h3 className="font-bold mb-2">Detalhes do Local:</h3>
                <p><strong>Nome:</strong> {localData.localName}</p>
                <p><strong>Tipo:</strong> {localData.localType}</p>
                <p><strong>Status:</strong> {localData.status}</p>
                {localData.localDescricao && (
                  <p><strong>Descrição:</strong> {localData.localDescricao}</p>
                )}
              </div>

              <div className="space-y-4">
                <p className={currentTheme.muted}>
                  Seu local foi criado e está aguardando ativação após o pagamento.
                </p>
                
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={resetForm}
                    className={`px-6 py-2 rounded-lg ${currentTheme.button} transition-colors`}
                  >
                    Criar Outro Local
                  </button>
                  
                  <button
                    onClick={() => window.location.href = '/dashboard'}
                    className={`px-6 py-2 rounded-lg border ${currentTheme.border} ${currentTheme.text} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                  >
                    Voltar ao Dashboard
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Overlay */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <div className={`${currentTheme.card} rounded-lg p-6 text-center`}>
              <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
              <p className="text-lg">Criando local...</p>
            </div>
          </motion.div>
        )}

        {/* Payload Preview Modal */}
        {showPayload && currentPayload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`${currentTheme.card} rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FaCode className="text-blue-600 text-xl" />
                  <h3 className="text-xl font-bold">Payload da Requisição</h3>
                </div>
                <FaEye className="text-gray-500" />
              </div>
              
              <div className={`${currentTheme.border} border rounded-lg p-4 mb-6`}>
                <pre className={`${currentTheme.text} text-sm overflow-x-auto whitespace-pre-wrap`}>
                  {JSON.stringify(currentPayload, null, 2)}
                </pre>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  id="cancel-payload"
                  className={`px-4 py-2 rounded-lg border ${currentTheme.border} ${currentTheme.text} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                >
                  Cancelar
                </button>
                <button
                  id="confirm-payload"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Confirmar e Enviar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CriarLocal;
