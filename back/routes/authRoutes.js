// routes/authRoutes.js
import { Router } from 'express';
import { login, dashboard, signup, changeTheme, changeLoginSeguro, changeHideAds, completeOnboarding, atualizarPerfil, carregarTreinos, atualizarMeusTreinos, pegarUser, loginNaoAutorizado, heartbeat } from '../controllers/authController.js';
import { verificarToken } from '../middlewares/authMiddleware.js';
import { validateLogin, validateSignup, validateDashboard, validateUpdateProfile, validateCreateLocal, validateEditLocal } from '../middlewares/validationMiddleware.js';
import { validateEmailReal, validateEmailBasic } from '../middlewares/emailValidation.js';
import { loginRateLimit, signupRateLimit, uploadRateLimit, passwordResetRateLimit, aiRateLimit } from '../middlewares/rateLimitMiddleware.js';
import { validateCSRF, validateCSRFAuth, getCSRFToken, provideCSRFToken } from '../middlewares/csrfMiddleware.js';
import { uploadSecurityHeaders } from '../middlewares/securityHeaders.js';
import { 
  tokenRateLimit, 
  paymentRateLimit, 
  validateAndSanitize, 
  validateImageUpload, 
  securityLogger 
} from '../middleware/security.js';
import {
  CreateCheckoutSession,
  SessionStatus,
  atualizarPlano,
  CriarSessaoPagamentoLocal,
  deletarLocal,
  SessionPaymentSaldoDeImpressoes,
} from '../controllers/stripe.js';
import { conversar, criarExercicioIA, criarTreinoIA } from '../controllers/UsingIA.js';
import User from '../models/User.js';
import { publicarNoHistorico } from '../controllers/database.js';
import { adicionarExercicio, adicionarReport, procurarExercicio } from '../controllers/treino.js';
import { uploadProfile, uploadImage, uploadMidiaAnuncio } from '../controllers/multerConfig.js';
import { aceitarAluno, editarProfissional, profissionais, publicarProfissional, queroSerAluno, removerAluno, getPublicProfissional } from '../controllers/profissionais.js';
import Profissional from '../models/Profissional.js';
import { getBrazilDate } from '../helpers/getBrazilDate.js';
import { adicionarUsuario, deletarMensagem, enviarMensagem, marcarMensagensVistas, pegarChat, pegarChats, removerUsuario, editarMensagem, responderMensagem, marcarMensagensVistasV2, configurarChat, buscarHistorico, iniciarChatPorUserId, deletarChat, exportarHistoricoChat, atualizarStatusDigitando } from '../controllers/chatController.js';
import { conversarNutri } from '../controllers/NutriAI.js';
import { editarLocal, criarLocalDireto, deletarLocalPorId, ativarLocal, buscarLocais, meusLocais, upload, avaliarLocal, listarAvaliacoesLocal, listarAvaliacoesPendentes, moderarAvaliacao } from '../controllers/LocalController.js';
import { criarAnuncio, editarAnuncio, getAnuncios, deletarAnuncio, marcarClique, marcarImpressao } from '../controllers/AnunciosController.js';
import { checkAiBudget } from '../middlewares/tokenLimitMiddleware.js';
import { queueMiddleware } from '../middlewares/queueMiddleware.js';
import { getSupports, pedirSuporte } from '../controllers/SupportController.js';
import { logAudit } from '../helpers/auditLog.js';
import { salvarNotaAluno, getNotaAluno, listarTemplates, salvarTemplate, deletarTemplate } from '../controllers/professionalTools.js';
import { salvarAnamnese, getAnamnese, getAnamneseAluno } from '../controllers/anamnese.js';
import { getAiHistory, appendAiHistory, clearAiHistory } from '../controllers/aiHistory.js';

// Função utilitária para configurações de limpeza de cookies baseadas no ambiente
const getClearCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    secure: true, // Sempre true para HTTPS obrigatório no Vercel
    sameSite: 'None', // Necessário para cross-origin HTTPS
    path: '/'
  };
};

const router = Router();

// Rota para obter token CSRF
router.get('/csrf-token', getCSRFToken);

router.post('/login', loginRateLimit, validateCSRFAuth, validateEmailBasic, validateLogin, login);
router.post('/signup', signupRateLimit, validateCSRFAuth, validateEmailReal, validateSignup, signup);
router.post('/login-nao-autorizado', loginNaoAutorizado);
router.post('/dashboard', verificarToken, dashboard);
router.post('/create-checkout-session', verificarToken, CreateCheckoutSession);
router.get('/session-status', SessionStatus); // verificar status
router.post('/change-theme', verificarToken, changeTheme)
router.post('/change-loginSeguro', verificarToken, changeLoginSeguro)
router.post('/change-hideAds', verificarToken, changeHideAds)
router.post('/complete-onboarding', verificarToken, checkAiBudget, completeOnboarding)
router.post('/atualizar-perfil', verificarToken, uploadRateLimit, uploadSecurityHeaders, validateCSRF, validateUpdateProfile, uploadProfile.single('avatar'), atualizarPerfil)
router.post('/criar-meusTreinos', verificarToken, checkAiBudget, carregarTreinos);

// IA routes
router.post('/gerar-exercicio-ia', verificarToken, aiRateLimit, queueMiddleware, checkAiBudget, criarExercicioIA);
router.post('/gerar-treino-ia', verificarToken, aiRateLimit, queueMiddleware, checkAiBudget, criarTreinoIA);

router.delete('/excluir-treino', verificarToken, async (req, res) => {
  const email = req.userEmail; // identidade do token (não confiar na query)
  const { treinoId } = req.query;

  if (!email) return res.json({ msg: '!email' });
  if (!treinoId) return res.json({ msg: '!treinoId' });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.json({ msg: 'Usuário não encontrado.' });

    const treinoIndex = user.meusTreinos.findIndex(t => t.treinoId === treinoId);
    if (treinoIndex === -1) return res.json({ msg: 'Treino não encontrado.' });

    user.meusTreinos.splice(treinoIndex, 1); // Remove o treino pelo índice

    // Se não houver mais treinos, permitir criar novamente
    if (user.meusTreinos.length === 0) {
      user.tentouCriarMeusTreinos = false;
    }

    // se existir o profissionalId entao atualizar
    try {
      if (req?.query?.profissionalId) {
        const profissional = await Profissional.findOne({
          $or: [
            { profissionalId: req?.query?.profissionalId },
            { userId: req?.query?.profissionalId }
          ]
        });

        if (!profissional) console.log('Não encontrei o profissional com o profissionalId repassado.');
        if (profissional) {
          const aluno = profissional.alunos.find(a => String(a.userId) === String(user._id));

          if (!aluno) console.log('nao existe esse aluno em profissional: ' + profissional.profissionalName)
          if (aluno) {
            aluno.ultimoUpdate = getBrazilDate();

            await profissional.save()
          }
        }
      }
    } catch (error) {
      console.log('Não foi o profissional que fez update! ou aconteceu algum erro > ', error);
    }

    await user.save();
    return res.json({ msg: 'Treino excluído com sucesso.', user });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Erro interno no servidor.' });
  }
});
router.delete('/excluir-exercicio', verificarToken, async (req, res) => {
  const email = req.userEmail; // identidade do token
  const { treinoId, exercicioId } = req.query;

  if (!email) return res.status(400).json({ msg: '!email' });
  if (!treinoId) return res.status(400).json({ msg: '!treinoId' });
  if (!exercicioId) return res.status(400).json({ msg: '!exercicioId' });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: 'Usuário não encontrado.' });

    const treino = user.meusTreinos.find(t => t.treinoId === treinoId);
    if (!treino) return res.status(404).json({ msg: 'Treino não encontrado.' });

    const exercicioIndex = treino.exercicios.findIndex(ex => ex.exercicioId === exercicioId);
    if (exercicioIndex === -1) return res.status(404).json({ msg: 'Exercício não encontrado.' });

    // Remove o exercício
    treino.exercicios.splice(exercicioIndex, 1);

    // se existir o profissionalId entao atualizar
    try {
      if (req?.query?.profissionalId) {
        const profissional = await Profissional.findOne({
          $or: [
            { profissionalId: req?.query?.profissionalId },
            { userId: req?.query?.profissionalId }
          ]
        });

        if (!profissional) console.log('Não encontrei o profissional com o profissionalId repassado.');
        if (profissional) {
          const aluno = profissional.alunos.find(a => String(a.userId) === String(user._id));

          if (!aluno) console.log('nao existe esse aluno em profissional: ' + profissional.profissionalName)
          if (aluno) {
            aluno.ultimoUpdate = getBrazilDate();

            await profissional.save()
          }
        }
      }
    } catch (error) {
      console.log('Não foi o profissional que fez update! ou aconteceu algum erro > ', error);
    }

    await user.save();

    return res.json({ msg: 'Exercício excluído com sucesso!', user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Erro interno no servidor.' });
  }
});
router.put('/atualizar-meusTreinos', verificarToken, atualizarMeusTreinos)

// Chat and AI conversation routes
router.post('/conversar', verificarToken, aiRateLimit, checkAiBudget, conversar);

router.post('/publicar-no-historico', publicarNoHistorico);
router.post('/atualizar-plano', verificarToken, atualizarPlano)
router.get('/procurar-exercicio', procurarExercicio);
router.post('/adicionar-exercicio', adicionarExercicio);
router.post('/adicionar-report-exercicio', adicionarReport);

// profissional
router.get('/profissionais', profissionais);
router.get('/profissionais/public/:profissionalId', getPublicProfissional); // página pública
router.post('/publicar-profissional', verificarToken, uploadRateLimit, uploadSecurityHeaders, uploadImage.single('image'), publicarProfissional);
router.post('/editar-profissional', verificarToken, uploadRateLimit, uploadSecurityHeaders, uploadImage.single('image'), editarProfissional);
router.post('/quero-ser-aluno', verificarToken, queroSerAluno);
router.post('/aceitar-aluno', verificarToken, aceitarAluno);
router.post('/remover-aluno', verificarToken, removerAluno);
router.get('/pegar-user', verificarToken, pegarUser);

// Heartbeat do coach para seus alunos
import { getCoachStudentsHeartbeat } from '../controllers/AdminController.js';
router.get('/heartbeat/coach-students', verificarToken, getCoachStudentsHeartbeat);

// Importar middlewares de autorização
import { isSelf, canAccessAluno, isChatParticipant, isAdmin } from '../middlewares/authorizationMiddleware.js';

// Ferramentas do profissional: notas privadas por aluno e templates de treino/dieta
router.post('/aluno/salvar-nota', verificarToken, canAccessAluno, salvarNotaAluno);
router.post('/aluno/get-nota', verificarToken, canAccessAluno, getNotaAluno);
router.get('/templates', verificarToken, listarTemplates);
router.post('/templates/salvar', verificarToken, salvarTemplate);
router.post('/templates/deletar', verificarToken, deletarTemplate);

// Anamnese: aluno preenche/lê a própria; profissional lê a de um aluno vinculado
router.post('/anamnese/salvar', verificarToken, salvarAnamnese);
router.get('/anamnese', verificarToken, getAnamnese);
router.post('/aluno/anamnese', verificarToken, canAccessAluno, getAnamneseAluno);

// Histórico de conversas com a IA (NutriAI / TreinoAI)
router.get('/ai/history', verificarToken, getAiHistory);
router.post('/ai/history/append', verificarToken, appendAiHistory);
router.post('/ai/history/clear', verificarToken, clearAiHistory);

//chat
// Rotas de chat agora com autenticação e autorização
router.get('/pegarChats', verificarToken, isSelf, pegarChats);
router.post('/pegarChat', verificarToken, isChatParticipant, pegarChat);
router.post('/enviar-mensagem', verificarToken, isChatParticipant, enviarMensagem);
router.post('/deletar-mensagem', verificarToken, isChatParticipant, deletarMensagem);
router.post('/adicionar-usuario-chat', verificarToken, isChatParticipant, adicionarUsuario);
router.post('/remover-usuario-chat', verificarToken, isChatParticipant, removerUsuario);
router.post('/marcar-mensagens-vistas', verificarToken, isChatParticipant, marcarMensagensVistas);
router.post('/iniciar-chat-por-userid', verificarToken, iniciarChatPorUserId);

// Novas funcionalidades de chat
router.post('/editar-mensagem', verificarToken, isChatParticipant, editarMensagem);
router.post('/deletar-chat', verificarToken, isChatParticipant, deletarChat);
router.post('/responder-mensagem', verificarToken, isChatParticipant, responderMensagem);
router.post('/marcar-mensagens-vistas-v2', verificarToken, isChatParticipant, marcarMensagensVistasV2);
router.post('/configurar-chat', verificarToken, isChatParticipant, configurarChat);
router.get('/buscar-historico', verificarToken, isChatParticipant, buscarHistorico);
router.get('/exportar-historico-chat', verificarToken, isChatParticipant, exportarHistoricoChat);

// nutri
router.post('/conversar-nutri', verificarToken, aiRateLimit, queueMiddleware, checkAiBudget, conversarNutri);

// locais - FLUXO ATUAL
router.post('/criar-local-direto', 
  verificarToken,
  uploadSecurityHeaders, 
  upload.single('image'), 
  validateCreateLocal,
  criarLocalDireto
); // Criar local sem pagamento imediato
router.post('/ativar-local/:localId', 
  verificarToken,
  uploadSecurityHeaders, 
  ativarLocal
); // Ativar local após pagamento
router.delete('/deletar-local-por-id/:localId', 
  verificarToken,
  uploadSecurityHeaders, 
  deletarLocalPorId
); // Deletar local por ID (rollback)
router.get('/buscar-locais', buscarLocais); // Buscar locais públicos (status=ativo)
router.get('/meus-locais', verificarToken, meusLocais); // Listar locais do usuário logado

router.post('/criar-sessao-pagamento-local', 
  verificarToken,
  uploadSecurityHeaders, 
  CriarSessaoPagamentoLocal
); // Criar sessão de pagamento para local
router.post('/editar-local', verificarToken, uploadSecurityHeaders, upload.single('image'), validateEditLocal, editarLocal);
router.get('/locais', buscarLocais);
router.post('/deletar-local', verificarToken, deletarLocal);

// anuncios
router.post('/adicionar-saldo', verificarToken, SessionPaymentSaldoDeImpressoes);
router.post('/criar-anuncio', verificarToken, uploadSecurityHeaders, uploadMidiaAnuncio('uploads/midias-anuncio', 'midia'), criarAnuncio);
router.post('/anuncios', getAnuncios); // query profissionalId (opcional). se nao passar, retorna todos os anuncios disponiveis.
router.post('/deletar-anuncio', verificarToken, deletarAnuncio); // corpo => profissionalId e anuncioId.
router.post('/editar-anuncio', verificarToken, uploadSecurityHeaders, uploadMidiaAnuncio('uploads/midias-anuncio', 'midia'), editarAnuncio); // corpo => profissionalId e anuncioId.
router.post('/marcar-impressao', marcarImpressao); // corpo => userId e anuncioId.
router.post('/marcar-clique', marcarClique); // corpo => userId e anuncioId.

// support
router.get('/supports', getSupports)
router.post('/supports', pedirSuporte)

// LGPD - Solicitar dados pessoais
router.post('/lgpd/solicitar-dados', verificarToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('-password');
    res.json({ success: true, dados: user });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
  }
});

router.post('/lgpd/excluir-conta', verificarToken, async (req, res) => {
  try {
    const userId = req.user.id;
    await logAudit({ req, action: 'account.delete', details: { userId } });
    await User.findByIdAndDelete(userId);
    res.clearCookie('auth_token', getClearCookieOptions());
    res.json({ success: true, message: 'Conta excluída com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir conta' });
  }
});

// =======================
// ROTAS DE AVALIAÇÃO DE LOCAIS
// =======================

// Criar avaliação para um local
router.post('/avaliar-local', verificarToken, validateAndSanitize.localData, avaliarLocal);

// Listar avaliações aceitas de um local (público)
router.get('/avaliacoes-local/:localId', listarAvaliacoesLocal);

// Listar avaliações pendentes de moderação (admin)
router.get('/avaliacoes-pendentes', verificarToken, isAdmin, listarAvaliacoesPendentes);

// Moderar avaliação (aceitar/rejeitar) - admin
router.post('/moderar-avaliacao', verificarToken, isAdmin, moderarAvaliacao);

// Rota de logout para limpar cookies
router.post('/logout', (req, res) => {
  res.clearCookie('auth_token', getClearCookieOptions());
  res.json({ msg: 'Logout realizado com sucesso!' });
});

router.post('/heartbeat', heartbeat);
router.post('/atualizar-status-digitando', atualizarStatusDigitando);

export default router;
