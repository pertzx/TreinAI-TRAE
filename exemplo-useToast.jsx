import React, { useState } from 'react';
import { useToast } from './front/src/components/Toast.jsx';

const ExemploUseToast = () => {
  const [loading, setLoading] = useState(false);
  
  // 1. Inicializar o hook
  const { showError, showSuccess, showWarning, showInfo } = useToast();

  // 2. Função para simular envio de dados
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simular validação
      const email = e.target.email.value;
      if (!email) {
        showError('Por favor, preencha o e-mail.');
        return;
      }

      // Mostrar info de carregamento
      showInfo('Enviando dados...');

      // Simular chamada API
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mostrar sucesso
      showSuccess('Dados enviados com sucesso!', {
        duration: 3000,
        position: 'top-center'
      });

    } catch (error) {
      // Mostrar erro
      showError('Erro ao enviar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Função para mostrar aviso
  const handleWarning = () => {
    showWarning('Esta ação irá apagar todos os dados!', {
      duration: 7000,
      showCloseButton: true
    });
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl mb-4">Exemplo useToast</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <input 
          name="email" 
          type="email" 
          placeholder="Digite seu e-mail"
          className="border p-2 rounded w-full"
        />
        
        <div className="space-x-2">
          <button 
            type="submit" 
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            {loading ? 'Enviando...' : 'Enviar'}
          </button>
          
          <button 
            type="button"
            onClick={handleWarning}
            className="bg-yellow-500 text-white px-4 py-2 rounded"
          >
            Mostrar Aviso
          </button>
          
          <button 
            type="button"
            onClick={() => showInfo('Esta é uma informação útil!')}
            className="bg-gray-500 text-white px-4 py-2 rounded"
          >
            Mostrar Info
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExemploUseToast;