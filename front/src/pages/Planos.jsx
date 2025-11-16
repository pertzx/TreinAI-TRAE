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
            bgClass: 'bg-gray-900 border-gray-700',
            textClass: 'text-gray-100',
            features: [
                { text: 'Treinos gerados por IA', icon: <FiTarget className="w-4 h-4" />, highlight: true },
                { text: 'Exibição de anúncios no dashboard', icon: <FiCpu className="w-4 h-4" /> },
                { text: 'Limite de 5.000 tokens por dia', icon: <FiBarChart className="w-4 h-4" /> },
                { text: 'Não permite edição de treinos', icon: <FiX className="w-4 h-4" /> },
                { text: 'Sem acesso ao NutriAI', icon: <FiX className="w-4 h-4" /> }
            ],
            limitations: [
                'Máximo 5.000 tokens/dia',
                'Sem edição de treinos',
                'Anúncios na interface',
                'Sem acesso ao NutriAI'
            ],
            exclusiveFeatures: [],
            technicalSpecs: {
                apiCalls: '5.000 tokens/dia',
            },
            buttonText: 'Começar Grátis',
            buttonClass: 'bg-gray-600 hover:bg-gray-700',
            popular: false,
            savings: null
        },
        {
            id: 'pro',
            name: 'Pro',
            price: 'R$ 39,99',
            period: '/mês',
            originalPrice: 89.99,
            description: 'Treino inteligente e personalizado',
            subtitle: 'Todos os benefícios do Free, mas com melhorias',
            icon: <FiTrendingUp className="w-8 h-8" />,
            color: 'from-blue-500 to-blue-600',
            bgClass: 'bg-gray-900 border-blue-700 border-2',
            textClass: 'text-blue-200',
            features: [
                { text: 'Todos os benefícios do Free', icon: <FiCheck className="w-4 h-4" /> },
                { text: 'Limite de 20.000 tokens por dia', icon: <FiTarget className="w-4 h-4" /> },
                { text: 'Gerenciamento completo de treinos (editar, criar, excluir)', icon: <FiCpu className="w-4 h-4" /> },
                { text: 'Sem exibição de anúncios', icon: <FiShield className="w-4 h-4" /> }
            ],
            exclusiveFeatures: [
                'Gerenciamento completo de treinos',
                'Interface sem anúncios',
                'Tokens 4x maior que o Free'
            ],
            limitations: [
                'Sem acesso ao NutriAI'
            ],
            technicalSpecs: {
                apiCalls: '20.000 tokens/dia',
            },
            buttonText: 'Assinar Pro',
            buttonClass: 'bg-blue-600 hover:bg-blue-700',
            popular: true,
            savings: null
        },
        {
            id: 'max',
            name: 'Max',
            price: 'R$ 79,99',
            period: '/mês',
            originalPrice: 199.99,
            description: 'Corpo e mente em harmonia',
            subtitle: 'Todos os benefícios do Pro + NutriAI',
            icon: <FiHeart className="w-8 h-8" />,
            color: 'from-purple-500 to-purple-600',
            bgClass: 'bg-gray-900 border-purple-700 border-2',
            textClass: 'text-purple-200',
            features: [
                { text: 'Todos os benefícios do Pro', icon: <FiCheck className="w-4 h-4" /> },
                { text: 'Acesso ao NutriAI', icon: <FiHeart className="w-4 h-4" /> },
                { text: 'Limite de 40.000 tokens por dia', icon: <FiBarChart className="w-4 h-4" /> }
            ],
            exclusiveFeatures: [
                'NutriAI - Nutricionista virtual',
                'Tokens 2x maior que o Pro',
                'Integração completa treino + nutrição'
            ],
            limitations: [],
            technicalSpecs: {
                apiCalls: '40.000 tokens/dia',
                integrations: 'APIs nutricionais',
            },
            buttonText: 'Assinar Max',
            buttonClass: 'bg-purple-600 hover:bg-purple-700',
            popular: false,
            savings: null
        },
        {
            id: 'coach',
            name: 'Coach',
            price: 'R$ 149,99',
            period: '/mês',
            originalPrice: 799.99,
            description: 'Para Personal Trainers profissionais',
            subtitle: 'Todos os benefícios do Max + ferramentas profissionais',
            icon: <FiUsers className="w-8 h-8" />,
            color: 'from-emerald-500 to-emerald-600',
            bgClass: 'bg-gray-900 border-emerald-700 border-2',
            textClass: 'text-emerald-200',
            features: [
                { text: 'Todos os benefícios do Max', icon: <FiCheck className="w-4 h-4" /> },
                { text: 'Limite de 200.000 tokens para gerenciar múltiplos alunos', icon: <FiUsers className="w-4 h-4" /> },
                { text: 'Painel exclusivo com funcionalidades profissionais', icon: <FiShield className="w-4 h-4" /> },
                { text: 'Gerenciamento de alunos (aceitar/recusar)', icon: <FiTarget className="w-4 h-4" /> },
                { text: 'Edição de treinos dos alunos', icon: <FiCpu className="w-4 h-4" /> },
                { text: 'Comunicação em tempo real com alunos', icon: <FiZap className="w-4 h-4" /> },
                { text: 'Acesso ao histórico de treinos', icon: <FiBarChart className="w-4 h-4" /> },
                { text: 'Perfil profissional visível na seção "Encontrar" > "Profissionais"', icon: <FiStar className="w-4 h-4" /> }
            ],
            exclusiveFeatures: [
                'Painel profissional exclusivo',
                'Gerenciamento de múltiplos alunos',
                'Tokens 5x maior que o Max',
                'Comunicação em tempo real',
                'Perfil profissional público',
                'Ferramentas de coaching avançadas'
            ],
            limitations: [
                'Exclusivo para profissionais certificados'
            ],
            technicalSpecs: {
                apiCalls: '200.000 tokens/dia',
            },
            buttonText: 'Assinar Coach',
            buttonClass: 'bg-emerald-600 hover:bg-emerald-700',
            popular: false,
            savings: null
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
                    <span className='text-blue-600 font-medium text-2xl'>R$0,00/mês</span>
                </p>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-9 gap-6 w-full max-w-7xl' id='planos'>

                {plans.map((plan) => (
                    <div key={plan.id} className={`${plan.popular ? 'col-span-3' : 'col-span-2'} justify-between flex flex-col rounded-3xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 shadow-xl hover:shadow-2xl p-6 sm:p-7 hover:scale-[1.02] transition-all duration-300 relative overflow-hidden ${plan.popular ? 'ring-2 ring-amber-500/60' : ''}`}>
                        {/* Badge Popular */}
                        {plan.popular && (
                            <div className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold">
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
                            <div className={`p-3 rounded-xl bg-gradient-to-r ${plan.color} text-white shadow-md shadow-black/30`}>
                                {plan.icon}
                            </div>
                            <div>
                                <h2 className={`text-xl font-bold text-white mb-1`}>
                                    {plan.name}
                                </h2>
                                <p className={`text-sm text-gray-300`}>
                                    {plan.subtitle}
                                </p>
                            </div>
                        </div>

                        {/* Pricing */}
                        <div className="mb-4">
                            <div className="flex items-baseline gap-2">
                                <span className={`text-2xl font-bold text-white`}>
                                    {plan.price}
                                </span>
                                <span className={`text-sm text-gray-400`}>
                                    {plan.period}
                                </span>
                            </div>
                            {plan.originalPrice && (
                                <div className="text-sm text-gray-500 line-through">
                                    De {plan.originalPrice}
                                </div>
                            )}
                            <p className={`text-sm text-gray-300 mt-1`}>
                                {plan.description}
                            </p>
                        </div>

                        {/* Features */}
                        <div className="mb-6">
                            <h4 className={`text-sm font-semibold text-white mb-3 flex items-center gap-2`}>
                                <FiCheck className="w-4 h-4" />
                                Funcionalidades incluídas:
                            </h4>
                            <ul className="space-y-2">
                                {plan.features.slice(0, 4).map((feature, idx) => (
                                    <li key={idx} className={`flex items-center gap-2 text-sm text-gray-200`}>
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-800 border border-gray-700">
                                            {feature.icon}
                                        </span>
                                        <span className={`${feature.highlight ? 'text-emerald-400 font-semibold' : 'text-gray-300'}`}>
                                            {feature.text}
                                        </span>
                                    </li>
                                ))}
                                {plan.features.length > 4 && (
                                    <li className={`text-xs text-gray-400`}>
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
