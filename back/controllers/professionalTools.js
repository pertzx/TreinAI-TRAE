/**
 * Ferramentas de produtividade do profissional:
 *  - Notas privadas por aluno (visíveis apenas ao profissional)
 *
 * Os templates de treino/dieta foram removidos por não funcionarem.
 * As rotas de notas usam o middleware canAccessAluno, que já valida o vínculo
 * profissional↔aluno e injeta req.profissional e req.alunoId.
 */
import Profissional from '../models/Profissional.js';
import { getBrazilDate } from '../helpers/getBrazilDate.js';

/**
 * Salva/atualiza a nota privada do profissional sobre um aluno.
 * Espera: req.profissional, req.alunoId (de canAccessAluno) e req.body.nota
 */
export const salvarNotaAluno = async (req, res) => {
  try {
    const profissional = req.profissional;
    const alunoId = req.alunoId;
    const { nota } = req.body;

    if (typeof nota !== 'string') {
      return res.status(400).json({ success: false, msg: 'Campo "nota" (string) é obrigatório.' });
    }

    const vinculo = profissional.alunos.find(a => String(a.userId) === String(alunoId));
    if (!vinculo) {
      return res.status(404).json({ success: false, msg: 'Vínculo com o aluno não encontrado.' });
    }

    vinculo.notasPrivadas = nota;
    vinculo.ultimoUpdate = getBrazilDate();
    await profissional.save();

    return res.json({ success: true, notasPrivadas: vinculo.notasPrivadas });
  } catch (error) {
    console.error('[salvarNotaAluno] Erro:', error);
    return res.status(500).json({ success: false, msg: 'Erro ao salvar nota do aluno.' });
  }
};

/**
 * Retorna a nota privada do profissional sobre um aluno.
 */
export const getNotaAluno = async (req, res) => {
  try {
    const profissional = req.profissional;
    const alunoId = req.alunoId;

    const vinculo = profissional.alunos.find(a => String(a.userId) === String(alunoId));
    return res.json({ success: true, notasPrivadas: vinculo?.notasPrivadas || '' });
  } catch (error) {
    console.error('[getNotaAluno] Erro:', error);
    return res.status(500).json({ success: false, msg: 'Erro ao buscar nota do aluno.' });
  }
};
