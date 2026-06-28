/**
 * Anamnese / avaliação inicial do aluno.
 *  - O aluno preenche e lê a própria anamnese (identidade vem do token).
 *  - O profissional lê a anamnese de um aluno vinculado (via canAccessAluno).
 */
import User from '../models/User.js';
import { getBrazilDate } from '../helpers/getBrazilDate.js';

const CAMPOS = ['objetivos', 'lesoes', 'restricoes', 'medicamentos', 'experiencia', 'observacoes'];

/** Salva a anamnese do próprio usuário autenticado. */
export const salvarAnamnese = async (req, res) => {
  try {
    const userId = req.user?.id;
    const user = userId
      ? await User.findById(userId)
      : await User.findOne({ email: req.userEmail });

    if (!user) {
      return res.status(404).json({ success: false, msg: 'Usuário não encontrado.' });
    }

    const anamnese = user.anamnese || {};
    for (const campo of CAMPOS) {
      if (typeof req.body[campo] === 'string') {
        anamnese[campo] = req.body[campo];
      }
    }
    anamnese.preenchidoEm = new Date(getBrazilDate());
    user.anamnese = anamnese;
    await user.save();

    return res.json({ success: true, anamnese: user.anamnese });
  } catch (error) {
    console.error('[salvarAnamnese] Erro:', error);
    return res.status(500).json({ success: false, msg: 'Erro ao salvar anamnese.' });
  }
};

/** Retorna a anamnese do próprio usuário autenticado. */
export const getAnamnese = async (req, res) => {
  try {
    const userId = req.user?.id;
    const user = userId
      ? await User.findById(userId).select('anamnese').lean()
      : await User.findOne({ email: req.userEmail }).select('anamnese').lean();

    if (!user) {
      return res.status(404).json({ success: false, msg: 'Usuário não encontrado.' });
    }
    return res.json({ success: true, anamnese: user.anamnese || null });
  } catch (error) {
    console.error('[getAnamnese] Erro:', error);
    return res.status(500).json({ success: false, msg: 'Erro ao buscar anamnese.' });
  }
};

/** Retorna a anamnese de um aluno vinculado (uso pelo profissional). req.alunoId vem de canAccessAluno. */
export const getAnamneseAluno = async (req, res) => {
  try {
    const aluno = await User.findById(req.alunoId).select('anamnese username email').lean();
    if (!aluno) {
      return res.status(404).json({ success: false, msg: 'Aluno não encontrado.' });
    }
    return res.json({ success: true, anamnese: aluno.anamnese || null, aluno: { username: aluno.username, email: aluno.email } });
  } catch (error) {
    console.error('[getAnamneseAluno] Erro:', error);
    return res.status(500).json({ success: false, msg: 'Erro ao buscar anamnese do aluno.' });
  }
};
