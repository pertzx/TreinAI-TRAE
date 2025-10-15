// routes/authRoutes.js
import { Router } from 'express';
import { login, dashboard, signup, changeTheme, changeLoginSeguro, completeOnboarding, atualizarPerfil, carregarTreinos, atualizarMeusTreinos, pegarUser, loginNaoAutorizado } from '../controllers/authController.js';
import { verificarToken } from '../middlewares/authMiddleware.js';
import { validateLogin, validateSignup, validateDashboard, validateUpdateProfile } from '../middlewares/validationMiddleware.js';
import { validateEmailReal, validateEmailBasic } from '../middlewares/emailValidation.js';
import { loginRateLimit, signupRateLimit, uploadRateLimit, passwordResetRateLimit } from '../middlewares/rateLimitMiddleware.js';
import { validateCSRF, validateCSRFAuth, getCSRFToken, provideCSRFToken } from '../middlewares/csrfMiddleware.js';
import { uploadSecurityHeaders } from '../middlewares/securityHeaders.js';
import {
  CreateCheckoutSession,
  SessionStatus,
  atualizarPlano,
  CriarAssinaturaProLocal,
  deletarLocal,
  SessionPaymentSaldoDeImpressoes,
} from '../controllers/stripe.js';
import { conversar, criarExercicioIA, criarTreinoIA } from '../controllers/UsingIA.js';
import User from '../models/User.js';
import { publicarNoHistorico } from '../controllers/database.js';
import { adicionarExercicio, adicionarReport, procurarExercicio } from '../controllers/treino.js';
import { getUploadMiddleware, uploadMidiaAnuncioServerless } from '../controllers/multerConfigServerless.js';
import { aceitarAluno, editarProfissional, profissionais, publicarProfissional, queroSerAluno, removerAluno } from '../controllers/profissionais.js';
import Profissional from '../models/Profissional.js';
import { getBrazilDate } from '../helpers/getBrazilDate.js';
import { adicionarUsuario, deletarMensagem, enviarMensagem, marcarMensagensVistas, pegarChat, pegarChats, removerUsuario, editarMensagem, responderMensagem, marcarMensagensVistasV2, configurarChat, buscarHistorico, iniciarChatPorUserId } from '../controllers/chatController.js';
import { conversarNutri } from '../controllers/NutriAI.js';
import { editarLocal } from '../controllers/LocalController.js';
import { getLocais } from '../controllers/LocalController.js';
import { criarAnuncio, editarAnuncio, getAnuncios, deletarAnuncio, marcarClique, marcarImpressao } from '../controllers/AnunciosController.js';
import { checkTokenLimit } from '../middlewares/tokenLimitMiddleware.js';
import { getSupports, pedirSuporte } from '../controllers/SupportController.js';

const router = Router();

// Rota para obter token CSRF
router.get('/csrf-token', getCSRFToken);

router.post('/login', loginRateLimit, validateCSRFAuth, validateEmailBasic, validateLogin, login);
router.post('/signup', signupRateLimit, validateCSRFAuth, validateEmailReal, validateSignup, signup);
router.post('/login-nao-autorizado', loginNaoAutorizado);
router.post('/dashboard', verificarToken, dashboard);
router.post('/create-checkout-session', CreateCheckoutSession);
router.get('/session-status', SessionStatus); // verificar status
router.post('/change-theme', changeTheme)
router.post('/change-loginSeguro', changeLoginSeguro)
router.post('/complete-onboarding', checkTokenLimit, completeOnboarding)
router.post('/atualizar-perfil', uploadRateLimit, uploadSecurityHeaders, validateCSRF, validateUpdateProfile, getUploadMiddleware('uploads/image-perfil', 'avatar'), atualizarPerfil)
router.post('/criar-meusTreinos', checkTokenLimit, carregarTreinos);
// IA routes
router.post('/gerar-exercicio-ia', criarExercicioIA);
router.post('/gerar-treino-ia', checkTokenLimit, criarTreinoIA);
router.delete('/excluir-treino', async (req, res) => {
  const { email, treinoId } = req.query;

  if (!email) return res.json({ msg: '!email' });
  if (!treinoId) return res.json({ msg: '!treinoId' });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.json({ msg: 'Usuário não encontrado.' });

    const treinoIndex = user.meusTreinos.findIndex(t => t.treinoId === treinoId);
    if (treinoIndex === -1) return res.json({ msg: 'Treino não encontrado.' });

    user.meusTreinos.splice(treinoIndex, 1); // Remove o treino pelo índice

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
    return res.json({ msg: 'Treino excluído com sucesso.' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Erro interno no servidor.' });
  }
});
router.delete('/excluir-exercicio', async (req, res) => {
  const { email, treinoId, exercicioId } = req.query;

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
router.put('/atualizar-meusTreinos', atualizarMeusTreinos)

// Chat and AI conversation routes
router.post('/conversar', checkTokenLimit, conversar);

router.post('/publicar-no-historico', publicarNoHistorico);
router.post('/atualizar-plano', atualizarPlano)
router.get('/procurar-exercicio', procurarExercicio);
router.post('/adicionar-exercicio', adicionarExercicio);
router.post('/adicionar-report-exercicio', adicionarReport);

// profissional
router.get('/profissionais', profissionais);
router.post('/publicar-profissional', uploadRateLimit, uploadSecurityHeaders, getUploadMiddleware('uploads/image-profissional', 'image'), publicarProfissional);
router.post('/editar-profissional', uploadRateLimit, uploadSecurityHeaders, getUploadMiddleware('uploads/image-profissional', 'image'), editarProfissional);
router.post('/quero-ser-aluno', queroSerAluno);
router.post('/aceitar-aluno', aceitarAluno);
router.post('/remover-aluno', removerAluno);
router.get('/pegar-user', pegarUser);

//chat
router.get('/pegarChats', pegarChats);
router.post('/pegarChat', pegarChat);
router.post('/enviar-mensagem', enviarMensagem);
router.post('/deletar-mensagem', deletarMensagem);
router.post('/adicionar-usuario-chat', adicionarUsuario);
router.post('/remover-usuario-chat', removerUsuario);
router.post('/marcar-mensagens-vistas', marcarMensagensVistas);
router.post('/iniciar-chat-por-userid', iniciarChatPorUserId);

// Novas funcionalidades de chat
router.post('/editar-mensagem', editarMensagem);
router.post('/responder-mensagem', responderMensagem);
router.post('/marcar-mensagens-vistas-v2', marcarMensagensVistasV2);
router.post('/configurar-chat', configurarChat);
router.get('/buscar-historico', buscarHistorico);

// nutri
router.post('/conversar-nutri', checkTokenLimit, conversarNutri);

// locais
router.post('/createPayment', uploadSecurityHeaders, getUploadMiddleware('uploads/tmp', 'image'), CriarAssinaturaProLocal);
router.post('/editar-local', uploadSecurityHeaders, getUploadMiddleware('uploads/image-local', 'image'), editarLocal);
router.get('/locais', getLocais);
router.post('/deletar-local', deletarLocal);

// anuncios
router.post('/adicionar-saldo', SessionPaymentSaldoDeImpressoes);
router.post('/criar-anuncio', uploadSecurityHeaders, uploadMidiaAnuncioServerless('uploads/midias-anuncio', 'midia'), criarAnuncio);
router.post('/anuncios', getAnuncios); // query profissionalId (opcional). se nao passar, retorna todos os anuncios disponiveis.
router.post('/deletar-anuncio', deletarAnuncio); // corpo => profissionalId e anuncioId.
router.post('/editar-anuncio', uploadSecurityHeaders, uploadMidiaAnuncioServerless('uploads/midias-anuncio', 'midia'), editarAnuncio); // corpo => profissionalId e anuncioId.
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
    await User.findByIdAndDelete(userId);
    res.clearCookie('authToken');
    res.json({ success: true, message: 'Conta excluída com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir conta' });
  }
});

// Rota de logout para limpar cookies
router.post('/logout', (req, res) => {
  res.clearCookie('authToken');
  res.json({ msg: 'Logout realizado com sucesso!' });
});

export default router;
