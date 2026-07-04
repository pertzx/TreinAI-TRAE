import React, { useEffect } from 'react'
import Header from '../components/Header'
import PublicFooter from '../components/PublicFooter'
import SmartphoneAnimation from '../components/SmartphoneAnimation'
import { motion } from 'framer-motion'
import {
    LuArrowRight, LuArrowUpRight, LuCheck, LuSparkles, LuBrain, LuUtensils,
    LuFlame, LuUsers, LuShield, LuZap, LuBadgeCheck, LuTrendingUp, LuRocket,
    LuMousePointerClick, LuDumbbell, LuTrophy
} from "react-icons/lu"
import { NavLink } from 'react-router-dom'

/* -------------------- Animações -------------------- */
const fadeInUp = {
    initial: { opacity: 0, y: 40 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
}
const staggerContainer = { animate: { transition: { staggerChildren: 0.08 } } }
const scaleIn = {
    initial: { opacity: 0, scale: 0.95, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
}

/* -------------------- Reutilizáveis -------------------- */
const Pill = ({ icon: Icon, children }) => (
    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium backdrop-blur-md border bg-white/5 border-white/15 text-slate-200">
        {Icon && <Icon className="w-4 h-4 text-blue-300" />}
        {children}
    </span>
)

const SectionHeading = ({ kicker, title, highlight, subtitle }) => (
    <div className="text-center max-w-3xl mx-auto mb-14">
        {kicker && (
            <motion.div variants={fadeInUp} className="mb-4 flex justify-center">
                <Pill icon={LuSparkles}>{kicker}</Pill>
            </motion.div>
        )}
        <motion.h2 variants={fadeInUp} className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.1]">
            {title} {highlight && <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">{highlight}</span>}
        </motion.h2>
        {subtitle && (
            <motion.p variants={fadeInUp} className="mt-5 text-lg text-slate-400 leading-relaxed">{subtitle}</motion.p>
        )}
    </div>
)

const PrimaryCTA = ({ children = 'Criar conta grátis', to = '/login', className = '' }) => (
    <NavLink to={to}>
        <motion.button
            className={`group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-8 py-4 rounded-2xl text-lg font-bold shadow-[0_8px_30px_rgba(56,123,255,0.35)] hover:shadow-[0_12px_40px_rgba(56,123,255,0.5)] transition-all ${className}`}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
        >
            {children}
            <LuArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </motion.button>
    </NavLink>
)

/* -------------------- Página -------------------- */
function Home({ logado }) {
    useEffect(() => { window.scrollTo({ top: 0 }) }, [])

    const diferenciais = [
        { icon: LuBrain, title: 'Treino montado por IA', desc: 'A IA cria um treino sob medida pro seu objetivo e adapta conforme você evolui. Sem planilha genérica.' },
        { icon: LuUtensils, title: 'NutriAI: sua dieta inteligente', desc: 'Um plano nutricional gerado por IA, ajustado às suas restrições e metas — treino e comida em sintonia.' },
        { icon: LuFlame, title: 'Evolução, recordes e streak', desc: 'Acompanhe seu progresso, bata recordes pessoais e mantenha a sequência de dias treinados.' },
        { icon: LuUsers, title: 'Acompanhado de perto', desc: 'Conecte-se a personais, nutris e fisios de verdade que orientam sua jornada dentro do app.' },
    ]

    const passos = [
        { n: '01', icon: LuRocket, title: 'Crie sua conta grátis', desc: 'Leva menos de um minuto — sem cartão de crédito.' },
        { n: '02', icon: LuMousePointerClick, title: 'Conte seu objetivo', desc: 'Diga o que você quer (emagrecer, ganhar massa, saúde) e seu nível.' },
        { n: '03', icon: LuTrendingUp, title: 'Treine — a IA cuida do resto', desc: 'Receba seu treino, execute guiado no app e veja a IA adaptar ao seu ritmo.' },
    ]

    const faq = [
        { q: 'É grátis pra começar?', a: 'Sim. Você cria a conta e já testa a IA de treino. Planos pagos liberam mais uso, o NutriAI e recursos profissionais.' },
        { q: 'Como a IA monta o meu treino?', a: 'A partir do seu objetivo, nível e histórico. Conforme você registra os treinos, ela ajusta cargas e progressão pra você.' },
        { q: 'Serve pra dieta também?', a: 'Sim — o NutriAI gera seu plano nutricional considerando suas metas e restrições (disponível nos planos com NutriAI).' },
        { q: 'Sou personal / nutri / fisio. Como funciona?', a: 'Você tem um painel pra gerenciar seus alunos, montar treino e dieta com IA em segundos e um perfil público pra ser encontrado.' },
        { q: 'Posso cancelar quando quiser?', a: 'Pode. Sem fidelidade — você gerencia ou cancela seu plano a qualquer momento nas configurações.' },
    ]

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#070a12] text-white">
            {/* Fundo decorativo */}
            <div className="pointer-events-none fixed inset-0 -z-0">
                <div className="absolute -top-40 -left-40 w-[40rem] h-[40rem] rounded-full bg-blue-600/20 blur-[120px]" />
                <div className="absolute top-1/3 -right-40 w-[36rem] h-[36rem] rounded-full bg-cyan-500/10 blur-[120px]" />
                <div className="absolute bottom-0 left-1/4 w-[34rem] h-[34rem] rounded-full bg-indigo-500/10 blur-[120px]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(56,123,255,0.12),transparent_60%)]" />
            </div>

            <div className="relative z-10">
                {/* ===== HERO ===== */}
                <motion.section
                    className="flex pt-36 md:pt-44 pb-16 gap-y-12 md:gap-y-0 items-center md:gap-12 flex-col md:flex-row md:justify-center min-h-screen px-5 md:px-10 max-w-7xl mx-auto"
                    initial="initial" animate="animate" variants={staggerContainer}
                >
                    <motion.div className="w-full md:w-1/2 flex flex-col gap-y-7" variants={fadeInUp}>
                        <Header logado={logado} />

                        <motion.div variants={fadeInUp}>
                            <Pill icon={LuBrain}>Treino + dieta com inteligência artificial</Pill>
                        </motion.div>

                        <motion.h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]" variants={fadeInUp}>
                            Treine com{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400">inteligência</span>.
                            <br className="hidden sm:block" /> Evolua de verdade.
                        </motion.h1>

                        <motion.p className="text-lg text-slate-300/90 max-w-xl leading-relaxed" variants={fadeInUp}>
                            O <span className="text-white font-semibold">TreinAI</span> monta seu treino personalizado por IA,
                            cria sua dieta com o <span className="text-white font-semibold">NutriAI</span> e acompanha sua evolução,
                            recordes e sequência. Comece de graça.
                        </motion.p>

                        <motion.div className="flex flex-col sm:flex-row gap-4 pt-2" variants={fadeInUp}>
                            <PrimaryCTA>Começar grátis</PrimaryCTA>
                            {logado && (
                                <NavLink to="/dashboard">
                                    <motion.button
                                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/20 bg-white/5 backdrop-blur-md text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-white/10 transition-all"
                                        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                                    >
                                        Ir para o painel
                                    </motion.button>
                                </NavLink>
                            )}
                        </motion.div>

                        <motion.div className="flex flex-wrap items-center gap-x-8 gap-y-3 pt-3 text-sm text-slate-400" variants={fadeInUp}>
                            <span className="inline-flex items-center gap-2"><LuBadgeCheck className="w-4 h-4 text-blue-300" /> Grátis pra começar</span>
                            <span className="inline-flex items-center gap-2"><LuShield className="w-4 h-4 text-blue-300" /> Sem cartão</span>
                            <span className="inline-flex items-center gap-2"><LuZap className="w-4 h-4 text-blue-300" /> Cancele quando quiser</span>
                        </motion.div>
                    </motion.div>

                    <motion.div className="relative" variants={scaleIn}>
                        <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-blue-500/20 to-cyan-400/20 blur-3xl rounded-full" />
                        <SmartphoneAnimation />
                    </motion.div>
                </motion.section>

                {/* ===== DIFERENCIAIS ===== */}
                <motion.section className="py-24 px-5 md:px-10" initial="initial" whileInView="animate" viewport={{ once: true, amount: 0.15 }} variants={staggerContainer}>
                    <div className="max-w-7xl mx-auto">
                        <SectionHeading
                            kicker="Por que TreinAI"
                            title="Tudo que você precisa pra"
                            highlight="treinar melhor"
                            subtitle="Menos achismo, mais resultado. A IA cuida do plano, você cuida de aparecer."
                        />
                        <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" variants={staggerContainer}>
                            {diferenciais.map((f, i) => (
                                <motion.div key={i} variants={scaleIn} whileHover={{ y: -6 }}
                                    className="group relative rounded-2xl p-7 bg-white/[0.03] border border-white/10 hover:border-blue-400/30 backdrop-blur-xl transition-all overflow-hidden">
                                    <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-400/0 group-hover:bg-blue-400/10 blur-2xl rounded-full transition-all" />
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-400/20 flex items-center justify-center mb-5">
                                        <f.icon className="w-6 h-6 text-blue-300" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </motion.section>

                {/* ===== COMO FUNCIONA ===== */}
                <motion.section className="py-24 px-5 md:px-10" initial="initial" whileInView="animate" viewport={{ once: true, amount: 0.2 }} variants={staggerContainer}>
                    <div className="max-w-6xl mx-auto">
                        <SectionHeading kicker="Simples e rápido" title="Do zero ao treino em" highlight="3 passos" />
                        <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6" variants={staggerContainer}>
                            {passos.map((step, i) => (
                                <motion.div key={i} variants={scaleIn} className="relative rounded-2xl p-8 bg-white/[0.03] border border-white/10 backdrop-blur-xl">
                                    <span className="text-6xl font-bold text-white/5 absolute top-4 right-6 select-none">{step.n}</span>
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-5 shadow-lg">
                                        <step.icon className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
                                </motion.div>
                            ))}
                        </motion.div>
                        <div className="flex justify-center mt-12"><PrimaryCTA /></div>
                    </div>
                </motion.section>

                {/* ===== PARA PROFISSIONAIS ===== */}
                <motion.section className="py-24 px-5 md:px-10" initial="initial" whileInView="animate" viewport={{ once: true, amount: 0.15 }} variants={staggerContainer}>
                    <div className="max-w-6xl mx-auto">
                        <motion.div variants={scaleIn} className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent backdrop-blur-xl p-10 md:p-14">
                            <div className="grid md:grid-cols-2 gap-10 items-center">
                                <div>
                                    <div className="mb-4"><Pill icon={LuTrophy}>Para profissionais</Pill></div>
                                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                                        É personal, nutri ou fisio?{' '}
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Traga seus alunos.</span>
                                    </h2>
                                    <p className="mt-4 text-slate-300 leading-relaxed">
                                        Monte treino e dieta com IA em segundos, acompanhe cada aluno num painel só e ganhe um
                                        perfil público pra ser encontrado. Menos trabalho manual, mais alunos atendidos.
                                    </p>
                                    <div className="mt-7"><PrimaryCTA to="/login">Sou profissional</PrimaryCTA></div>
                                </div>
                                <ul className="space-y-4">
                                    {[
                                        'Painel exclusivo pra gerenciar seus alunos',
                                        'Gere treino e dieta com IA e reaproveite templates',
                                        'Perfil público na busca — seja encontrado',
                                        'Notas privadas e anamnese de cada aluno',
                                    ].map((b, i) => (
                                        <li key={i} className="flex items-start gap-3 text-slate-200">
                                            <LuCheck className="w-5 h-5 mt-0.5 flex-shrink-0 text-blue-400" />
                                            <span className="leading-relaxed">{b}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </motion.div>
                    </div>
                </motion.section>

                {/* ===== FAQ ===== */}
                <motion.section className="py-24 px-5 md:px-10" initial="initial" whileInView="animate" viewport={{ once: true, amount: 0.2 }} variants={staggerContainer}>
                    <div className="max-w-4xl mx-auto">
                        <SectionHeading kicker="Tire suas dúvidas" title="Perguntas" highlight="frequentes" />
                        <motion.div className="space-y-4" variants={staggerContainer}>
                            {faq.map((f, i) => (
                                <motion.details key={i} variants={scaleIn} className="group rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl overflow-hidden">
                                    <summary className="flex items-center justify-between cursor-pointer p-6 text-white font-semibold list-none">
                                        {f.q}
                                        <LuArrowRight className="w-5 h-5 text-blue-300 transition-transform group-open:rotate-90" />
                                    </summary>
                                    <div className="px-6 pb-6 text-slate-400 leading-relaxed">{f.a}</div>
                                </motion.details>
                            ))}
                        </motion.div>
                    </div>
                </motion.section>

                {/* ===== CTA FINAL ===== */}
                <motion.section className="py-24 px-5 md:px-10" initial="initial" whileInView="animate" viewport={{ once: true }} variants={staggerContainer}>
                    <motion.div className="max-w-5xl mx-auto relative rounded-3xl overflow-hidden border border-blue-400/20 p-12 md:p-16 text-center" variants={fadeInUp}>
                        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-500/15 via-cyan-600/10 to-transparent" />
                        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(56,123,255,0.18),transparent_60%)]" />
                        <motion.h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-[1.05]" variants={fadeInUp}>
                            Pronto pra treinar com{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">inteligência</span>?
                        </motion.h2>
                        <motion.p className="text-lg text-slate-300 mt-5 max-w-2xl mx-auto" variants={fadeInUp}>
                            Crie sua conta grátis e receba seu primeiro treino por IA hoje.
                        </motion.p>
                        <motion.div className="mt-9 flex justify-center" variants={fadeInUp}>
                            <PrimaryCTA className="px-10">Começar grátis</PrimaryCTA>
                        </motion.div>
                        <motion.p className="mt-6 text-sm text-slate-400" variants={fadeInUp}>
                            Grátis pra começar · Sem cartão · Cancele quando quiser
                        </motion.p>
                    </motion.div>
                </motion.section>

                <PublicFooter initialMinimized={false} />
            </div>
        </div>
    )
}

export default Home
