import React, { useEffect, useState, useCallback } from 'react';
import { FiClipboard, FiSave } from 'react-icons/fi';
import api from '../../../Api';

/**
 * Formulário onde o ALUNO preenche sua própria anamnese (avaliação inicial).
 * Autossuficiente: carrega e salva via API usando a identidade do token.
 * Props: tema
 */
const CAMPOS = [
  { key: 'objetivos', label: 'Quais são seus objetivos?', placeholder: 'Ex.: emagrecer, ganhar massa, melhorar saúde...' },
  { key: 'lesoes', label: 'Possui alguma lesão?', placeholder: 'Ex.: lesão no joelho direito, hérnia de disco...' },
  { key: 'restricoes', label: 'Restrições (médicas/alimentares)', placeholder: 'Ex.: pressão alta, intolerância à lactose...' },
  { key: 'medicamentos', label: 'Usa algum medicamento?', placeholder: 'Liste os medicamentos de uso contínuo' },
  { key: 'experiencia', label: 'Experiência com treino', placeholder: 'Ex.: iniciante, treino há 2 anos...' },
  { key: 'observacoes', label: 'Outras observações', placeholder: 'Qualquer informação relevante' },
];

const emptyForm = () => CAMPOS.reduce((acc, c) => ({ ...acc, [c.key]: '' }), {});

export default function MinhaAnamnese({ tema = 'dark' }) {
  const isDark = tema === 'dark';
  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [preenchidoEm, setPreenchidoEm] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/anamnese');
      const a = res?.data?.anamnese;
      if (a) {
        setForm(CAMPOS.reduce((acc, c) => ({ ...acc, [c.key]: a[c.key] || '' }), {}));
        setPreenchidoEm(a.preenchidoEm || null);
      }
    } catch (e) {
      setStatus('erro');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const handleChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const salvar = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await api.post('/anamnese/salvar', form);
      setPreenchidoEm(res?.data?.anamnese?.preenchidoEm || new Date().toISOString());
      setStatus('ok');
      setTimeout(() => setStatus(null), 2500);
    } catch (e) {
      setStatus('erro');
    } finally {
      setSaving(false);
    }
  };

  const card = isDark ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900';
  const input = isDark ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-gray-50 border-gray-300 text-gray-900';

  return (
    <div className={`max-w-2xl mx-auto p-4 sm:p-6 ${card} min-h-screen`}>
      <div className="flex items-center gap-3 mb-1">
        <FiClipboard className="text-cyan-500 text-2xl" />
        <h1 className="text-2xl font-bold">Minha anamnese</h1>
      </div>
      <p className="text-sm text-gray-400 mb-6">
        Essas informações ajudam seu profissional a montar um plano seguro e personalizado.
      </p>

      {loading ? (
        <div className="text-sm text-gray-500">Carregando...</div>
      ) : (
        <div className="space-y-4">
          {CAMPOS.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium mb-1">{label}</label>
              <textarea
                value={form[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={placeholder}
                rows={2}
                className={`w-full rounded-md p-2 text-sm border resize-y focus:outline-none focus:ring-2 focus:ring-cyan-500/40 ${input}`}
              />
            </div>
          ))}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={salvar}
              disabled={saving}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg font-semibold ${
                saving ? 'bg-gray-500 text-gray-300 cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-700 text-white'
              }`}
            >
              <FiSave /> {saving ? 'Salvando...' : 'Salvar anamnese'}
            </button>
            {status === 'ok' && <span className="text-green-500 text-sm">Salvo!</span>}
            {status === 'erro' && <span className="text-red-500 text-sm">Erro ao salvar.</span>}
            {preenchidoEm && status !== 'ok' && (
              <span className="text-xs text-gray-400">Último: {new Date(preenchidoEm).toLocaleString()}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
