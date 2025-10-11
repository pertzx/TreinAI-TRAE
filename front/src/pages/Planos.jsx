import React, { useState } from 'react'
import { NavLink, redirect } from 'react-router-dom'
import { useNavigate } from 'react-router-dom';
import { FiCheck, FiX, FiStar, FiUsers, FiTrendingUp, FiZap, FiHeart, FiShield, FiClock, FiTarget, FiBarChart, FiGift, FiInfo, FiCpu } from 'react-icons/fi';

function Planos({ setPlano, setNeedToPay }) {

    var [plano, setplano] = useState('free')
    var navigate = useNavigate()
    const [showDetails, setShowDetails] = useState({});

    const handleBack = () => {
        navigate("/"); // se não tiver histórico, vai pra Home
    };

    const toggleDetails = (planId) => {
        setShowDetails(prev => ({
            ...prev,
            [planId]: !prev[planId]
        }));
    };

    const plans = [
        {
            id: 'free',
            name: 'Free',
            price: 'Grátis',
            period: 'Para sempre',
            originalPrice: null,
            description: 'Perfeito para começar sua jornada fitness',
            subtitle: 'Experimente a plataforma com funcionalidades básicas',
            icon: <FiZap className="w-8 h-8" />,
            color: 'from-gray-500 to-gray-600',
            bgClass: 'bg-white border-gray-200',
            textClass: 'text-gray-800',
            features: [
                { text: '5 treinos por semana', icon: <FiTarget className="w-4 h-4" />, highlight: true },
                { text: 'Chat com Treinador IA básico', icon: <FiCpu className="w-4 h-4" /> },
                { text: 'Feedback pós-treino simples', icon: <FiBarChart className="w-4 h-4" /> },
                { text: 'Onboarding personalizado', icon: <FiGift className="w-4 h-4" /> },
                { text: 'Biblioteca limitada (50 exercícios)', icon: <FiCheck className="w-4 h-4" /> }
            ],
            limitations: [
                'Máximo 5 treinos semanais',
                'Sem relatórios de progresso',
                'Sem personalização avançada',
                'Sem modo offline',
                'Anúncios na interface',
                'Suporte limitado (FAQ apenas)'
            ],
            exclusiveFeatures: [],
            technicalSpecs: {
                storage: '5MB',
                apiCalls: '100/dia',
                cache: '24h'
            },
            buttonText: 'Começar Grátis',
            buttonClass: 'bg-gray-600 hover:bg-gray-700',
            popular: false,
            savings: null
        },
        {
            id: 'pro',
            name: 'Pro',
            price: 'R$ 14,99',
            period: '/mês',
            originalPrice: 'R$ 19,99',
            description: 'Treino inteligente e personalizado',
            subtitle: 'IA avançada para usuários regulares',
            icon: <FiTrendingUp className="w-8 h-8" />,
            color: 'from-blue-500 to-blue-600',
            bgClass: 'bg-white border-blue-500 border-2',
            textClass: 'text-blue-800',
            features: [
                { text: 'Treinos diários ilimitados', icon: <FiTarget className="w-4 h-4" /> },
                { text: 'IA adaptativa avançada', icon: <FiCpu className="w-4 h-4" /> },
                { text: 'Ciclos de treino (4, 8 ou 12 semanas)', icon: <FiClock className="w-4 h-4" /> },
                { text: 'Imagens IA para exercícios', icon: <FiZap className="w-4 h-4" /> },
                { text: 'Relatórios semanais detalhados', icon: <FiBarChart className="w-4 h-4" /> },
                { text: 'Modo escuro premium', icon: <FiShield className="w-4 h-4" /> },
                { text: 'Biblioteca completa (500+ exercícios)', icon: <FiCheck className="w-4 h-4" /> },
                { text: 'Histórico completo + modo offline', icon: <FiCheck className="w-4 h-4" /> }
            ],
            exclusiveFeatures: [
                'Smart Adaptation - IA aprende seus padrões',
                'Progress Analytics - Gráficos avançados',
                'Custom Workouts - Treinos personalizados',
                'Offline Mode - Treinos sem internet'
            ],
            limitations: [
                'Sem plano nutricional',
                'Sem treino mental',
                'Sem funcionalidades de coach',
                'Suporte por email apenas'
            ],
            technicalSpecs: {
                storage: '100MB',
                apiCalls: '1000/dia',
                cache: '7 dias',
                sync: 'Tempo real'
            },
            buttonText: 'Assinar Pro',
            buttonClass: 'bg-blue-600 hover:bg-blue-700',
            popular: true,
            savings: '25% OFF'
        },
        {
            id: 'max',
            name: 'Max',
            price: 'R$ 39,99',
            period: '/mês',
            originalPrice: 'R$ 49,99',
            description: 'Corpo e mente em harmonia',
            subtitle: 'Experiência completa 360° de bem-estar',
            icon: <FiHeart className="w-8 h-8" />,
            color: 'from-purple-500 to-purple-600',
            bgClass: 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-500 border-2',
            textClass: 'text-purple-800',
            features: [
                { text: 'Tudo do Pro incluído', icon: <FiCheck className="w-4 h-4" /> },
                { text: 'NutriAI - Plano alimentar personalizado', icon: <FiHeart className="w-4 h-4" /> },
                { text: 'Recomendações inteligentes de refeições', icon: <FiCpu className="w-4 h-4" /> },
        { text: 'ZenTrain - Treino mental e meditação', icon: <FiHeart className="w-4 h-4" /> },
                { text: 'Checklist diário integrado', icon: <FiTarget className="w-4 h-4" /> },
                { text: 'Modo desafio gamificado', icon: <FiGift className="w-4 h-4" /> },
                { text: 'Receitas IA personalizadas', icon: <FiZap className="w-4 h-4" /> },
                { text: 'Tracking nutricional completo', icon: <FiBarChart className="w-4 h-4" /> }
            ],
            exclusiveFeatures: [
                'Holistic Dashboard - Visão 360° da saúde',
                'AI Meal Planning - Cardápios adaptativos',
                'Mental Wellness - Exercícios de mindfulness',
                'Challenge Mode - Gamificação avançada',
                'Nutrition Sync - Integração com apps',
                'Priority Support - Suporte em até 2h'
            ],
            limitations: [
                'Sem funcionalidades de coaching',
                'Sem white label',
                'Sem gestão de alunos'
            ],
            technicalSpecs: {
                storage: '500MB',
                apiCalls: '5000/dia',
                integrations: 'APIs nutricionais',
                notifications: 'Push avançadas'
            },
            buttonText: 'Assinar Max',
            buttonClass: 'bg-purple-600 hover:bg-purple-700',
            popular: false,
            savings: '20% OFF'
        },
        {
            id: 'coach',
            name: 'Coach',
            price: 'R$ 149,99',
            period: '/mês',
            originalPrice: 'R$ 199,99',
            description: 'Para Personal Trainers profissionais',
            subtitle: 'Plataforma white label para seu negócio',
            icon: <FiUsers className="w-8 h-8" />,
            color: 'from-emerald-500 to-emerald-600',
            bgClass: 'bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700 border-2 border-yellow-400 text-white',
            textClass: 'text-white',
            features: [
                { text: 'Tudo do Max incluído', icon: <FiCheck className="w-4 h-4" /> },
                { text: 'White Label personalizado', icon: <FiShield className="w-4 h-4" /> },
                { text: 'Painel de gestão de alunos', icon: <FiUsers className="w-4 h-4" /> },
                { text: 'Dashboard de feedbacks', icon: <FiBarChart className="w-4 h-4" /> },
                { text: 'CoachFunnels - Funis de venda', icon: <FiTrendingUp className="w-4 h-4" /> },
                { text: 'RankFit - Sistema de ranking', icon: <FiTarget className="w-4 h-4" /> },
                { text: 'Link personalizado para captação', icon: <FiZap className="w-4 h-4" /> },
                { text: 'Relatórios de negócio e receita', icon: <FiBarChart className="w-4 h-4" /> }
            ],
            exclusiveFeatures: [
                'Multi-Client Management - Até 100 alunos',
                'Custom Branding - Logo, cores, domínio próprio',
                'Sales Funnel Builder - Criação de funis visuais',
                'Student Analytics - Métricas por aluno',
                'Automated Marketing - Campanhas automáticas',
                'Revenue Dashboard - Controle financeiro',
                'API Access - Integrações personalizadas'
            ],
            limitations: [
                'Limite de 100 alunos ativos',
                '5GB de armazenamento total',
                'Customizações limitadas ao template'
            ],
            technicalSpecs: {
                storage: '5GB',
                apiCalls: 'Ilimitadas',
                infrastructure: 'Multi-tenant',
                cdn: 'White label CDN'
            },
            buttonText: 'Assinar Coach',
            buttonClass: 'bg-yellow-400 hover:bg-yellow-300 text-emerald-900 font-semibold',
            popular: false,
            savings: '25% OFF'
        }
    ];

    return (
        <section className='my-20 pb-20 flex mb-16 flex-col items-center px-4' >
            <div className='flex flex-col md:flex-row gap-3 items-center justify-center text-xl mb-8'>
                <button
                    onClick={handleBack}
                    className=" left-4 top-4 text-slate-400 hover:text-white text-sm flex items-center gap-1"
                >
                    ← Voltar
                </button>
                <h1 className='text-white text-3xl font-bold'>Quem já usa, recomenda</h1>
                <p className='font-light text-center md:text-left text-white'>
                    <span>Acesse a partir de:</span><br />
                    <span className='text-blue-600 font-medium text-2xl'>R$14,99/mês</span>
                </p>
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 w-full max-w-7xl' id='planos'>

                {plans.map((plan) => (
                    <div key={plan.id} className={`${plan.bgClass} rounded-2xl shadow-lg p-6 hover:scale-[1.02] transition-all duration-300 relative overflow-hidden`}>
                        {/* Badge Popular */}
                        {plan.popular && (
                            <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold transform rotate-12">
                                <FiStar className="w-3 h-3 inline mr-1" />
                                POPULAR
                            </div>
                        )}

                        {/* Badge Savings */}
                        {plan.savings && (
                            <div className="absolute top-4 left-4 bg-red-500 text-white px-2 py-1 rounded-lg text-xs font-bold">
                                {plan.savings}
                            </div>
                        )}

                        {/* Header */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`p-3 rounded-xl bg-gradient-to-r ${plan.color} text-white`}>
                                {plan.icon}
                            </div>
                            <div>
                                <h2 className={`text-xl font-bold ${plan.textClass} mb-1`}>
                                    {plan.name}
                                </h2>
                                <p className={`text-sm ${plan.textClass} opacity-70`}>
                                    {plan.subtitle}
                                </p>
                            </div>
                        </div>

                        {/* Pricing */}
                        <div className="mb-4">
                            <div className="flex items-baseline gap-2">
                                <span className={`text-2xl font-bold ${plan.textClass}`}>
                                    {plan.price}
                                </span>
                                <span className={`text-sm ${plan.textClass} opacity-70`}>
                                    {plan.period}
                                </span>
                            </div>
                            {plan.originalPrice && (
                                <div className="text-sm text-gray-500 line-through">
                                    De {plan.originalPrice}
                                </div>
                            )}
                            <p className={`text-sm ${plan.textClass} opacity-80 mt-1`}>
                                {plan.description}
                            </p>
                        </div>

                        {/* Features */}
                        <div className="mb-6">
                            <h4 className={`text-sm font-semibold ${plan.textClass} mb-3 flex items-center gap-2`}>
                                <FiCheck className="w-4 h-4" />
                                Funcionalidades incluídas:
                            </h4>
                            <ul className="space-y-2">
                                {plan.features.slice(0, 4).map((feature, idx) => (
                                    <li key={idx} className={`flex items-center gap-2 text-sm ${plan.textClass} opacity-90`}>
                                        {feature.icon}
                                        <span className={feature.highlight ? 'text-red-500 font-semibold' : ''}>
                                            {feature.text}
                                        </span>
                                    </li>
                                ))}
                                {plan.features.length > 4 && (
                                    <li className={`text-xs ${plan.textClass} opacity-70`}>
                                        + {plan.features.length - 4} funcionalidades adicionais
                                    </li>
                                )}
                            </ul>
                        </div>

                        {/* Exclusive Features Preview */}
                        {plan.exclusiveFeatures.length > 0 && (
                            <div className="mb-4">
                                <h4 className={`text-sm font-semibold ${plan.textClass} mb-2 flex items-center gap-2`}>
                                    <FiStar className="w-4 h-4" />
                                    Recursos exclusivos:
                                </h4>
                                <div className={`text-xs ${plan.textClass} opacity-80`}>
                                    {plan.exclusiveFeatures.slice(0, 2).map((feature, idx) => (
                                        <div key={idx} className="mb-1">• {feature}</div>
                                    ))}
                                    {plan.exclusiveFeatures.length > 2 && (
                                        <div className="text-xs opacity-60">
                                            + {plan.exclusiveFeatures.length - 2} recursos exclusivos
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Details Toggle */}
                        <button
                            onClick={() => toggleDetails(plan.id)}
                            className={`w-full text-xs ${plan.textClass} opacity-70 hover:opacity-100 transition-opacity mb-4 flex items-center justify-center gap-1`}
                        >
                            <FiInfo className="w-3 h-3" />
                            {showDetails[plan.id] ? 'Ocultar detalhes' : 'Ver detalhes completos'}
                        </button>

                        {/* Expanded Details */}
                        {showDetails[plan.id] && (
                            <div className={`border-t ${plan.id === 'coach' ? 'border-white/20' : 'border-gray-200'} pt-4 mb-4 space-y-4`}>
                                {/* All Features */}
                                <div>
                                    <h5 className={`text-xs font-semibold ${plan.textClass} mb-2`}>
                                        Todas as funcionalidades:
                                    </h5>
                                    <ul className="space-y-1">
                                        {plan.features.map((feature, idx) => (
                                            <li key={idx} className={`flex items-center gap-2 text-xs ${plan.textClass} opacity-80`}>
                                                {feature.icon}
                                                {feature.text}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Exclusive Features */}
                                {plan.exclusiveFeatures.length > 0 && (
                                    <div>
                                        <h5 className={`text-xs font-semibold ${plan.textClass} mb-2`}>
                                            Recursos exclusivos:
                                        </h5>
                                        <ul className="space-y-1">
                                            {plan.exclusiveFeatures.map((feature, idx) => (
                                                <li key={idx} className={`text-xs ${plan.textClass} opacity-80`}>
                                                    • {feature}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Limitations */}
                                {plan.limitations.length > 0 && (
                                    <div>
                                        <h5 className={`text-xs font-semibold ${plan.textClass} mb-2 flex items-center gap-1`}>
                                            <FiX className="w-3 h-3" />
                                            Limitações:
                                        </h5>
                                        <ul className="space-y-1">
                                            {plan.limitations.map((limitation, idx) => (
                                                <li key={idx} className={`text-xs ${plan.textClass} opacity-60`}>
                                                    • {limitation}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Technical Specs */}
                                <div>
                                    <h5 className={`text-xs font-semibold ${plan.textClass} mb-2`}>
                                        Especificações técnicas:
                                    </h5>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        {Object.entries(plan.technicalSpecs).map(([key, value]) => (
                                            <div key={key} className={`${plan.textClass} opacity-70`}>
                                                <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                                                <br />
                                                <span className="opacity-80">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Action Button */}
                        <NavLink to="/login">
                            <button
                                onClick={() => {
                                    setPlano(plan.id);
                                    if (plan.id !== 'free') {
                                        setNeedToPay(true);
                                    }
                                }}
                                className={`w-full ${plan.buttonClass} text-white rounded-lg py-3 px-4 font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg`}
                            >
                                {plan.buttonText}
                            </button>
                        </NavLink>
                    </div>
                ))}

            </div>

            {/* Additional Info Section */}
            <div className="mt-16 max-w-4xl mx-auto text-center">
                <h2 className="text-2xl font-bold text-white mb-6">
                    Por que escolher o TreinAI?
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                        <FiCpu className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold text-white mb-2">IA Avançada</h3>
                        <p className="text-sm text-gray-300">
                            Nossa inteligência artificial aprende com seus treinos e se adapta ao seu progresso
                        </p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                        <FiShield className="w-8 h-8 text-green-400 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold text-white mb-2">Seguro e Confiável</h3>
                        <p className="text-sm text-gray-300">
                            Seus dados estão protegidos com criptografia de ponta e compliance LGPD
                        </p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                        <FiUsers className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold text-white mb-2">Comunidade Ativa</h3>
                        <p className="text-sm text-gray-300">
                            Junte-se a milhares de usuários que já transformaram suas vidas
                        </p>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Planos