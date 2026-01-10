import React, { useRef } from 'react'
import Header from '../components/Header'
import PublicFooter from '../components/PublicFooter'
import SmartphoneAnimation from '../components/SmartphoneAnimation'
import { motion } from 'framer-motion'
import {
    LuBadgeCheck, LuBellRing, LuCalendarDays, LuArrowUpRight,
    LuAmbulance, LuSunDim, LuTvMinimal, LuBadgeDollarSign,
    LuBrain, LuTarget, LuTrendingUp, LuUsers, LuShield, LuZap,
    LuHeart, LuClock, LuStar, LuAward, LuChartBar, LuSmartphone
} from "react-icons/lu"
import { NavLink } from 'react-router-dom'
import { useState } from 'react'

// Animações de entrada
const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: "easeOut" }
}

const staggerContainer = {
    animate: {
        transition: {
            staggerChildren: 0.1
        }
    }
}

const scaleIn = {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.5, ease: "easeOut" }
}

function Home({logado}) {
    const titleRef = useRef(null)
    useState(() => {
        setTimeout(() => {
            if (titleRef.current) {
                titleRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
        }, 1000)
    }, [])
    return (
        <div className='min-h-screen bg-gradient-to-br from-blue-900 via-[#10151e] to-blue-600'>
            {/* HERO SECTION */}
            <motion.section 
                className='flex pt-40 gap-y-10 md:gap-y-0 items-center md:gap-10 flex-col md:justify-center md:flex-row min-h-screen px-4 md:px-8'
                initial="initial"
                animate="animate"
                variants={staggerContainer}
            >
                <motion.div 
                    className='w-full md:w-1/2 flex flex-col gap-y-10 items-center md:items-start h-full justify-around'
                    variants={fadeInUp}
                >
                    <Header logado={logado} />
                    <div className='flex flex-col items-center text-center md:items-start md:text-start gap-6'>
                        <motion.h1 
                            className='text-5xl md:text-7xl font-bold text-white leading-tight'
                            variants={fadeInUp}
                            ref={titleRef}
                        >
                            Seu <span className='text-blue-500 bg-clip-text'>coach digital</span> pessoal
                        </motion.h1>
                        <motion.p 
                            className='text-xl font-medium w-full text-gray-300 max-w-lg leading-relaxed'
                            variants={fadeInUp}
                        >
                            Transforme seu corpo com treinos personalizados por IA. Alcance seus objetivos com orientação profissional 24/7.
                        </motion.p>
                        <motion.div 
                            className='flex flex-col sm:flex-row gap-4 mt-6'
                            variants={fadeInUp}
                        >
                            <NavLink to="/planos">
                                <motion.button 
                                    className='bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl text-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105'
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Comece Grátis
                                </motion.button>
                            </NavLink>
                            <NavLink to="/sobre">
                                <motion.button 
                                    className='border-2 border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white px-8 py-4 rounded-xl text-xl font-semibold transition-all duration-300'
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Saiba Mais
                                </motion.button>
                            </NavLink>
                        </motion.div>
                    </div>
                </motion.div>
                <motion.div variants={scaleIn}>
                    <SmartphoneAnimation />
                </motion.div>
            </motion.section>

            {/* RECURSOS PRINCIPAIS */}
            <motion.section 
                className='py-20 px-4 md:px-8'
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                variants={staggerContainer}
            >
                <motion.div 
                    className='max-w-7xl mx-auto'
                    variants={fadeInUp}
                >
                    <div className='text-center mb-16'>
                        <motion.h2 
                            className='text-4xl md:text-5xl font-bold text-white mb-6'
                            variants={fadeInUp}
                        >
                            Por que escolher o <span className='text-blue-400'>TreinAI</span>?
                        </motion.h2>
                        <motion.p 
                            className='text-xl text-gray-300 max-w-3xl mx-auto'
                            variants={fadeInUp}
                        >
                            Nossa plataforma combina inteligência artificial avançada com conhecimento científico para criar a experiência de treino mais personalizada do mercado.
                        </motion.p>
                    </div>

                    <motion.div 
                        className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'
                        variants={staggerContainer}
                    >
                        {[
                            {
                                icon: LuBrain,
                                title: "IA Personalizada",
                                description: "Algoritmos avançados que aprendem com seus treinos e se adaptam ao seu progresso em tempo real."
                            },
                            {
                                icon: LuTarget,
                                title: "Objetivos Específicos",
                                description: "Planos focados em seus objetivos: perda de peso, ganho de massa, resistência ou reabilitação."
                            },
                            {
                                icon: LuTrendingUp,
                                title: "Progresso Visível",
                                description: "Acompanhe sua evolução com gráficos detalhados e métricas precisas de performance."
                            },
                            {
                                icon: LuUsers,
                                title: "Comunidade Ativa",
                                description: "Conecte-se com outros usuários, compartilhe conquistas e mantenha-se motivado."
                            },
                            {
                                icon: LuShield,
                                title: "Segurança Total",
                                description: "Exercícios validados por profissionais e adaptados para prevenir lesões."
                            },
                            {
                                icon: LuZap,
                                title: "Resultados Rápidos",
                                description: "Veja mudanças significativas em apenas 4 semanas com nossos métodos otimizados."
                            }
                        ].map((feature, index) => (
                            <motion.div
                                key={index}
                                className='bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20 hover:bg-white/15 transition-all duration-300 group'
                                variants={scaleIn}
                                whileHover={{ y: -5 }}
                            >
                                <feature.icon className='text-blue-400 text-4xl mb-4 group-hover:scale-110 transition-transform duration-300' />
                                <h3 className='text-xl font-bold text-white mb-3'>{feature.title}</h3>
                                <p className='text-gray-300 leading-relaxed'>{feature.description}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.div>
            </motion.section>

            {/* ESTATÍSTICAS */}
            <motion.section 
                className='py-20 px-4 md:px-8 bg-blue-600/10'
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                variants={staggerContainer}
            >
                <motion.div 
                    className='max-w-6xl mx-auto text-center'
                    variants={fadeInUp}
                >
                    <motion.h2 
                        className='text-4xl md:text-5xl font-bold text-white mb-16'
                        variants={fadeInUp}
                    >
                        Resultados que <span className='text-blue-400'>impressionam</span>
                    </motion.h2>
                    
                    <motion.div 
                        className='grid grid-cols-2 md:grid-cols-4 gap-8'
                        variants={staggerContainer}
                    >
                        {[
                            { number: "5K+", label: "Usuários Ativos", icon: LuUsers },
                            { number: "100K+", label: "Treinos Realizados", icon: LuChartBar },
                            { number: "95%", label: "Taxa de Satisfação", icon: LuStar },
                            { number: "4.8", label: "Avaliação Média", icon: LuAward }
                        ].map((stat, index) => (
                            <motion.div
                                key={index}
                                className='text-center group'
                                variants={scaleIn}
                            >
                                <stat.icon className='text-blue-400 text-3xl mx-auto mb-4 group-hover:scale-110 transition-transform duration-300' />
                                <motion.div 
                                    className='text-4xl md:text-5xl font-bold text-white mb-2'
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                >
                                    {stat.number}
                                </motion.div>
                                <p className='text-gray-300 font-medium'>{stat.label}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.div>
            </motion.section>

            {/* CASOS DE USO */}
            <motion.section 
                className='py-20 px-4 md:px-8'
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                variants={staggerContainer}
            >
                <motion.div 
                    className='max-w-7xl mx-auto'
                    variants={fadeInUp}
                >
                    <div className='text-center mb-16'>
                        <motion.h2 
                            className='text-4xl md:text-5xl font-bold text-white mb-6'
                            variants={fadeInUp}
                        >
                            Para todos os <span className='text-blue-400'>perfis</span>
                        </motion.h2>
                        <motion.p 
                            className='text-xl text-gray-300 max-w-3xl mx-auto'
                            variants={fadeInUp}
                        >
                            Seja você iniciante ou atleta experiente, nosso sistema se adapta ao seu nível e necessidades específicas.
                        </motion.p>
                    </div>

                    <motion.div 
                        className='grid grid-cols-1 md:grid-cols-2 gap-12 items-center'
                        variants={staggerContainer}
                    >
                        <motion.div 
                            className='space-y-8'
                            variants={fadeInUp}
                        >
                            {[
                                {
                                    icon: LuHeart,
                                    title: "Iniciantes",
                                    description: "Comece sua jornada fitness com segurança. Exercícios básicos e progressão gradual."
                                },
                                {
                                    icon: LuClock,
                                    title: "Pessoas Ocupadas",
                                    description: "Treinos eficientes de 15-45 minutos que se encaixam na sua rotina corrida."
                                },
                                {
                                    icon: LuTarget,
                                    title: "Atletas Avançados",
                                    description: "Periodização avançada e treinos específicos para maximizar performance."
                                }
                            ].map((useCase, index) => (
                                <motion.div
                                    key={index}
                                    className='flex items-start gap-4 p-6 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300'
                                    variants={scaleIn}
                                    whileHover={{ x: 10 }}
                                >
                                    <useCase.icon className='text-blue-400 text-2xl mt-1 flex-shrink-0' />
                                    <div>
                                        <h3 className='text-xl font-bold text-white mb-2'>{useCase.title}</h3>
                                        <p className='text-gray-300'>{useCase.description}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>

                        <motion.div 
                            className='relative'
                            variants={scaleIn}
                        >
                            <div className='aspect-square bg-gradient-to-br from-green-500/80 to-blue-600 rounded-3xl p-8 flex items-center justify-center'>
                                <LuSmartphone className='text-white text-8xl' />
                            </div>
                            <div className='absolute -top-4 -right-4 bg-green-500 text-white px-4 py-2 rounded-full font-bold'>
                                Disponível 24/7
                            </div>
                        </motion.div>
                    </motion.div>
                </motion.div>
            </motion.section>

            {/* DEPOIMENTOS */}
            <motion.section 
                className='py-20 px-4 md:px-8 bg-white/5'
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                variants={staggerContainer}
            >
                <motion.div 
                    className='max-w-6xl mx-auto'
                    variants={fadeInUp}
                >
                    <motion.h2 
                        className='text-4xl md:text-5xl font-bold text-white text-center mb-16'
                        variants={fadeInUp}
                    >
                        O que nossos usuários <span className='text-blue-400'>dizem</span>
                    </motion.h2>
                    
                    <motion.div 
                        className='grid grid-cols-1 md:grid-cols-3 gap-8'
                        variants={staggerContainer}
                    >
                        {[
                            {
                                name: "Maria Silva",
                                role: "Empresária",
                                text: "Perdi 15kg em 6 meses! O TreinAI se adaptou perfeitamente à minha rotina corrida.",
                                rating: 5
                            },
                            {
                                name: "João Santos",
                                role: "Estudante",
                                text: "Como iniciante, me senti seguro desde o primeiro dia. Os treinos são claros e eficazes.",
                                rating: 5
                            },
                            {
                                name: "Ana Costa",
                                role: "Atleta",
                                text: "A personalização é incrível! Melhorei minha performance em competições.",
                                rating: 5
                            }
                        ].map((testimonial, index) => (
                            <motion.div
                                key={index}
                                className='bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20'
                                variants={scaleIn}
                            >
                                <div className='flex mb-4'>
                                    {[...Array(testimonial.rating)].map((_, i) => (
                                        <LuStar key={i} className='text-yellow-400 text-xl fill-current' />
                                    ))}
                                </div>
                                <p className='text-gray-300 mb-6 italic'>"{testimonial.text}"</p>
                                <div>
                                    <p className='text-white font-bold'>{testimonial.name}</p>
                                    <p className='text-blue-400'>{testimonial.role}</p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.div>
            </motion.section>

            {/* FAQ */}
            <motion.section 
                className='py-20 px-4 md:px-8'
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                variants={staggerContainer}
            >
                <motion.div 
                    className='max-w-4xl mx-auto'
                    variants={fadeInUp}
                >
                    <motion.h2 
                        className='text-4xl md:text-5xl font-bold text-white text-center mb-16'
                        variants={fadeInUp}
                    >
                        Perguntas <span className='text-blue-400'>Frequentes</span>
                    </motion.h2>
                    
                    <motion.div 
                        className='space-y-6'
                        variants={staggerContainer}
                    >
                        {[
                            {
                                question: "Como funciona a personalização dos treinos?",
                                answer: "Nossa IA analisa seu perfil, objetivos, histórico e feedback para criar treinos únicos que evoluem com você."
                            },
                            {
                                question: "Preciso de equipamentos especiais?",
                                answer: "Não! Oferecemos treinos para casa, academia ou ao ar livre. Você escolhe o que tem disponível."
                            },
                            {
                                question: "Quanto tempo leva para ver resultados?",
                                answer: "A maioria dos usuários vê mudanças significativas em 4-6 semanas com consistência nos treinos."
                            },
                            {
                                question: "Posso cancelar a qualquer momento?",
                                answer: "Sim! Não há fidelidade. Você pode cancelar sua assinatura a qualquer momento pelo app."
                            }
                        ].map((faq, index) => (
                            <motion.div
                                key={index}
                                className='bg-white/5 rounded-xl border border-white/10 overflow-hidden'
                                variants={scaleIn}
                            >
                                <div className='p-6'>
                                    <h3 className='text-xl font-bold text-white mb-3'>{faq.question}</h3>
                                    <p className='text-gray-300'>{faq.answer}</p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.div>
            </motion.section>

            {/* CTA FINAL */}
            <motion.section 
                className='py-20 px-4 md:px-8 bg-gradient-to-b from-blue-500/0 to-green-500'
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                variants={staggerContainer}
            >
                <motion.div 
                    className='max-w-4xl mx-auto text-center'
                    variants={fadeInUp}
                >
                    <motion.h2 
                        className='text-4xl md:text-6xl font-bold text-white mb-6'
                        variants={fadeInUp}
                    >
                        Comece sua transformação <span className='text-yellow-300'>hoje</span>
                    </motion.h2>
                    <motion.p 
                        className='text-xl text-blue-100 mb-8 max-w-2xl mx-auto'
                        variants={fadeInUp}
                    >
                        Junte-se a milhares de pessoas que já transformaram suas vidas com o TreinAI. 
                        Teste agora mesmo gratuitamente.
                    </motion.p>
                    
                    <motion.div 
                        className='flex flex-col sm:flex-row gap-4 justify-center items-center'
                        variants={fadeInUp}
                    >
                        <NavLink to="/planos">
                            <motion.button 
                                className='bg-white text-green-500 px-10 py-4 rounded-xl text-xl font-bold hover:bg-gray-100 transition-all duration-300 shadow-lg'
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Começar Teste Grátis
                            </motion.button>
                        </NavLink>
                        <p className='text-blue-100 text-sm'>
                            💳 Transferencia segura • ⚡ Ativação instantânea
                        </p>
                    </motion.div>
                    
                    <motion.div 
                        className='mt-12 text-blue-100 text-sm'
                        variants={fadeInUp}
                    >
                        <p>A partir de <span className='text-yellow-300 font-bold text-lg'>R$ 0,00/mês</span></p>
                        <p>Cancele quando quiser • Suporte 24/7</p>
                    </motion.div>
                </motion.div>
            </motion.section>
            <PublicFooter initialMinimized={false} />
        </div>
    )
}

export default Home
