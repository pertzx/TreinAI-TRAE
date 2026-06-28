import React, { useEffect, useState, useCallback } from 'react';
import { FiPlus, FiTrash2, FiSave, FiCopy } from 'react-icons/fi';
import api from '../../../Api';

/**
 * Gerenciador de templates de treino/dieta do profissional.
 * Cria, lista e remove modelos reutilizáveis. Autossuficiente (usa /templates).
 * Props: tema, onUseTemplate(template) — callback opcional ao "usar" um template.
 */
export default function TemplatesManager({ tema = 'dark', onUseTemplate }) {
  const isDark = tema === 'dark';
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState(null);
  const [form, setForm] = useState({ tipo: 'treino', nome: '', descricao: '', conteudo: '' });

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/templates');
      setTemplates(res?.data?.templates || []);
    } catch (e) {
      setErro('Erro ao carregar templates.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async () => {
    if (!form.nome.trim()) { setErro('Dê um nome ao template.'); return; }
    setSaving(true);
    setErro(null);
    try {
      const res = await api.post('/templates/salvar', {
        tipo: form.tipo,
        nome: form.nome,
        descricao: form.descricao,
        conteudo: form.conteudo,
      });
      setTemplates(res?.data?.templates || []);
      setForm({ tipo: 'treino', nome: '', descricao: '', conteudo: '' });
    } catch (e) {
      setErro('Erro ao salvar template.');
    } finally {
      setSaving(false);
    }
  };

  const remover = async (templateId) => {
    try {
      const res = await api.post('/templates/deletar', { templateId });
      setTemplates(res?.data?.templates || []);
    } catch (e) {
      setErro('Erro ao remover template.');
    }
  };

  const card = isDark ? 'bg-gray-800 text-gray-100' : 'bg-gray-50 text-gray-900';
  const input = isDark ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900';

  return (
    <div className={`${card} p-4 rounded-xl border`}>
      <h2 className="text-lg font-semibold mb-3">Meus templates de treino/dieta</h2>

      {/* Formulário de criação */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-3">
        <select
          value={form.tipo}
          onChange={(e) => setForm(p => ({ ...p, tipo: e.target.value }))}
          className={`rounded-md p-2 text-sm border ${input}`}
        >
          <option value="treino">Treino</option>
          <option value="dieta">Dieta</option>
        </select>
        <input
          value={form.nome}
          onChange={(e) => setForm(p => ({ ...p, nome: e.target.value }))}
          placeholder="Nome do template"
          className={`rounded-md p-2 text-sm border sm:col-span-3 ${input}`}
        />
        <input
          value={form.descricao}
          onChange={(e) => setForm(p => ({ ...p, descricao: e.target.value }))}
          placeholder="Descrição (opcional)"
          className={`rounded-md p-2 text-sm border sm:col-span-4 ${input}`}
        />
        <textarea
          value={form.conteudo}
          onChange={(e) => setForm(p => ({ ...p, conteudo: e.target.value }))}
          placeholder="Conteúdo do modelo (exercícios, refeições, instruções...)"
          rows={3}
          className={`rounded-md p-2 text-sm border sm:col-span-4 resize-y ${input}`}
        />
      </div>

      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={salvar}
          disabled={saving}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${
            saving ? 'bg-gray-500 text-gray-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {saving ? <FiSave /> : <FiPlus />} {saving ? 'Salvando...' : 'Adicionar template'}
        </button>
        {erro && <span className="text-red-500 text-sm">{erro}</span>}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-sm text-gray-500">Carregando...</div>
      ) : templates.length === 0 ? (
        <div className="text-sm text-gray-500">Nenhum template ainda. Crie o primeiro acima.</div>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t.templateId} className={`p-3 rounded-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${t.tipo === 'dieta' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}`}>
                      {t.tipo}
                    </span>
                    <span className="font-medium">{t.nome}</span>
                  </div>
                  {t.descricao && <div className="text-xs text-gray-400 mt-1">{t.descricao}</div>}
                  {t.conteudo && <div className="text-sm whitespace-pre-wrap mt-1">{String(t.conteudo)}</div>}
                </div>
                <div className="flex gap-2">
                  {onUseTemplate && (
                    <button onClick={() => onUseTemplate(t)} title="Usar" className="text-xs px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1">
                      <FiCopy /> Usar
                    </button>
                  )}
                  <button onClick={() => remover(t.templateId)} title="Remover" className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 flex items-center gap-1">
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
