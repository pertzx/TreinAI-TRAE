import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowUp, FiMenu, FiX, FiChevronRight } from 'react-icons/fi';
import { FaInstagram, FaLinkedin } from 'react-icons/fa';
import Header from '../components/Header';
import Logo from '../components/Logo';

const Termos = () => {
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
    { id: 'introducao', title: 'Introdução' },
    { id: 'definicoes', title: 'Definições' },
    { id: 'aceitacao', title: 'Aceitação dos Termos' },
    { id: 'servicos', title: 'Descrição dos Serviços' },
    { id: 'cadastro', title: 'Cadastro e Conta' },
    { id: 'uso-aceitavel', title: 'Uso Aceitável' },
    { id: 'privacidade', title: 'Privacidade e Dados' },
    { id: 'propriedade', title: 'Propriedade Intelectual' },
    { id: 'pagamentos', title: 'Pagamentos e Assinaturas' },
    { id: 'responsabilidades', title: 'Responsabilidades' },
    { id: 'limitacoes', title: 'Limitações de Responsabilidade' },
    { id: 'modificacoes', title: 'Modificações' },
    { id: 'rescisao', title: 'Rescisão' },
    { id: 'banimento', title: 'Sistema de Banimento' },
    { id: 'lei-aplicavel', title: 'Lei Aplicável' },
    { id: 'contato', title: 'Contato' }
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
          className="w-12 h-12 bg-white rounded-lg shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          {sidebarOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`fixed lg:sticky max-h-screen overflow-hidden top-0 left-0 w-80 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-40 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}>
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center mr-3">
                <Logo scale={1} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Termos de Uso</h2>
            </div>
            <p className="text-sm text-gray-600">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>
          
          <nav className="p-4 overflow-y-auto h-full pb-20">
            <ul className="space-y-2">
              {sections.map((section) => (
                <li key={section.id}>
                  <button
                    onClick={() => scrollToSection(section.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center justify-between group ${
                      activeSection === section.id
                        ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span className="text-sm font-medium">{section.title}</span>
                    <FiChevronRight className={`w-4 h-4 transition-transform ${
                      activeSection === section.id ? 'rotate-90' : 'group-hover:translate-x-1'
                    }`} />
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 lg:ml-0">
          <div className="max-w-4xl mx-auto px-6 py-8">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Termos de <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-blue-500">Uso</span>
              </h1>
              <p className="text-xl text-gray-600">
                Leia atentamente nossos termos e condições de uso da plataforma TreinAI
              </p>
            </div>

            {/* Content Sections */}
            <div className="prose prose-lg max-w-none">
              
              <section id="introducao" className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">1. Introdução</h2>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Bem-vindo à TreinAI! Estes Termos de Uso ("Termos") regem o uso da nossa plataforma de treinos personalizados 
                    baseada em inteligência artificial, incluindo nosso website, aplicações móveis e todos os serviços relacionados 
                    (coletivamente, os "Serviços").
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    Ao acessar ou usar nossos Serviços, você concorda em ficar vinculado a estes Termos. Se você não concordar 
                    com qualquer parte destes Termos, não poderá acessar ou usar nossos Serviços.
                  </p>
                </div>
              </section>

              <section id="definicoes" className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">2. Definições</h2>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">"TreinAI", "nós", "nosso"</h3>
                      <p className="text-gray-700">Refere-se à plataforma TreinAI e seus operadores.</p>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">"Usuário", "você", "seu"</h3>
                      <p className="text-gray-700">Refere-se a qualquer pessoa que acesse ou use nossos Serviços.</p>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">"Serviços"</h3>
                      <p className="text-gray-700">Inclui todos os recursos, funcionalidades e conteúdo oferecidos pela TreinAI.</p>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">"Conteúdo"</h3>
                      <p className="text-gray-700">Inclui textos, imagens, vídeos, dados e outros materiais disponíveis nos Serviços.</p>
                    </div>
                  </div>
                </div>
              </section>

              <section id="aceitacao" className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">3. Aceitação dos Termos</h2>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Ao criar uma conta, fazer login ou usar qualquer parte dos nossos Serviços, você confirma que:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    <li>Leu, entendeu e concorda com estes Termos</li>
                    <li>Tem pelo menos 18 anos de idade ou possui consentimento dos pais/responsáveis</li>
                    <li>Tem capacidade legal para celebrar este acordo</li>
                    <li>Fornecerá informações precisas e atualizadas</li>
                  </ul>
                </div>
              </section>

              <section id="servicos" className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">4. Descrição dos Serviços</h2>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <p className="text-gray-700 leading-relaxed mb-4">
                    A TreinAI oferece uma plataforma de fitness baseada em inteligência artificial que inclui:
                  </p>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-2">Treinos Personalizados</h4>
                      <p className="text-sm text-gray-600">Geração automática de treinos adaptados ao seu perfil</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-2">Acompanhamento de Progresso</h4>
                      <p className="text-sm text-gray-600">Monitoramento detalhado da sua evolução</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-2">Sistema de Gamificação</h4>
                      <p className="text-sm text-gray-600">Rankings, pontuações e desafios motivacionais</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-2">Análises e Relatórios</h4>
                      <p className="text-sm text-gray-600">Insights detalhados sobre seu desempenho</p>
                    </div>
                  </div>
                  <p className="text-gray-700 leading-relaxed">
                    Reservamo-nos o direito de modificar, suspender ou descontinuar qualquer parte dos Serviços 
                    a qualquer momento, com ou sem aviso prévio.
                  </p>
                </div>
              </section>

              <section id="cadastro" className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">5. Cadastro e Conta</h2>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Criação de Conta</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Para usar nossos Serviços, você deve criar uma conta fornecendo informações precisas e completas. 
                    Você é responsável por manter a confidencialidade de suas credenciais de login.
                  </p>
                  
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Responsabilidades do Usuário</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                    <li>Manter suas informações de conta atualizadas</li>
                    <li>Proteger sua senha e não compartilhá-la com terceiros</li>
                    <li>Notificar-nos imediatamente sobre uso não autorizado de sua conta</li>
                    <li>Ser responsável por todas as atividades em sua conta</li>
                  </ul>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 text-sm">
                      <strong>Importante:</strong> Você é totalmente responsável por todas as atividades que ocorrem 
                      em sua conta, independentemente de ter autorizado tais atividades.
                    </p>
                  </div>
                </div>
              </section>

              <section id="uso-aceitavel" className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">6. Uso Aceitável</h2>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Usos Permitidos</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Você pode usar nossos Serviços apenas para fins legais e de acordo com estes Termos.
                  </p>

                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Usos Proibidos</h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-red-800 font-semibold mb-2">Você NÃO pode:</p>
                    <ul className="list-disc list-inside space-y-1 text-red-700 text-sm">
                      <li>Usar os Serviços para qualquer propósito ilegal ou não autorizado</li>
                      <li>Tentar obter acesso não autorizado aos nossos sistemas</li>
                      <li>Interferir ou interromper os Serviços ou servidores</li>
                      <li>Transmitir vírus, malware ou código malicioso</li>
                      <li>Fazer engenharia reversa de qualquer parte dos Serviços</li>
                      <li>Usar bots, scrapers ou ferramentas automatizadas</li>
                      <li>Compartilhar conteúdo ofensivo, difamatório ou inadequado</li>
                      <li>Violar direitos de propriedade intelectual</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section id="privacidade" className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">7. Privacidade e Dados</h2>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Coleta de Dados</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Coletamos e processamos seus dados pessoais conforme descrito em nossa Política de Privacidade, 
                    incluindo informações de perfil, dados de treino e métricas de desempenho.
                  </p>

                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Uso de Dados</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Utilizamos seus dados para personalizar treinos, melhorar nossos algoritmos de IA e fornecer 
                    uma experiência otimizada. Seus dados de saúde são tratados com máxima confidencialidade.
                  </p>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800 text-sm">
                      <strong>Proteção de Dados:</strong> Implementamos medidas de segurança técnicas e organizacionais 
                      para proteger seus dados pessoais contra acesso não autorizado, alteração ou destruição.
                    </p>
                  </div>

                  <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-6">Notificações de Segurança por Email</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Para sua segurança, enviamos notificações automáticas por email sempre que detectamos atividades 
                    importantes em sua conta, incluindo novos logins e acessos de dispositivos não reconhecidos.
                  </p>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                    <p className="text-orange-800 text-sm">
                      <strong>Importante:</strong> Essas notificações são enviadas automaticamente pelo nosso sistema 
                      de segurança e não podem ser desabilitadas, pois são essenciais para proteger sua conta.
                    </p>
                  </div>

                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Tipos de Notificações Enviadas:</h4>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                    <li>Login realizado com sucesso em novo dispositivo</li>
                    <li>Tentativas de login de localizações não reconhecidas</li>
                    <li>Alterações nas configurações de segurança da conta</li>
                    <li>Atividades suspeitas detectadas pelo sistema</li>
                  </ul>

                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Controle de Segurança:</h4>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Caso receba uma notificação sobre atividade não autorizada, você pode imediatamente bloquear 
                    o dispositivo suspeito e todos os dispositivos próximos à região geográfica desse acesso através 
                    das configurações de segurança da sua conta.
                  </p>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 text-sm">
                      <strong>Isenção de Responsabilidade:</strong> A TreinAI não se responsabiliza por emails de 
                      notificação que não sejam entregues devido a problemas com seu provedor de email, filtros de 
                      spam, ou configurações de sua caixa de entrada. É sua responsabilidade manter um email válido 
                      e acessível para receber essas notificações de segurança.
                    </p>
                  </div>
                </div>
              </section>

              <section id="propriedade" className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">8. Propriedade Intelectual</h2>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Nossos Direitos</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Todos os direitos de propriedade intelectual nos Serviços, incluindo software, algoritmos, 
                    design, conteúdo e marca TreinAI, são de nossa propriedade ou licenciados para nós.
                  </p>

                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Seus Direitos</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Você mantém a propriedade de qualquer conteúdo que criar ou enviar através dos Serviços, 
                    mas nos concede uma licença para usar esse conteúdo conforme necessário para fornecer os Serviços.
                  </p>

                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Licença de Uso</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Concedemos a você uma licença limitada, não exclusiva e revogável para usar nossos Serviços 
                    de acordo com estes Termos.
                  </p>
                </div>
              </section>

              <section id="pagamentos" className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">9. Pagamentos e Assinaturas</h2>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Planos e Preços</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Oferecemos diferentes planos de assinatura com recursos variados. Os preços estão sujeitos 
                    a alterações mediante aviso prévio de 30 dias.
                  </p>

                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Cobrança e Renovação</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                    <li>As assinaturas são renovadas automaticamente</li>
                    <li>Você pode cancelar a qualquer momento</li>
                    <li>Reembolsos seguem nossa política específica</li>
                    <li>Taxas em atraso podem ser aplicadas</li>
                  </ul>

                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Política de Reembolso</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Oferecemos reembolso integral dentro de 7 dias da primeira compra. Após esse período, 
                    reembolsos são avaliados caso a caso.
                  </p>
                </div>
              </section>

              <section id="responsabilidades" className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">10. Responsabilidades</h2>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Nossas Responsabilidades</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                    <li>Fornecer os Serviços conforme descrito</li>
                    <li>Manter a segurança e privacidade dos dados</li>
                    <li>Oferecer suporte técnico adequado</li>
                    <li>Comunicar mudanças significativas nos Serviços</li>
                  </ul>

                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Suas Responsabilidades</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                    <li>Usar os Serviços de forma responsável e legal</li>
                    <li>Manter suas informações de conta atualizadas</li>
                    <li>Consultar profissionais de saúde antes de iniciar exercícios</li>
                    <li>Respeitar os direitos de outros usuários</li>
                  </ul>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-orange-800 text-sm">
                      <strong>Aviso Médico:</strong> Nossos Serviços não substituem aconselhamento médico profissional. 
                      Consulte sempre um médico antes de iniciar qualquer programa de exercícios.
                    </p>
                  </div>
                </div>
              </section>

              <section id="limitacoes" className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">11. Limitações de Responsabilidade</h2>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-blue-800 font-semibold mb-2">RESPONSABILIDADE DA TREINAI</p>
                    <p className="text-blue-700 text-sm leading-relaxed">
                      A TreinAI é responsável pelos serviços prestados conforme descrito nestes termos. 
                      Nossa responsabilidade está limitada ao valor pago pelo serviço nos últimos 12 meses, 
                      exceto em casos de dolo, culpa grave ou danos à vida, saúde e integridade física.
                    </p>
                  </div>

                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Limitações Legais</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                    <li>Recomendamos consultar profissionais de saúde antes de iniciar exercícios</li>
                    <li>Os treinos são sugestões e devem ser adaptados às suas condições físicas</li>
                    <li>Manteremos os serviços disponíveis conforme nossos termos de nível de serviço</li>
                    <li>Conteúdo de terceiros é de responsabilidade de seus respectivos autores</li>
                  </ul>

                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Limitações Específicas sobre Comunicações</h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 text-sm">
                      <strong>Notificações por Email:</strong> A TreinAI não se responsabiliza pela entrega, 
                      recebimento ou processamento de emails de notificação de segurança enviados para sua conta. 
                      Problemas relacionados a provedores de email, filtros de spam, configurações de caixa de entrada 
                      ou falhas na infraestrutura de email de terceiros estão fora do nosso controle e responsabilidade.
                    </p>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                    <p className="text-red-800 text-sm">
                      <strong>Segurança da Conta:</strong> É sua responsabilidade manter um endereço de email válido 
                      e acessível, verificar regularmente suas notificações de segurança e tomar as medidas apropriadas 
                      caso detecte atividades suspeitas. A TreinAI fornece as ferramentas de segurança, mas o uso 
                      adequado dessas ferramentas é de sua responsabilidade.
                    </p>
                  </div>
                </div>
              </section>

              <section id="modificacoes" className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">12. Modificações</h2>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Alterações nos Termos</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Podemos modificar estes Termos a qualquer momento. Alterações significativas serão comunicadas 
                    com pelo menos 30 dias de antecedência através de email ou notificação na plataforma.
                  </p>

                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Alterações nos Serviços</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Reservamo-nos o direito de modificar, suspender ou descontinuar qualquer parte dos Serviços 
                    a qualquer momento, com ou sem aviso prévio.
                  </p>
                </div>
              </section>

              <section id="rescisao" className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">13. Rescisão</h2>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Rescisão pelo Usuário</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Você pode encerrar sua conta a qualquer momento através das configurações da conta ou 
                    entrando em contato conosco.
                  </p>

                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Rescisão pela TreinAI</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Podemos suspender ou encerrar sua conta se você violar estes Termos ou por outros motivos 
                    legítimos, com ou sem aviso prévio.
                  </p>

                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Efeitos da Rescisão</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    <li>Perda de acesso aos Serviços</li>
                    <li>Possível exclusão de dados da conta</li>
                    <li>Continuidade de obrigações financeiras pendentes</li>
                  </ul>
                </div>
              </section>

              <section id="banimento" className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Sistema de Banimento</h2>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Causas para Suspensão ou Banimento</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                    <li>Violações reiteradas dos Termos ou uso indevido dos Serviços</li>
                    <li>Tentativas de fraude, acesso não autorizado ou automações indevidas</li>
                    <li>Distribuição de conteúdo ofensivo, ilegal ou que infrinja direitos de terceiros</li>
                    <li>Atividades que comprometam a segurança, estabilidade ou integridade da plataforma</li>
                  </ul>

                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Processo e Evidências</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Podemos utilizar registros técnicos (como IP, dispositivo, eventos de sessão e logs de autenticação)
                    para investigar violações e embasar medidas de moderação. Esses registros são coletados conforme
                    nossa Política de Privacidade e destinam-se exclusivamente à segurança e conformidade dos Serviços.
                  </p>

                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Medidas Aplicáveis</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                    <li>Advertência</li>
                    <li>Suspensão temporária da conta</li>
                    <li>Banimento definitivo em casos graves ou reincidência</li>
                  </ul>

                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Contestação e Recurso</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Você pode solicitar revisão de uma suspensão ou banimento entrando em contato pelos canais oficiais.
                    O pedido será analisado e respondido dentro de prazos razoáveis, considerando as evidências disponíveis.
                  </p>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 text-sm">
                      <strong>Importante:</strong> Medidas de banimento visam proteger a comunidade e manter a
                      integridade dos Serviços. Em caso de banimento definitivo, dados poderão ser retidos pelo
                      período necessário para auditoria e cumprimento de obrigações legais.
                    </p>
                  </div>
                </div>
              </section>

              <section id="lei-aplicavel" className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">14. Lei Aplicável</h2>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Estes Termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa 
                    será resolvida nos tribunais competentes do Brasil.
                  </p>
                  
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Resolução de Disputas</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Encorajamos a resolução amigável de disputas através de negociação direta. Se necessário, 
                    disputas podem ser submetidas à mediação ou arbitragem.
                  </p>
                </div>
              </section>

            </div>

            {/* Last Updated */}
            <div className="text-center mt-12 p-6 bg-gray-100 rounded-xl">
              <p className="text-sm text-gray-600">
                Estes Termos de Uso foram atualizados pela última vez em {new Date().toLocaleDateString('pt-BR')}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Versão 1.0 - TreinAI
              </p>
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 max-w-full text-white py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
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
                  href="https://instagram.com/treeinai" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Instagram da TreinAI"
                >
                  <FaInstagram className="w-6 h-6" />
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
          className="fixed bottom-8 right-8 w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 z-50"
          aria-label="Voltar ao topo"
        >
          <FiArrowUp className="w-6 h-6 mx-auto" />
        </button>
      )}
    </div>
  );
};

export default Termos;
