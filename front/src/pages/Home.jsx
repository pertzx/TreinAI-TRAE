import React, { useEffect } from 'react'
import Header from '../components/Header'
import PublicFooter from '../components/PublicFooter'
import SmartphoneAnimation from '../components/SmartphoneAnimation'
import { motion } from 'framer-motion'
import {
    LuMegaphone, LuStore, LuDumbbell, LuArrowRight, LuArrowUpRight,
    LuCheck, LuSparkles, LuCrown, LuQuote, LuRocket, LuWallet, LuEye,
    LuMousePointerClick, LuBrain, LuTarget, LuTrendingUp, LuUsers,
    LuShield, LuZap, LuStar, LuAward, LuChartNoAxesCombined,
    LuSmartphone, LuBadgeCheck, LuClock, LuCalendarDays, LuGauge
} from "react-icons/lu"
import { NavLink } from 'react-router-dom'

/* ------------------------------------------------------------------ */
/* Animações                                                           */
/* ------------------------------------------------------------------ */
const fadeInUp = {
    initial: { opacity: 0, y: 40 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
}
const staggerContainer = {
    animate: { transition: { staggerChildren: 0.08 } }
}
const scaleIn = {
    initial: { opacity: 0, scale: 0.95, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
}

/* ------------------------------------------------------------------ */
/* Componentes premium reutilizáveis                                   */
/* ------------------------------------------------------------------ */
const Pill = ({ icon: Icon, children, gold }) => (
    <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium backdrop-blur-md border ${gold
        ? 'bg-amber-400/10 border-amber-300/30 text-amber-200'
        : 'bg-white/5 border-white/15 text-slate-200'}`}>
        {Icon && <Icon className="w-4 h-4" />}
        {children}
    </span>
)

const SectionHeading = ({ kicker, title, highlight, subtitle, gold }) => (
    <div className="text-center max-w-3xl mx-auto mb-14">
        {kicker && (
            <motion.div variants={fadeInUp} className="mb-4 flex justify-center">
                <Pill gold={gold} icon={LuSparkles}>{kicker}</Pill>
            </motion.div>
        )}
        <motion.h2 variants={fadeInUp} className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.1]">
            {title} {highlight && <span className={gold ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-400' : 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300'}>{highlight}</span>}
        </motion.h2>
        {subtitle && (
            <motion.p variants={fadeInUp} className="mt-5 text-lg text-slate-400 leading-relaxed">
                {subtitle}
            </motion.p>
        )}
    </div>
)

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */
function Home({ logado }) {
    useEffect(() => { window.scrollTo({ top: 0 }) }, [])

    const pilares = [
        {
            destaque: true,
            tag: 'Foco principal',
            icon: LuMegaphone,
            color: 'from-amber-400 to-orange-500',
            ring: 'ring-amber-300/40',
            title: 'Profissionais',
            desc: 'Personais, nutricionistas e fisioterapeutas que querem crescer.',
            bullets: [
                'Gerencie e impulsione seus anúncios',
                'Acompanhe e oriente seus alunos',
                'Métricas de impressões e cliques em tempo real',
            ],
            cta: 'Sou profissional',
            to: '/login',
        },
        {
            icon: LuDumbbell,
            color: 'from-blue-500 to-cyan-500',
            ring: 'ring-blue-400/30',
            title: 'Alunos',
            desc: 'Quem quer treinar com inteligência e resultado.',
            bullets: [
                'Treinos personalizados por IA',
                'Acompanhamento da evolução',
                'Contato direto com profissionais',
            ],
            cta: 'Quero treinar',
            to: '/login',
        },
        {
            icon: LuStore,
            color: 'from-emerald-500 to-teal-500',
            ring: 'ring-emerald-400/30',
            title: 'Comerciantes',
            desc: 'Lojas e estabelecimentos que querem visibilidade.',
            bullets: [
                'Divulgue seu negócio na plataforma',
                'Alcance um público fitness qualificado',
                'Anúncios geolocalizados',
            ],
            cta: 'Quero anunciar',
            to: '/login',
        },
    ]

    const featuresProf = [
        { icon: LuMegaphone, title: 'Gestão de anúncios', desc: 'Crie, edite e impulsione campanhas. Compre saldo de impressões e controle tudo num painel só.' },
        { icon: LuChartNoAxesCombined, title: 'Analytics em tempo real', desc: 'Acompanhe impressões, cliques e desempenho de cada anúncio com dados sempre atualizados.' },
        { icon: LuUsers, title: 'Gestão de alunos', desc: 'Aceite solicitações, organize sua carteira de clientes e centralize a comunicação.' },
        { icon: LuBrain, title: 'IA a seu favor', desc: 'Gere treinos e planos com IA para entregar mais valor aos seus alunos em menos tempo.' },
        { icon: LuCalendarDays, title: 'Notas e anamnese', desc: 'Registre observações privadas e veja a anamnese de cada aluno para um plano sob medida.' },
        { icon: LuWallet, title: 'Templates reutilizáveis', desc: 'Salve modelos de treino e dieta e aplique em vários alunos com poucos cliques.' },
    ]

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#070a12] text-white">
            {/* ---------- Fundo decorativo premium ---------- */}
            <div className="pointer-events-none fixed inset-0 -z-0">
                <div className="absolute -top-40 -left-40 w-[40rem] h-[40rem] rounded-full bg-blue-600/20 blur-[120px]" />
                <div className="absolute top-1/3 -right-40 w-[36rem] h-[36rem] rounded-full bg-amber-500/10 blur-[120px]" />
                <div className="absolute bottom-0 left-1/4 w-[34rem] h-[34rem] rounded-full bg-cyan-500/10 blur-[120px]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(56,123,255,0.12),transparent_60%)]" />
            </div>

            <div className="relative z-10">
                {/* ================= HERO ================= */}
                <motion.section
                    className="flex pt-36 md:pt-44 pb-16 gap-y-12 md:gap-y-0 items-center md:gap-12 flex-col md:flex-row md:justify-center min-h-screen px-5 md:px-10 max-w-7xl mx-auto"
                    initial="initial"
                    animate="animate"
                    variants={staggerContainer}
                >
                    <motion.div className="w-full md:w-1/2 flex flex-col gap-y-8" variants={fadeInUp}>
                        <Header logado={logado} />

                        <motion.div variants={fadeInUp}>
                            <Pill gold icon={LuCrown}>Plataforma premium para o universo fitness</Pill>
                        </motion.div>

                        <motion.h1
                            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]"
                            variants={fadeInUp}
                        >
                            Gerencie seus{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-300 to-orange-400">anúncios</span>{' '}
                            e clientes num só lugar
                        </motion.h1>

                        <motion.p className="text-lg text-slate-300/90 max-w-xl leading-relaxed" variants={fadeInUp}>
                            O <span className="text-white font-semibold">TreinAI</span> é o painel premium dos profissionais fitness para
                            divulgar serviços, acompanhar alunos e crescer — com inteligência artificial e dados em tempo real.
                        </motion.p>

                        <motion.div className="flex flex-col sm:flex-row gap-4 pt-2" variants={fadeInUp}>
                            <NavLink to="/login">
                                <motion.button
                                    className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-300 to-amber-500 text-slate-900 px-8 py-4 rounded-2xl text-lg font-semibold shadow-[0_8px_30px_rgba(245,180,40,0.35)] hover:shadow-[0_12px_40px_rgba(245,180,40,0.5)] transition-all"
                                    whileHover={{ scale: 1.04 }}
                                    whileTap={{ scale: 0.97 }}
                                >
                                    Começar agora
                                    <LuArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </motion.button>
                            </NavLink>
                            <NavLink to="/sobre">
                                <motion.button
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/20 bg-white/5 backdrop-blur-md text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-white/10 transition-all"
                                    whileHover={{ scale: 1.04 }}
                                    whileTap={{ scale: 0.97 }}
                                >
                                    Saiba mais
                                </motion.button>
                            </NavLink>
                        </motion.div>

                        {/* Trust row */}
                        <motion.div className="flex flex-wrap items-center gap-x-8 gap-y-3 pt-4 text-sm text-slate-400" variants={fadeInUp}>
                            <span className="inline-flex items-center gap-2"><LuBadgeCheck className="w-4 h-4 text-amber-300" /> Sem fidelidade</span>
                            <span className="inline-flex items-center gap-2"><LuShield className="w-4 h-4 text-amber-300" /> Pagamento seguro</span>
                            <span className="inline-flex items-center gap-2"><LuZap className="w-4 h-4 text-amber-300" /> Ativação instantânea</span>
                        </motion.div>
                    </motion.div>

                    <motion.div className="relative" variants={scaleIn}>
                        <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-blue-500/20 to-amber-400/20 blur-3xl rounded-full" />
                        <SmartphoneAnimation />
                    </motion.div>
                </motion.section>

                {/* ================= 3 PÚBLICOS ================= */}
                <motion.section
                    className="py-24 px-5 md:px-10"
                    initial="initial" whileInView="animate" viewport={{ once: true, amount: 0.2 }} variants={staggerContainer}
                >
                    <div className="max-w-7xl mx-auto">
                        <SectionHeading
                            gold
                            kicker="Feito para você"
                            title="Uma plataforma,"
                            highlight="três caminhos"
                            subtitle="Construímos o TreinAI primeiro para os profissionais — e abrimos espaço também para alunos e comerciantes."
                        />

                        <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-6" variants={staggerContainer}>
                            {pilares.map((p, i) => (
                                <motion.div
                                    key={i}
                                    variants={scaleIn}
                                    whileHover={{ y: -8 }}
                                    className={`relative rounded-3xl p-8 border backdrop-blur-xl transition-all ${p.destaque
                                        ? `bg-gradient-to-b from-amber-400/10 to-white/[0.02] border-amber-300/30 ring-1 ${p.ring} shadow-[0_20px_60px_rgba(245,180,40,0.12)]`
                                        : 'bg-white/[0.03] border-white/10 hover:border-white/20'}`}
                                >
                                    {p.destaque && (
                                        <div className="absolute -top-3 left-8 inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-300 to-amber-500 text-slate-900 text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                                            <LuCrown className="w-3.5 h-3.5" /> {p.tag}
                                        </div>
                                    )}
                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${p.color} flex items-center justify-center mb-6 shadow-lg`}>
                                        <p.icon className="w-7 h-7 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">{p.title}</h3>
                                    <p className="text-slate-400 mb-6">{p.desc}</p>
                                    <ul className="space-y-3 mb-8">
                                        {p.bullets.map((b, j) => (
                                            <li key={j} className="flex items-start gap-3 text-slate-200">
                                                <LuCheck className={`w-5 h-5 mt-0.5 flex-shrink-0 ${p.destaque ? 'text-amber-300' : 'text-blue-400'}`} />
                                                <span className="text-sm leading-relaxed">{b}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <NavLink to={p.to}>
                                        <button className={`group inline-flex items-center gap-2 font-semibold transition-colors ${p.destaque ? 'text-amber-300 hover:text-amber-200' : 'text-blue-400 hover:text-blue-300'}`}>
                                            {p.cta}
                                            <LuArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                        </button>
                                    </NavLink>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </motion.section>

                {/* ================= PROFISSIONAIS (deep dive) ================= */}
                <motion.section
                    className="py-24 px-5 md:px-10"
                    initial="initial" whileInView="animate" viewport={{ once: true, amount: 0.15 }} variants={staggerContainer}
                >
                    <div className="max-w-7xl mx-auto">
                        <SectionHeading
                            gold
                            kicker="Para profissionais"
                            title="Tudo para você"
                            highlight="vender mais"
                            subtitle="Anúncios, alunos e inteligência artificial reunidos num painel feito para o seu crescimento."
                        />
                        <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" variants={staggerContainer}>
                            {featuresProf.map((f, i) => (
                                <motion.div
                                    key={i}
                                    variants={scaleIn}
                                    whileHover={{ y: -6 }}
                                    className="group relative rounded-2xl p-7 bg-white/[0.03] border border-white/10 hover:border-amber-300/30 backdrop-blur-xl transition-all overflow-hidden"
                                >
                                    <div className="absolute -right-10 -top-10 w-32 h-32 bg-amber-400/0 group-hover:bg-amber-400/10 blur-2xl rounded-full transition-all" />
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-500/10 border border-amber-300/20 flex items-center justify-center mb-5">
                                        <f.icon className="w-6 h-6 text-amber-300" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </motion.section>

                {/* ================= ESTATÍSTICAS ================= */}
                <motion.section
                    className="py-20 px-5 md:px-10"
                    initial="initial" whileInView="animate" viewport={{ once: true }} variants={staggerContainer}
                >
                    <div className="max-w-6xl mx-auto">
                        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent backdrop-blur-xl p-10 md:p-14">
                            <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-8" variants={staggerContainer}>
                                {[
                                    { number: '5K+', label: 'Usuários ativos', icon: LuUsers },
                                    { number: '100K+', label: 'Treinos realizados', icon: LuChartNoAxesCombined },
                                    { number: '95%', label: 'Satisfação', icon: LuStar },
                                    { number: '4.8', label: 'Avaliação média', icon: LuAward },
                                ].map((s, i) => (
                                    <motion.div key={i} className="text-center" variants={scaleIn}>
                                        <s.icon className="w-7 h-7 mx-auto mb-3 text-amber-300" />
                                        <div className="text-4xl md:text-5xl font-bold text-white tracking-tight">{s.number}</div>
                                        <p className="text-slate-400 text-sm mt-1">{s.label}</p>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </div>
                    </div>
                </motion.section>

                {/* ================= COMO FUNCIONA ================= */}
                <motion.section
                    className="py-24 px-5 md:px-10"
                    initial="initial" whileInView="animate" viewport={{ once: true, amount: 0.2 }} variants={staggerContainer}
                >
                    <div className="max-w-6xl mx-auto">
                        <SectionHeading kicker="Simples e rápido" title="Comece em" highlight="3 passos" />
                        <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6" variants={staggerContainer}>
                            {[
                                { n: '01', icon: LuRocket, title: 'Crie sua conta', desc: 'Cadastre-se grátis e escolha seu perfil: profissional, aluno ou comerciante.' },
                                { n: '02', icon: LuMousePointerClick, title: 'Monte seu espaço', desc: 'Publique anúncios, configure seu perfil e conecte-se com seu público.' },
                                { n: '03', icon: LuTrendingUp, title: 'Cresça com dados', desc: 'Acompanhe métricas, use a IA e otimize seus resultados continuamente.' },
                            ].map((step, i) => (
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
                    </div>
                </motion.section>

                {/* ================= DEPOIMENTOS ================= */}
                <motion.section
                    className="py-24 px-5 md:px-10"
                    initial="initial" whileInView="animate" viewport={{ once: true, amount: 0.15 }} variants={staggerContainer}
                >
                    <div className="max-w-6xl mx-auto">
                        <SectionHeading gold kicker="Histórias reais" title="Quem usa," highlight="recomenda" />
                        <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6" variants={staggerContainer}>
                            {[
                                { name: 'Rafael Lima', role: 'Personal Trainer', text: 'Tripliquei meus contatos depois que comecei a impulsionar anúncios aqui. O painel é simples e os dados ajudam muito.', rating: 5 },
                                { name: 'Camila Duarte', role: 'Nutricionista', text: 'Gerencio todos os meus pacientes num lugar só. As notas e a anamnese economizam meu tempo todo dia.', rating: 5 },
                                { name: 'Pedro Alves', role: 'Aluno', text: 'Os treinos por IA se adaptaram à minha rotina. Em poucas semanas já vi diferença de verdade.', rating: 5 },
                            ].map((t, i) => (
                                <motion.div key={i} variants={scaleIn} className="relative rounded-2xl p-8 bg-white/[0.03] border border-white/10 backdrop-blur-xl">
                                    <LuQuote className="w-8 h-8 text-amber-300/40 mb-4" />
                                    <div className="flex mb-4">
                                        {[...Array(t.rating)].map((_, k) => (
                                            <LuStar key={k} className="w-4 h-4 text-amber-300 fill-amber-300" />
                                        ))}
                                    </div>
                                    <p className="text-slate-200 leading-relaxed mb-6">"{t.text}"</p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-slate-900 font-bold">
                                            {t.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-white font-semibold leading-tight">{t.name}</p>
                                            <p className="text-amber-300/80 text-sm">{t.role}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </motion.section>

                {/* ================= FAQ ================= */}
                <motion.section
                    className="py-24 px-5 md:px-10"
                    initial="initial" whileInView="animate" viewport={{ once: true, amount: 0.2 }} variants={staggerContainer}
                >
                    <div className="max-w-4xl mx-auto">
                        <SectionHeading kicker="Tire suas dúvidas" title="Perguntas" highlight="frequentes" />
                        <motion.div className="space-y-4" variants={staggerContainer}>
                            {[
                                { q: 'Como funcionam os anúncios para profissionais?', a: 'Você cria seu anúncio, compra saldo de impressões e impulsiona quando quiser. Acompanha impressões e cliques em tempo real no painel.' },
                                { q: 'Comerciantes também podem anunciar?', a: 'Sim. Lojas e estabelecimentos podem divulgar seus negócios para um público fitness qualificado e geolocalizado.' },
                                { q: 'Como a IA ajuda os alunos?', a: 'A IA cria treinos personalizados a partir do seu perfil e objetivos, e evolui conforme o seu progresso.' },
                                { q: 'Posso cancelar quando quiser?', a: 'Sim! Não há fidelidade. Você gerencia ou cancela sua assinatura a qualquer momento.' },
                            ].map((f, i) => (
                                <motion.details key={i} variants={scaleIn} className="group rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl overflow-hidden">
                                    <summary className="flex items-center justify-between cursor-pointer p-6 text-white font-semibold list-none">
                                        {f.q}
                                        <LuArrowRight className="w-5 h-5 text-amber-300 transition-transform group-open:rotate-90" />
                                    </summary>
                                    <div className="px-6 pb-6 text-slate-400 leading-relaxed">{f.a}</div>
                                </motion.details>
                            ))}
                        </motion.div>
                    </div>
                </motion.section>

                {/* ================= CTA FINAL ================= */}
                <motion.section
                    className="py-24 px-5 md:px-10"
                    initial="initial" whileInView="animate" viewport={{ once: true }} variants={staggerContainer}
                >
                    <motion.div
                        className="max-w-5xl mx-auto relative rounded-3xl overflow-hidden border border-amber-300/20 p-12 md:p-16 text-center"
                        variants={fadeInUp}
                    >
                        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-amber-400/15 via-blue-600/10 to-transparent" />
                        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(245,180,40,0.18),transparent_60%)]" />
                        <motion.div variants={fadeInUp} className="flex justify-center mb-6">
                            <Pill gold icon={LuCrown}>Experiência premium</Pill>
                        </motion.div>
                        <motion.h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-[1.05]" variants={fadeInUp}>
                            Pronto para <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-400">crescer</span>?
                        </motion.h2>
                        <motion.p className="text-lg text-slate-300 mt-5 max-w-2xl mx-auto" variants={fadeInUp}>
                            Junte-se aos profissionais, alunos e comerciantes que já fazem parte do TreinAI. Comece gratuitamente hoje.
                        </motion.p>
                        <motion.div className="mt-9 flex flex-col sm:flex-row gap-4 justify-center items-center" variants={fadeInUp}>
                            <NavLink to="/login">
                                <motion.button
                                    className="group inline-flex items-center gap-2 bg-gradient-to-r from-amber-300 to-amber-500 text-slate-900 px-10 py-4 rounded-2xl text-lg font-bold shadow-[0_8px_30px_rgba(245,180,40,0.4)] hover:shadow-[0_12px_40px_rgba(245,180,40,0.6)] transition-all"
                                    whileHover={{ scale: 1.04 }}
                                    whileTap={{ scale: 0.97 }}
                                >
                                    Começar grátis
                                    <LuArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </motion.button>
                            </NavLink>
                            {logado && (
                                <NavLink to="/dashboard">
                                    <motion.button
                                        className="inline-flex items-center gap-2 border border-white/20 bg-white/5 text-white px-10 py-4 rounded-2xl text-lg font-semibold hover:bg-white/10 transition-all"
                                        whileHover={{ scale: 1.04 }}
                                        whileTap={{ scale: 0.97 }}
                                    >
                                        Ir para o painel
                                    </motion.button>
                                </NavLink>
                            )}
                        </motion.div>
                        <motion.p className="mt-6 text-sm text-slate-400" variants={fadeInUp}>
                            A partir de <span className="text-amber-300 font-bold">R$ 0,00/mês</span> · Cancele quando quiser · Suporte dedicado
                        </motion.p>
                    </motion.div>
                </motion.section>

                <PublicFooter initialMinimized={false} />
            </div>
        </div>
    )
}

export default Home
