import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowUp, FiUsers, FiTarget, FiHeart, FiStar, FiAward, FiTrendingUp } from 'react-icons/fi';
import { FaInstagram, FaLinkedin, FaGithub } from 'react-icons/fa';
import Header from '../components/Header';
import Logo from '../components/Logo';

const Sobre = () => {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const teamMembers = [
    {
      name: "Pyerre Márcio",
      role: "Fundador & CEO",
      description: "Desenvolvedor Full Stack apaixonado por tecnologia e fitness",
      image: "/api/placeholder/150/150",
      social: {
        instagram: "https://instagram.com/pyerremarcio",
        linkedin: "https://linkedin.com/in/pyerremarcio",
        github: "https://github.com/pyerremarcio"
      }
    }
  ];

  const milestones = [
    {
      year: "2024",
      title: "Nascimento da TreinAI",
      description: "Início do desenvolvimento da plataforma com foco em personalização de treinos através de IA"
    },
    {
      year: "2024",
      title: "Primeira Versão",
      description: "Lançamento da versão beta com funcionalidades básicas de geração de treinos"
    },
    {
      year: "2024",
      title: "Expansão de Recursos",
      description: "Implementação de gamificação, rankings e sistema de acompanhamento de progresso"
    }
  ];

  const values = [
    {
      icon: <FiTarget className="w-8 h-8" />,
      title: "Personalização",
      description: "Cada treino é único e adaptado às suas necessidades específicas"
    },
    {
      icon: <FiHeart className="w-8 h-8" />,
      title: "Bem-estar",
      description: "Priorizamos sua saúde física e mental em cada recomendação"
    },
    {
      icon: <FiTrendingUp className="w-8 h-8" />,
      title: "Evolução",
      description: "Acompanhamos seu progresso e adaptamos constantemente seus treinos"
    },
    {
      icon: <FiUsers className="w-8 h-8" />,
      title: "Comunidade",
      description: "Conectamos pessoas com objetivos similares através de rankings e desafios"
    }
  ];

  const stats = [
    { number: "1000+", label: "Usuários Ativos" },
    { number: "50k+", label: "Treinos Gerados" },
    { number: "95%", label: "Satisfação" },
    { number: "24/7", label: "Disponibilidade" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="container mx-auto px-4 py-4">
        <Header logado={false} />
      </div>

      {/* Hero Section */}
      <section className="relative py-20 px-4 text-center">
        <div className="container mx-auto max-w-4xl">
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl flex items-center justify-center">
              <Logo scale={2} />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Sobre a <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-blue-500">TreinAI</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Revolucionando o fitness através da inteligência artificial, oferecendo treinos personalizados 
            que se adaptam ao seu estilo de vida e objetivos únicos.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link 
              to="/login" 
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-full font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Começar Agora
            </Link>
            <Link 
              to="/termos" 
              className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-full font-semibold hover:border-gray-400 transition-colors"
            >
              Termos de Uso
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-blue-500 mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Nossa Missão</h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                Democratizar o acesso a treinos de qualidade profissional através da tecnologia. 
                Acreditamos que todos merecem ter um personal trainer virtual que entende suas 
                necessidades, limitações e objetivos.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed">
                Nossa plataforma utiliza algoritmos avançados de machine learning para criar 
                experiências de treino únicas, adaptativas e motivadoras para cada usuário.
              </p>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl p-8 text-white">
                <FiAward className="w-16 h-16 mb-4" />
                <h3 className="text-2xl font-bold mb-4">Excelência em IA</h3>
                <p className="text-green-100">
                  Utilizamos as mais avançadas tecnologias de inteligência artificial 
                  para proporcionar a melhor experiência de treino personalizado.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-white px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Nossos Valores</h2>
            <p className="text-xl text-gray-600">Os princípios que guiam nossa jornada</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div key={index} className="text-center p-6 rounded-xl hover:shadow-lg transition-shadow">
                <div className="text-green-500 mb-4 flex justify-center">
                  {value.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{value.title}</h3>
                <p className="text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Nossa História</h2>
            <p className="text-xl text-gray-600">A jornada da TreinAI até aqui</p>
          </div>
          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-green-500 to-blue-500 rounded-full"></div>
            {milestones.map((milestone, index) => (
              <div key={index} className={`relative flex items-center mb-12 ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <div className={`w-1/2 ${index % 2 === 0 ? 'pr-8 text-right' : 'pl-8 text-left'}`}>
                  <div className="bg-white p-6 rounded-xl shadow-lg">
                    <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-blue-500 mb-2">
                      {milestone.year}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{milestone.title}</h3>
                    <p className="text-gray-600">{milestone.description}</p>
                  </div>
                </div>
                <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border-4 border-green-500 rounded-full"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-white px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Nossa Equipe</h2>
            <p className="text-xl text-gray-600">Conheça quem está por trás da TreinAI</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center">
            {teamMembers.map((member, index) => (
              <div key={index} className="text-center bg-gray-50 p-8 rounded-xl hover:shadow-lg transition-shadow">
                <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-r from-green-500 to-blue-500 p-1">
                  <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center">
                    <FiUsers className="w-12 h-12 text-gray-400" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{member.name}</h3>
                <p className="text-green-600 font-semibold mb-3">{member.role}</p>
                <p className="text-gray-600 mb-4">{member.description}</p>
                <div className="flex justify-center space-x-4">
                  <a 
                    href={member.social.instagram} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-pink-500 transition-colors"
                    aria-label={`Instagram de ${member.name}`}
                  >
                    <FaInstagram className="w-5 h-5" />
                  </a>
                  <a 
                    href={member.social.linkedin} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                    aria-label={`LinkedIn de ${member.name}`}
                  >
                    <FaLinkedin className="w-5 h-5" />
                  </a>
                  <a 
                    href={member.social.github} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-900 transition-colors"
                    aria-label={`GitHub de ${member.name}`}
                  >
                    <FaGithub className="w-5 h-5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-green-500 to-blue-500 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Pronto para Transformar Seus Treinos?
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Junte-se a milhares de usuários que já descobriram o poder da IA no fitness
          </p>
          <Link 
            to="/login" 
            className="inline-block px-8 py-4 bg-white text-green-600 rounded-full font-bold text-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            Começar Minha Jornada
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
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
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Contato</h4>
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
          className="fixed bottom-8 right-8 w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 z-50"
          aria-label="Voltar ao topo"
        >
          <FiArrowUp className="w-6 h-6 mx-auto" />
        </button>
      )}
    </div>
  );
};

export default Sobre;