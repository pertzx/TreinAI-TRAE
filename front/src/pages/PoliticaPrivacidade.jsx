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
      <div className="container mx-auto px-4 py-4">
        <Header logado={false} />
      </div>

      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-20 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-12 h-12 bg-white rounded-lg shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          aria-label={sidebarOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"}
        >
          {sidebarOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`fixed lg:sticky lg:top-0 max-h-screen overflow-hidden top-0 left-0 w-80 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-40 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}>
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center mr-3">
                <Logo scale={1} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Política de Privacidade</h2>
            </div>
            <p className="text-sm text-gray-600">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>
          
          <nav className="p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
            <ul className="space-y-2">
              {sections.map((section) => (
                <li key={section.id}>
                  <button
                    onClick={() => scrollToSection(section.id)}
                    aria-label={`Navegar para seção ${section.title}`}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center space-x-3 ${
                      activeSection === section.id
                        ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className={`${activeSection === section.id ? 'text-white' : 'text-gray-500'}`}>
                      {section.icon}
                    </span>
                    <span className="text-sm font-medium">{section.title}</span>
                    <FiChevronRight className={`w-4 h-4 ml-auto ${activeSection === section.id ? 'text-white' : 'text-gray-400'}`} />
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
        <main className="flex-1 lg:ml-0 px-4 lg:px-8 py-8">
          <div className="max-w-4xl mx-auto">
            
            {/* Hero Section */}
            <div className="text-center mb-12">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl flex items-center justify-center">
                  <FiShield className="w-8 h-8 text-white" />
                </div>
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                Política de Privacidade
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Transparência total sobre como coletamos, usamos e protegemos seus dados pessoais na TreinAI
              </p>
              <div className="mt-6 inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                <FiShield className="w-4 h-4 mr-2" />
                Conforme LGPD - Lei Geral de Proteção de Dados
              </div>
            </div>

            {/* Introdução */}
            <section id="introducao" className="mb-12">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center mr-4">
                    <FiShield className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900">Introdução e Finalidade</h2>
                </div>
                <div className="prose prose-lg max-w-none text-gray-700 space-y-4">
                  <p>
                    A <strong>TreinAI</strong> está comprometida com a proteção da sua privacidade e dos seus dados pessoais. 
                    Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações 
                    quando você utiliza nossa plataforma de treinos personalizados com inteligência artificial.
                  </p>
                  <p>
                    Esta política está em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)</strong>, 
                    o <strong>Marco Civil da Internet (Lei nº 12.965/2014)</strong> e demais regulamentações aplicáveis no Brasil.
                  </p>
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                    <p className="text-blue-800 font-medium">
                      <FiAlertCircle className="w-5 h-5 inline mr-2" />
                      Ao utilizar nossos serviços, você concorda com as práticas descritas nesta política.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Dados Coletados */}
            <section id="dados-coletados" className="mb-12">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center mr-4">
                    <FiDatabase className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900">Dados Coletados</h2>
                </div>
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                        <FiUsers className="w-5 h-5 mr-2 text-green-600" />
                        Dados Pessoais
                      </h3>
                      <ul className="space-y-2 text-gray-700">
                        <li>• Nome completo</li>
                        <li>• Endereço de e-mail</li>
                        <li>• Número de telefone</li>
                        <li>• Data de nascimento</li>
                        <li>• Gênero</li>
                        <li>• Foto de perfil (opcional)</li>
                      </ul>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                        <FiSettings className="w-5 h-5 mr-2 text-blue-600" />
                        Dados de Fitness
                      </h3>
                      <ul className="space-y-2 text-gray-700">
                        <li>• Peso e altura</li>
                        <li>• Índice de Massa Corporal (IMC)</li>
                        <li>• Histórico de treinos</li>
                        <li>• Metas e objetivos</li>
                        <li>• Métricas de desempenho</li>
                        <li>• Preferências de exercícios</li>
                      </ul>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                      <FiEye className="w-5 h-5 mr-2 text-purple-600" />
                      Dados Técnicos e de Uso
                    </h3>
                    <div className="grid md:grid-cols-3 gap-4 text-gray-700">
                      <ul className="space-y-2">
                        <li>• Endereço IP</li>
                        <li>• Tipo de dispositivo</li>
                        <li>• Sistema operacional</li>
                      </ul>
                      <ul className="space-y-2">
                        <li>• Navegador utilizado</li>
                        <li>• Localização (se permitida)</li>
                        <li>• Cookies e sessões</li>
                      </ul>
                      <ul className="space-y-2">
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
            <section id="uso-informacoes" className="mb-12">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center mr-4">
                    <FiEye className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900">Uso das Informações</h2>
                </div>
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                      <h3 className="text-xl font-semibold text-green-900 mb-4">🤖 Personalização com IA</h3>
                      <ul className="space-y-2 text-green-800">
                        <li>• Gerar treinos personalizados</li>
                        <li>• Ajustar dificuldade automaticamente</li>
                        <li>• Recomendar exercícios específicos</li>
                        <li>• Adaptar planos conforme progresso</li>
                      </ul>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                      <h3 className="text-xl font-semibold text-blue-900 mb-4">📈 Melhorias do Serviço</h3>
                      <ul className="space-y-2 text-blue-800">
                        <li>• Análise de padrões de uso</li>
                        <li>• Otimização de algoritmos</li>
                        <li>• Desenvolvimento de novas funcionalidades</li>
                        <li>• Correção de bugs e melhorias</li>
                      </ul>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                    <h3 className="text-xl font-semibold text-purple-900 mb-4">💬 Comunicação e Suporte</h3>
                    <div className="grid md:grid-cols-2 gap-4 text-purple-800">
                      <ul className="space-y-2">
                        <li>• Notificações de treino</li>
                        <li>• Lembretes personalizados</li>
                        <li>• Updates da plataforma</li>
                      </ul>
                      <ul className="space-y-2">
                        <li>• Suporte técnico</li>
                        <li>• Resposta a dúvidas</li>
                        <li>• Comunicações importantes</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Compartilhamento */}
            <section id="compartilhamento" className="mb-12">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center mr-4">
                    <FiUsers className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900">Compartilhamento de Dados</h2>
                </div>
                <div className="space-y-6">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                    <h3 className="text-xl font-semibold text-red-900 mb-4">❌ NÃO Compartilhamos Com:</h3>
                    <div className="grid md:grid-cols-2 gap-4 text-red-800">
                      <ul className="space-y-2">
                        <li>• Empresas de marketing</li>
                        <li>• Terceiros não autorizados</li>
                        <li>• Redes sociais para publicidade</li>
                      </ul>
                      <ul className="space-y-2">
                        <li>• Corretores de dados</li>
                        <li>• Governos (exceto ordem judicial)</li>
                        <li>• Concorrentes</li>
                      </ul>
                    </div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                    <h3 className="text-xl font-semibold text-green-900 mb-4">✅ Podemos Compartilhar Com:</h3>
                    <div className="space-y-4 text-green-800">
                      <div className="flex items-start space-x-3">
                        <FiShield className="w-5 h-5 mt-1 text-green-600" />
                        <div>
                          <strong>Provedores de Serviço:</strong> Empresas que nos ajudam a operar a plataforma (hosting, backup, analytics)
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <FiShield className="w-5 h-5 mt-1 text-green-600" />
                        <div>
                          <strong>Processadores de Pagamento:</strong> Para processar assinaturas e pagamentos de forma segura
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <FiShield className="w-5 h-5 mt-1 text-green-600" />
                        <div>
                          <strong>Dados Anonimizados:</strong> Estatísticas gerais sem identificação pessoal para pesquisas
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Direitos do Usuário */}
            <section id="direitos-usuario" className="mb-12">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center mr-4">
                    <FiSettings className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900">Seus Direitos (LGPD)</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-2">📋 Acesso aos Dados</h4>
                      <p className="text-blue-800 text-sm">Solicitar cópia de todos os seus dados pessoais</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <h4 className="font-semibold text-green-900 mb-2">✏️ Correção</h4>
                      <p className="text-green-800 text-sm">Corrigir dados incompletos ou incorretos</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <h4 className="font-semibold text-purple-900 mb-2">🚫 Exclusão</h4>
                      <p className="text-purple-800 text-sm">Solicitar remoção completa dos seus dados</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                      <h4 className="font-semibold text-orange-900 mb-2">📤 Portabilidade</h4>
                      <p className="text-orange-800 text-sm">Transferir seus dados para outro serviço</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <h4 className="font-semibold text-red-900 mb-2">⛔ Oposição</h4>
                      <p className="text-red-800 text-sm">Opor-se ao tratamento dos seus dados</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-2">ℹ️ Informação</h4>
                      <p className="text-gray-800 text-sm">Saber como seus dados são utilizados</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl p-6 text-white">
                  <h4 className="font-semibold mb-2">Como Exercer Seus Direitos:</h4>
                  <p className="mb-3">Entre em contato conosco através do e-mail: <strong>pyerremarcio098@gmail.com</strong></p>
                  <p className="text-sm opacity-90">Responderemos sua solicitação em até 15 dias úteis, conforme previsto na LGPD.</p>
                </div>
              </div>
            </section>

            {/* Segurança */}
            <section id="seguranca" className="mb-12">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center mr-4">
                    <FiLock className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900">Segurança dos Dados</h2>
                </div>
                <div className="space-y-6">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiLock className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Criptografia</h3>
                      <p className="text-gray-600 text-sm">Dados criptografados em trânsito e em repouso</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiShield className="w-8 h-8 text-blue-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Firewall</h3>
                      <p className="text-gray-600 text-sm">Proteção contra acessos não autorizados</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiEye className="w-8 h-8 text-purple-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Monitoramento</h3>
                      <p className="text-gray-600 text-sm">Vigilância 24/7 contra ameaças</p>
                    </div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                    <div className="flex items-start space-x-3">
                      <FiAlertCircle className="w-6 h-6 text-yellow-600 mt-1" />
                      <div>
                        <h4 className="font-semibold text-yellow-900 mb-2">Incidentes de Segurança</h4>
                        <p className="text-yellow-800">
                          Em caso de violação de dados que possa gerar riscos aos usuários, notificaremos 
                          as autoridades competentes e os usuários afetados em até 72 horas, conforme LGPD.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Cookies */}
            <section id="cookies" className="mb-12">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center mr-4">
                    <FiDatabase className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900">Cookies e Tecnologias</h2>
                </div>
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">🍪 Cookies Essenciais</h3>
                      <ul className="space-y-2 text-gray-700">
                        <li>• Manter você logado</li>
                        <li>• Lembrar preferências</li>
                        <li>• Garantir segurança</li>
                        <li>• Funcionalidade básica</li>
                      </ul>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">📊 Cookies Analíticos</h3>
                      <ul className="space-y-2 text-gray-700">
                        <li>• Entender uso da plataforma</li>
                        <li>• Melhorar experiência</li>
                        <li>• Identificar problemas</li>
                        <li>• Otimizar performance</li>
                      </ul>
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <h4 className="font-semibold text-blue-900 mb-3">Controle de Cookies</h4>
                    <p className="text-blue-800 mb-3">
                      Você pode gerenciar cookies através das configurações do seu navegador. 
                      Note que desabilitar cookies essenciais pode afetar a funcionalidade da plataforma.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-blue-200 text-blue-800 rounded-full text-sm">Chrome</span>
                      <span className="px-3 py-1 bg-blue-200 text-blue-800 rounded-full text-sm">Firefox</span>
                      <span className="px-3 py-1 bg-blue-200 text-blue-800 rounded-full text-sm">Safari</span>
                      <span className="px-3 py-1 bg-blue-200 text-blue-800 rounded-full text-sm">Edge</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Retenção */}
            <section id="retencao" className="mb-12">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center mr-4">
                    <FiAlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900">Retenção de Dados</h2>
                </div>
                <div className="space-y-6">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                      <h3 className="text-lg font-semibold text-green-900 mb-3">Conta Ativa</h3>
                      <p className="text-green-800">Mantemos seus dados enquanto sua conta estiver ativa e você utilizar nossos serviços.</p>
                    </div>
                    <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
                      <h3 className="text-lg font-semibold text-yellow-900 mb-3">Conta Inativa</h3>
                      <p className="text-yellow-800">Após 2 anos de inatividade, seus dados serão automaticamente excluídos.</p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-6 border border-red-200">
                      <h3 className="text-lg font-semibold text-red-900 mb-3">Exclusão Solicitada</h3>
                      <p className="text-red-800">Dados excluídos em até 30 dias após solicitação, exceto obrigações legais.</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="font-semibold text-gray-900 mb-3">Exceções de Retenção:</h4>
                    <ul className="space-y-2 text-gray-700">
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
            <section id="alteracoes" className="mb-12">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center mr-4">
                    <FiSettings className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900">Alterações na Política</h2>
                </div>
                <div className="space-y-6">
                  <div className="prose prose-lg max-w-none text-gray-700">
                    <p>
                      Podemos atualizar esta Política de Privacidade periodicamente para refletir mudanças 
                      em nossas práticas, tecnologias ou requisitos legais.
                    </p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                      <h3 className="text-lg font-semibold text-blue-900 mb-3">📧 Notificação</h3>
                      <p className="text-blue-800">
                        Alterações significativas serão comunicadas por e-mail com 30 dias de antecedência.
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                      <h3 className="text-lg font-semibold text-green-900 mb-3">📅 Data de Vigência</h3>
                      <p className="text-green-800">
                        A nova versão entrará em vigor na data especificada na notificação.
                      </p>
                    </div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                    <div className="flex items-start space-x-3">
                      <FiAlertCircle className="w-6 h-6 text-yellow-600 mt-1" />
                      <div>
                        <h4 className="font-semibold text-yellow-900 mb-2">Seu Controle</h4>
                        <p className="text-yellow-800">
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
            <section id="contato" className="mb-12">
              <div className="bg-gradient-to-br from-green-500 to-blue-500 rounded-2xl shadow-lg p-8 text-white">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4">
                    <FiMail className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold">Contato e Dúvidas</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-xl font-semibold mb-4">📧 Entre em Contato</h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <FiMail className="w-5 h-5" />
                        <span>pyerremarcio098@gmail.com</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <FiUsers className="w-5 h-5" />
                        <span>Pyerre Márcio - Fundador & CEO</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-4">⚡ Tempo de Resposta</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Dúvidas gerais:</span>
                        <span className="font-semibold">24-48h</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Direitos LGPD:</span>
                        <span className="font-semibold">15 dias úteis</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Incidentes de segurança:</span>
                        <span className="font-semibold">72h</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-8 bg-white/10 rounded-xl p-6">
                  <h4 className="font-semibold mb-3">🛡️ Encarregado de Proteção de Dados (DPO)</h4>
                  <p className="opacity-90">
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
      <footer className="bg-gray-900 text-white py-12 mt-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center mr-3">
                  <Logo scale={1} />
                </div>
                <h3 className="text-2xl font-bold">TreinAI</h3>
              </div>
              <p className="text-gray-400 mb-4">
                Muito além do Personal Trainer IA. Transformando vidas através da tecnologia e do fitness.
              </p>
              <div className="flex space-x-4">
                <a 
                  href="https://instagram.com/treinai" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Instagram da TreinAI"
                >
                  <FaInstagram className="w-6 h-6" />
                </a>
                <a 
                  href="mailto:pyerremarcio098@gmail.com" 
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Email de contato"
                >
                  <FaLinkedin className="w-6 h-6" />
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Links Rápidos</h4>
              <ul className="space-y-2">
                <li><Link to="/" className="text-gray-400 hover:text-white transition-colors">Home</Link></li>
                <li><Link to="/sobre" className="text-gray-400 hover:text-white transition-colors">Sobre</Link></li>
                <li><Link to="/login" className="text-gray-400 hover:text-white transition-colors">Login</Link></li>
                <li><Link to="/termos" className="text-gray-400 hover:text-white transition-colors">Termos</Link></li>
                <li><Link to="/politica-de-privacidade" className="text-gray-400 hover:text-white transition-colors">Privacidade</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-md font-semibold mb-4">Contato</h4>
              <ul className="space-y-2 text-gray-400">
                <li>pyerremarcio098@gmail.com</li>
                <li>Brasil</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} TreinAI. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 z-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          aria-label="Voltar ao topo da página"
        >
          <FiArrowUp className="w-6 h-6 mx-auto" />
        </button>
      )}
    </div>
  );
};

export default PoliticaPrivacidade;