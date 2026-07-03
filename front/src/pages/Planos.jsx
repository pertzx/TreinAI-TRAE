import React, { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useNavigate } from 'react-router-dom';
import PublicFooter from '../components/PublicFooter';
import api from '../Api.js';
import { FiCheck, FiX, FiStar, FiUsers, FiTrendingUp, FiZap, FiHeart, FiShield, FiCpu } from 'react-icons/fi';

// Apresentação por acento/plano (cores/ícone ficam no front; o resto vem da API).
const ACCENTS = {
  gray: { icon: <FiZap className="w-8 h-8" />, color: 'from-gray-500 to-gray-600', button: 'bg-gray-600 hover:bg-gray-700' },
  blue: { icon: <FiTrendingUp className="w-8 h-8" />, color: 'from-blue-500 to-blue-600', button: 'bg-blue-600 hover:bg-blue-700' },
  purple: { icon: <FiHeart className="w-8 h-8" />, color: 'from-purple-500 to-purple-600', button: 'bg-purple-600 hover:bg-purple-700' },
  emerald: { icon: <FiUsers className="w-8 h-8" />, color: 'from-emerald-500 to-emerald-600', button: 'bg-emerald-600 hover:bg-emerald-700' },
};

const formatBRL = (v) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;

function Planos({ setPlano, setNeedToPay }) {
    const navigate = useNavigate()
    const [plans, setPlans] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    const handleBack = () => navigate("/");

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await api.get('/plans');
                if (!cancelled) setPlans(Array.isArray(res?.data?.plans) ? res.data.plans : []);
            } catch (e) {
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const priceLabel = (plan) => (Number(plan.priceBRL) > 0 ? formatBRL(plan.priceBRL) : 'Grátis');

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

            {loading && (
                <div className="text-gray-400 text-sm py-20">Carregando planos...</div>
            )}

            {!loading && error && (
                <div className="text-center py-20">
                    <p className="text-red-400 text-sm mb-3">Não foi possível carregar os planos agora.</p>
                    <button onClick={() => window.location.reload()} className="text-blue-400 underline text-sm">
                        Tentar novamente
                    </button>
                </div>
            )}

            {!loading && !error && (
            <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-9 gap-6 w-full max-w-7xl' id='planos'>
                {plans.map((plan) => {
                    const accent = ACCENTS[plan.accent] || ACCENTS.blue;
                    return (
                    <div key={plan.key} className={`${plan.popular ? 'col-span-3' : 'col-span-2'} justify-between flex flex-col rounded-3xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 shadow-xl hover:shadow-2xl p-6 sm:p-7 hover:scale-[1.02] transition-all duration-300 relative overflow-hidden ${plan.popular ? 'ring-2 ring-amber-500/60' : ''}`}>
                        {/* Badge Popular */}
                        {plan.popular && (
                            <div className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                                <FiStar className="w-3 h-3 inline mr-1" />
                                POPULAR
                            </div>
                        )}

                        {/* Header */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`p-3 rounded-xl bg-gradient-to-r ${accent.color} text-white shadow-md shadow-black/30`}>
                                {accent.icon}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white mb-1">{plan.name}</h2>
                                <p className="text-sm text-gray-300">{plan.subtitle}</p>
                            </div>
                        </div>

                        {/* Pricing */}
                        <div className="mb-4">
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-white">{priceLabel(plan)}</span>
                                <span className="text-sm text-gray-400">{plan.periodLabel}</span>
                            </div>
                            {plan.originalPriceBRL ? (
                                <div className="text-sm text-gray-500 line-through">De {formatBRL(plan.originalPriceBRL)}</div>
                            ) : null}
                            <p className="text-sm text-gray-300 mt-1">{plan.description}</p>
                        </div>

                        {/* Features */}
                        <div className="mb-6 flex-1">
                            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                <FiShield className="w-4 h-4" />
                                O que está incluído:
                            </h4>
                            <ul className="space-y-2">
                                {(plan.features || []).map((feature, idx) => (
                                    <li key={idx} className="flex items-center gap-2 text-sm">
                                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md border ${feature.included ? 'bg-gray-800 border-gray-700' : 'bg-gray-900 border-gray-800'}`}>
                                            {feature.included
                                                ? <FiCheck className="w-4 h-4 text-emerald-400" />
                                                : <FiX className="w-4 h-4 text-gray-600" />}
                                        </span>
                                        <span className={`${!feature.included ? 'text-gray-500 line-through' : feature.highlight ? 'text-emerald-400 font-semibold' : 'text-gray-300'}`}>
                                            {feature.text}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Action Button */}
                        <NavLink to="/login">
                            <button
                                onClick={() => {
                                    setPlano?.(plan.key);
                                    if (plan.key !== 'free') setNeedToPay?.(true);
                                }}
                                className={`w-full ${accent.button} text-white rounded-lg py-3 px-4 font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg`}
                            >
                                {plan.buttonText || 'Assinar'}
                            </button>
                        </NavLink>
                    </div>
                    );
                })}
            </div>
            )}

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
            <PublicFooter initialMinimized={false} />
        </section>
    )
}

export default Planos
