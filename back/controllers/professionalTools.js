/**
 * Ferramentas de produtividade do profissional:
 *  - Notas privadas por aluno (visíveis apenas ao profissional)
 *  - Templates reutilizáveis de treino/dieta
 *
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

/**
 * Lista os templates (treino/dieta) do profissional logado.
 */
export const listarTemplates = async (req, res) => {
  try {
    const profissional = await Profissional.findOne({ userId: req.user.id }).select('templates').lean();
    if (!profissional) {
      return res.status(403).json({ success: false, msg: 'Apenas profissionais podem usar templates.' });
    }
    return res.json({ success: true, templates: profissional.templates || [] });
  } catch (error) {
    console.error('[listarTemplates] Erro:', error);
    return res.status(500).json({ success: false, msg: 'Erro ao listar templates.' });
  }
};

/**
 * Cria ou atualiza um template. Se vier templateId existente, atualiza; senão cria.
 */
export const salvarTemplate = async (req, res) => {
  try {
    const { templateId, tipo, nome, descricao, conteudo } = req.body;

    if (!tipo || !['treino', 'dieta'].includes(tipo)) {
      return res.status(400).json({ success: false, msg: 'Campo "tipo" deve ser "treino" ou "dieta".' });
    }
    if (!nome || typeof nome !== 'string') {
      return res.status(400).json({ success: false, msg: 'Campo "nome" é obrigatório.' });
    }

    const profissional = await Profissional.findOne({ userId: req.user.id });
    if (!profissional) {
      return res.status(403).json({ success: false, msg: 'Apenas profissionais podem criar templates.' });
    }

    const existente = templateId
      ? profissional.templates.find(t => t.templateId === templateId)
      : null;

    if (existente) {
      existente.tipo = tipo;
      existente.nome = nome;
      existente.descricao = descricao || '';
      existente.conteudo = conteudo ?? existente.conteudo;
      existente.atualizadoEm = getBrazilDate();
    } else {
      profissional.templates.push({ tipo, nome, descricao: descricao || '', conteudo: conteudo ?? null });
    }

    await profissional.save();
    return res.json({ success: true, templates: profissional.templates });
  } catch (error) {
    console.error('[salvarTemplate] Erro:', error);
    return res.status(500).json({ success: false, msg: 'Erro ao salvar template.' });
  }
};

/**
 * Remove um template do profissional.
 */
export const deletarTemplate = async (req, res) => {
  try {
    const { templateId } = req.body;
    if (!templateId) {
      return res.status(400).json({ success: false, msg: 'templateId é obrigatório.' });
    }

    const profissional = await Profissional.findOne({ userId: req.user.id });
    if (!profissional) {
      return res.status(403).json({ success: false, msg: 'Apenas profissionais podem remover templates.' });
    }

    const antes = profissional.templates.length;
    profissional.templates = profissional.templates.filter(t => t.templateId !== templateId);

    if (profissional.templates.length === antes) {
      return res.status(404).json({ success: false, msg: 'Template não encontrado.' });
    }

    await profissional.save();
    return res.json({ success: true, templates: profissional.templates });
  } catch (error) {
    console.error('[deletarTemplate] Erro:', error);
    return res.status(500).json({ success: false, msg: 'Erro ao remover template.' });
  }
};
