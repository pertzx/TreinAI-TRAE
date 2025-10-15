import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowUp, FiMenu, FiX, FiChevronRight, FiShield, FiEye, FiLock, FiUsers, FiDatabase, FiSettings, FiMail, FiAlertCircle } from 'react-icons/fi';
import { FaInstagram, FaLinkedin } from 'react-icons/fa';
import Header from '../components/Header';
import Logo from '../components/Logo';

const PoliticaPrivacidade = () => {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [activeSection, setActiveSection] = useState('introducao');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
      
      // Update active section based on scroll position
      const sections = document.querySelectorAll('section[id]');
      let current = '';
      
      sections.forEach((section) => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (window.scrollY >= sectionTop - 200) {
          current = section.getAttribute('id');
        }
      });
      
      if (current) {
        setActiveSection(current);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setSidebarOpen(false);
  };

  const sections = [
    { id: 'introducao', title: 'Introdução', icon: <FiShield className="w-4 h-4" /> },
    { id: 'dados-coletados', title: 'Dados Coletados', icon: <FiDatabase className="w-4 h-4" /> },
    { id: 'uso-informacoes', title: 'Uso das Informações', icon: <FiEye className="w-4 h-4" /> },
    { id: 'notificacoes-seguranca', title: 'Notificações de Segurança', icon: <FiMail className="w-4 h-4" /> },
    { id: 'compartilhamento', title: 'Compartilhamento', icon: <FiUsers className="w-4 h-4" /> },
    { id: 'direitos-usuario', title: 'Direitos do Usuário', icon: <FiSettings className="w-4 h-4" /> },
    { id: 'seguranca', title: 'Segurança dos Dados', icon: <FiLock className="w-4 h-4" /> },
    { id: 'cookies', title: 'Cookies e Tecnologias', icon: <FiDatabase className="w-4 h-4" /> },
    { id: 'retencao', title: 'Retenção de Dados', icon: <FiAlertCircle className="w-4 h-4" /> },
    { id: 'alteracoes', title: 'Alterações na Política', icon: <FiSettings className="w-4 h-4" /> },
    { id: 'contato', title: 'Contato', icon: <FiMail className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Header logado={false} />
      </div>

      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-16 sm:top-20 left-2 sm:left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-lg shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          aria-label={sidebarOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"}
        >
          {sidebarOpen ? <FiX className="w-5 h-5 sm:w-6 sm:h-6" /> : <FiMenu className="w-5 h-5 sm:w-6 sm:h-6" />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`fixed lg:sticky lg:top-0 h-screen overflow-hidden top-0 left-0 w-72 sm:w-80 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-40 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}>
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex items-center mb-3 sm:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                <Logo scale={0.8} className="sm:scale-100" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Política de Privacidade</h2>
            </div>
            <p className="text-xs sm:text-sm text-gray-600">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>
          
          <nav className="p-3 sm:p-4 overflow-y-auto h-full pb-20">
            <ul className="space-y-1 sm:space-y-2">
              {sections.map((section) => (
                <li key={section.id}>
                  <button
                    onClick={() => scrollToSection(section.id)}
                    aria-label={`Navegar para seção ${section.title}`}
                    className={`w-full text-left px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-all duration-200 flex items-center space-x-2 sm:space-x-3 ${
                      activeSection === section.id
                        ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className={`${activeSection === section.id ? 'text-white' : 'text-gray-500'}`}>
                      {section.icon}
                    </span>
                    <span className="text-xs sm:text-sm font-medium flex-1">{section.title}</span>
                    <FiChevronRight className={`w-3 h-3 sm:w-4 sm:h-4 ${activeSection === section.id ? 'text-white' : 'text-gray-400'}`} />
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          />
        )}

        {/* Main Content */}
        <main className="flex-1 lg:ml-0 px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="max-w-4xl mx-auto">
            
            {/* Hero Section */}
            <div className="text-center mb-8 sm:mb-12">
              <div className="flex justify-center mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl flex items-center justify-center">
                  <FiShield className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 px-2">
                Política de Privacidade
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto px-4">
                Transparência total sobre como coletamos, usamos e protegemos seus dados pessoais na TreinAI
              </p>
              <div className="mt-4 sm:mt-6 inline-flex items-center px-3 sm:px-4 py-2 bg-green-100 text-green-800 rounded-full text-xs sm:text-sm font-medium">
                <FiShield className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                Conforme LGPD - Lei Geral de Proteção de Dados
              </div>
            </div>

            {/* Introdução */}
            <section id="introducao" className="mb-8 sm:mb-12">
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 lg:p-8">
                <div className="flex items-center mb-4 sm:mb-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center mr-3 sm:mr-4">
                    <FiShield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Introdução e Finalidade</h2>
                </div>
                <div className="prose prose-sm sm:prose-base lg:prose-lg max-w-none text-gray-700 space-y-3 sm:space-y-4">
                  <p>
                    A <strong>TreinAI</strong> está comprometida com a proteção da sua privacidade e dos seus dados pessoais. 
                    Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações 
                    quando você utiliza nossa plataforma de treinos personalizados com inteligência artificial.
                  </p>
                  <p>
                    Esta política está em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)</strong>, 
                    o <strong>Marco Civil da Internet (Lei nº 12.965/2014)</strong> e demais regulamentações aplicáveis no Brasil.
                  </p>
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-3 sm:p-4 rounded-r-lg">
                    <p className="text-blue-800 font-medium text-sm sm:text-base">
                      <FiAlertCircle className="w-4 h-4 sm:w-5 sm:h-5 inline mr-2" />
                      Ao utilizar nossos serviços, você concorda com as práticas descritas nesta política.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Dados Coletados */}
            <section id="dados-coletados" className="mb-8 sm:mb-12">
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 lg:p-8">
                <div className="flex items-center mb-4 sm:mb-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center mr-3 sm:mr-4">
                    <FiDatabase className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Dados Coletados</h2>
                </div>
                <div className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div className="bg-gray-50 rounded-xl p-4 sm:p-6">
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                        <FiSettings className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" />
                        Dados de Fitness
                      </h3>
                      <ul className="space-y-1 sm:space-y-2 text-sm sm:text-base text-gray-700">
                        <li>• Peso e altura</li>
                        <li>• Índice de Massa Corporal (IMC)</li>
                        <li>• Histórico de treinos</li>
                        <li>• Metas e objetivos</li>
                        <li>• Métricas de desempenho</li>
                        <li>• Preferências de exercícios</li>
                      </ul>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 sm:p-6">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                      <FiEye className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-purple-600" />
                      Dados Técnicos e de Uso
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 text-sm sm:text-base text-gray-700">
                      <ul className="space-y-1 sm:space-y-2">
                        <li>• Endereço IP</li>
                        <li>• Tipo de dispositivo</li>
                        <li>• Sistema operacional</li>
                      </ul>
                      <ul className="space-y-1 sm:space-y-2">
                        <li>• Navegador utilizado</li>
                        <li>• Localização (se permitida)</li>
                        <li>• Cookies e sessões</li>
                      </ul>
                      <ul className="space-y-1 sm:space-y-2">
                        <li>• Logs de acesso</li>
                        <li>• Tempo de uso</li>
                        <li>• Páginas visitadas</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Uso das Informações */}
            <section id="uso-informacoes" className="mb-8 sm:mb-12">
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 lg:p-8">
                <div className="flex items-center mb-4 sm:mb-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center mr-3 sm:mr-4">
                    <FiEye className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Uso das Informações</h2>
                </div>
                <div className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 sm:p-6 border border-green-200">
                      <h3 className="text-lg sm:text-xl font-semibold text-green-900 mb-3 sm:mb-4">🤖 Personalização com IA</h3>
                      <ul className="space-y-1 sm:space-y-2 text-sm sm:text-base text-green-800">
                        <li>• Gerar treinos personalizados</li>
                        <li>• Ajustar dificuldade automaticamente</li>
                        <li>• Recomendar exercícios específicos</li>
                        <li>• Adaptar planos conforme progresso</li>
                      </ul>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 sm:p-6 border border-blue-200">
                      <h3 className="text-lg sm:text-xl font-semibold text-blue-900 mb-3 sm:mb-4">📈 Melhorias do Serviço</h3>
                      <ul className="space-y-1 sm:space-y-2 text-sm sm:text-base text-blue-800">
                        <li>• Análise de padrões de uso</li>
                        <li>• Otimização de algoritmos</li>
                        <li>• Desenvolvimento de novas funcionalidades</li>
                        <li>• Correção de bugs e melhorias</li>
                      </ul>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 sm:p-6 border border-purple-200">
                    <h3 className="text-lg sm:text-xl font-semibold text-purple-900 mb-3 sm:mb-4">💬 Comunicação e Suporte</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-sm sm:text-base text-purple-800">
                      <ul className="space-y-1 sm:space-y-2">
                        <li>• Notificações de treino</li>
                        <li>• Lembretes personalizados</li>
                        <li>• Updates da plataforma</li>
                      </ul>
                      <ul className="space-y-1 sm:space-y-2">
                        <li>• Suporte técnico</li>
                        <li>• Resposta a dúvidas</li>
                        <li>• Comunicações importantes</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Notificações de Segurança */}
            <section id="notificacoes-seguranca" className="mb-8 sm:mb-12">
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 lg:p-8">
                <div className="flex items-center mb-4 sm:mb-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center mr-3 sm:mr-4">
                    <FiMail className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Notificações de Segurança</h2>
                </div>
                <div className="space-y-4 sm:space-y-6">
                  <div className="prose prose-sm sm:prose-lg max-w-none text-gray-700">
                    <p className="text-sm sm:text-base">
                      Para proteger sua conta, enviamos notificações automáticas por email sempre que detectamos 
                      atividades importantes ou suspeitas relacionadas ao seu acesso.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div className="bg-blue-50 rounded-xl p-4 sm:p-6 border border-blue-200">
                      <h3 className="text-lg sm:text-xl font-semibold text-blue-900 mb-3 sm:mb-4">📧 Tipos de Notificações</h3>
                      <ul className="space-y-1 sm:space-y-2 text-sm sm:text-base text-blue-800">
                        <li>• Login em novo dispositivo</li>
                        <li>• Tentativas de acesso suspeitas</li>
                        <li>• Alterações de segurança</li>
                        <li>• Atividades não reconhecidas</li>
                      </ul>
                    </div>
                    
                    <div className="bg-green-50 rounded-xl p-4 sm:p-6 border border-green-200">
                      <h3 className="text-lg sm:text-xl font-semibold text-green-900 mb-3 sm:mb-4">🛡️ Controle de Segurança</h3>
                      <p className="text-green-800 text-sm sm:text-base mb-3">
                        Caso receba uma notificação sobre atividade não autorizada, você pode:
                      </p>
                      <ul className="space-y-1 sm:space-y-2 text-sm sm:text-base text-green-800">
                        <li>• Bloquear o dispositivo suspeito</li>
                        <li>• Bloquear região geográfica</li>
                        <li>• Alterar sua senha imediatamente</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 sm:p-6">
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <FiAlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-yellow-900 mb-2 text-sm sm:text-base">Limitação de Responsabilidade</h4>
                        <p className="text-yellow-800 text-xs sm:text-sm">
                          <strong>Importante:</strong> A TreinAI não se responsabiliza pela entrega, recebimento ou 
                          processamento de emails de notificação de segurança. Problemas relacionados a provedores 
                          de email, filtros de spam, configurações de caixa de entrada ou falhas na infraestrutura 
                          de email de terceiros estão fora do nosso controle.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 sm:p-6">
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <FiShield className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-red-900 mb-2 text-sm sm:text-base">Sua Responsabilidade</h4>
                        <p className="text-red-800 text-xs sm:text-sm">
                          É sua responsabilidade manter um endereço de email válido e acessível, verificar 
                          regularmente suas notificações de segurança e tomar as medidas apropriadas caso 
                          detecte atividades suspeitas. A TreinAI fornece as ferramentas de segurança, mas 
                          o uso adequado dessas ferramentas é de sua responsabilidade.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Compartilhamento */}
            <section id="compartilhamento" className="mb-8 sm:mb-12">
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 lg:p-8">
                <div className="flex items-center mb-4 sm:mb-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center mr-3 sm:mr-4">
                    <FiUsers className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Compartilhamento de Dados</h2>
                </div>
                <div className="space-y-6">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 sm:p-6">
                    <h3 className="text-lg sm:text-xl font-semibold text-red-900 mb-3 sm:mb-4">❌ NÃO Compartilhamos Com:</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm sm:text-base text-red-800">
                      <ul className="space-y-1 sm:space-y-2">
                        <li>• Terceiros não autorizados</li>
                        <li>• Redes sociais para publicidade</li>
                      </ul>
                      <ul className="space-y-1 sm:space-y-2">
                        <li>• Corretores de dados</li>
                        <li>• Governos (exceto ordem judicial)</li>
                        <li>• Concorrentes</li>
                      </ul>
                    </div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 sm:p-6">
                    <h4 className="font-semibold text-blue-900 mb-3 text-sm sm:text-base">Controle de Cookies</h4>
                    <p className="text-blue-800 mb-3 text-xs sm:text-sm">
                      Você pode gerenciar cookies através das configurações do seu navegador. 
                      Note que desabilitar cookies essenciais pode afetar a funcionalidade da plataforma.
                    </p>
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      <span className="px-2 py-1 sm:px-3 sm:py-1 bg-blue-200 text-blue-800 rounded-full text-xs sm:text-sm">Chrome</span>
                      <span className="px-2 py-1 sm:px-3 sm:py-1 bg-blue-200 text-blue-800 rounded-full text-xs sm:text-sm">Firefox</span>
                      <span className="px-2 py-1 sm:px-3 sm:py-1 bg-blue-200 text-blue-800 rounded-full text-xs sm:text-sm">Safari</span>
                      <span className="px-2 py-1 sm:px-3 sm:py-1 bg-blue-200 text-blue-800 rounded-full text-xs sm:text-sm">Edge</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Retenção */}
            <section id="retencao" className="mb-8 sm:mb-12">
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 lg:p-8">
                <div className="flex items-center mb-4 sm:mb-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center mr-3 sm:mr-4">
                    <FiAlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Retenção de Dados</h2>
                </div>
                <div className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                    <div className="bg-green-50 rounded-xl p-4 sm:p-6 border border-green-200">
                      <h3 className="text-base sm:text-lg font-semibold text-green-900 mb-2 sm:mb-3">Conta Ativa</h3>
                      <p className="text-green-800 text-xs sm:text-sm">Mantemos seus dados enquanto sua conta estiver ativa e você utilizar nossos serviços.</p>
                    </div>
                    <div className="bg-yellow-50 rounded-xl p-4 sm:p-6 border border-yellow-200">
                      <h3 className="text-base sm:text-lg font-semibold text-yellow-900 mb-2 sm:mb-3">Conta Inativa</h3>
                      <p className="text-yellow-800 text-xs sm:text-sm">Após 2 anos de inatividade, seus dados serão automaticamente excluídos.</p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-4 sm:p-6 border border-red-200">
                      <h3 className="text-base sm:text-lg font-semibold text-red-900 mb-2 sm:mb-3">Exclusão Solicitada</h3>
                      <p className="text-red-800 text-xs sm:text-sm">Dados excluídos em até 30 dias após solicitação, exceto obrigações legais.</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 sm:p-6">
                    <h4 className="font-semibold text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">Exceções de Retenção:</h4>
                    <ul className="space-y-1 sm:space-y-2 text-gray-700 text-xs sm:text-sm">
                      <li>• Dados necessários para cumprimento de obrigações legais</li>
                      <li>• Informações para defesa em processos judiciais</li>
                      <li>• Dados anonimizados para pesquisas e estatísticas</li>
                      <li>• Registros de segurança e prevenção de fraudes</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Alterações */}
            <section id="alteracoes" className="mb-8 sm:mb-12">
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 lg:p-8">
                <div className="flex items-center mb-4 sm:mb-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center mr-3 sm:mr-4">
                    <FiSettings className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Alterações na Política</h2>
                </div>
                <div className="space-y-4 sm:space-y-6">
                  <div className="prose prose-sm sm:prose-lg max-w-none text-gray-700">
                    <p className="text-sm sm:text-base">
                      Podemos atualizar esta Política de Privacidade periodicamente para refletir mudanças 
                      em nossas práticas, tecnologias ou requisitos legais.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div className="bg-blue-50 rounded-xl p-4 sm:p-6 border border-blue-200">
                      <h3 className="text-base sm:text-lg font-semibold text-blue-900 mb-2 sm:mb-3">📧 Notificação</h3>
                      <p className="text-blue-800 text-xs sm:text-sm">
                        Alterações significativas serão comunicadas por e-mail com 30 dias de antecedência.
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4 sm:p-6 border border-green-200">
                      <h3 className="text-base sm:text-lg font-semibold text-green-900 mb-2 sm:mb-3">📅 Data de Vigência</h3>
                      <p className="text-green-800 text-xs sm:text-sm">
                        A nova versão entrará em vigor na data especificada na notificação.
                      </p>
                    </div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 sm:p-6">
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <FiAlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-yellow-900 mb-2 text-sm sm:text-base">Seu Controle</h4>
                        <p className="text-yellow-800 text-xs sm:text-sm">
                          Se não concordar com as alterações, você pode encerrar sua conta antes da data de vigência. 
                          O uso continuado após a vigência constitui aceitação das mudanças.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Contato */}
            <section id="contato" className="mb-8 sm:mb-12">
              <div className="bg-gradient-to-br from-green-500 to-blue-500 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 text-white">
                <div className="flex items-center mb-4 sm:mb-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center mr-3 sm:mr-4">
                    <FiMail className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold">Contato e Dúvidas</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">📧 Entre em Contato</h3>
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <FiMail className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                        <span className="text-sm sm:text-base">pyerremarcio098@gmail.com</span>
                      </div>
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <FiUsers className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                        <span className="text-sm sm:text-base">Pyerre Márcio - Fundador & CEO</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">⚡ Tempo de Resposta</h3>
                    <div className="space-y-1 sm:space-y-2">
                      <div className="flex justify-between text-sm sm:text-base">
                        <span>Dúvidas gerais:</span>
                        <span className="font-semibold">24-48h</span>
                      </div>
                      <div className="flex justify-between text-sm sm:text-base">
                        <span>Direitos LGPD:</span>
                        <span className="font-semibold">15 dias úteis</span>
                      </div>
                      <div className="flex justify-between text-sm sm:text-base">
                        <span>Incidentes de segurança:</span>
                        <span className="font-semibold">72h</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 sm:mt-8 bg-white/10 rounded-xl p-4 sm:p-6">
                  <h4 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">🛡️ Encarregado de Proteção de Dados (DPO)</h4>
                  <p className="opacity-90 text-xs sm:text-sm">
                    Para questões específicas sobre proteção de dados e LGPD, entre em contato através do 
                    e-mail principal. Estamos comprometidos em responder todas as solicitações dentro dos 
                    prazos legais estabelecidos.
                  </p>
                </div>
              </div>
            </section>

          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 sm:py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div>
              <div className="flex items-center mb-3 sm:mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                  <Logo scale={1} />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold">TreinAI</h3>
              </div>
              <p className="text-gray-400 mb-3 sm:mb-4 text-sm sm:text-base">
                Muito além do Personal Trainer IA. Transformando vidas através da tecnologia e do fitness.
              </p>
              <div className="flex space-x-3 sm:space-x-4">
                <a 
                  href="https://instagram.com/treinai" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Instagram da TreinAI"
                >
                  <FaInstagram className="w-5 h-5 sm:w-6 sm:h-6" />
                </a>
                <a 
                  href="mailto:pyerremarcio098@gmail.com" 
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Email de contato"
                >
                  <FaLinkedin className="w-5 h-5 sm:w-6 sm:h-6" />
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Links Rápidos</h4>
              <ul className="space-y-1 sm:space-y-2">
                <li><Link to="/" className="text-gray-400 hover:text-white transition-colors text-sm sm:text-base">Home</Link></li>
                <li><Link to="/sobre" className="text-gray-400 hover:text-white transition-colors text-sm sm:text-base">Sobre</Link></li>
                <li><Link to="/login" className="text-gray-400 hover:text-white transition-colors text-sm sm:text-base">Login</Link></li>
                <li><Link to="/termos" className="text-gray-400 hover:text-white transition-colors text-sm sm:text-base">Termos</Link></li>
                <li><Link to="/politica-de-privacidade" className="text-gray-400 hover:text-white transition-colors text-sm sm:text-base">Privacidade</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Contato</h4>
              <ul className="space-y-1 sm:space-y-2 text-gray-400">
                <li className="text-sm sm:text-base">pyerremarcio098@gmail.com</li>
                <li className="text-sm sm:text-base">Brasil</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-gray-400">
            <p className="text-xs sm:text-sm">&copy; {new Date().getFullYear()} TreinAI. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 z-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          aria-label="Voltar ao topo da página"
        >
          <FiArrowUp className="w-5 h-5 sm:w-6 sm:h-6 mx-auto" />
        </button>
      )}
    </div>
  );
};

export default PoliticaPrivacidade;