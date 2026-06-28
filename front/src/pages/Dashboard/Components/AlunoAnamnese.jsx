import React, { useEffect, useState, useCallback } from 'react';
import { FiClipboard } from 'react-icons/fi';
import api from '../../../Api';

/**
 * Visualização (somente leitura) da anamnese de um aluno, para o profissional.
 * Props: alunoId, tema
 */
const CAMPOS = [
  { key: 'objetivos', label: 'Objetivos' },
  { key: 'lesoes', label: 'Lesões' },
  { key: 'restricoes', label: 'Restrições' },
  { key: 'medicamentos', label: 'Medicamentos' },
  { key: 'experiencia', label: 'Experiência' },
  { key: 'observacoes', label: 'Observações' },
];

export default function AlunoAnamnese({ alunoId, tema = 'dark' }) {
  const isDark = tema === 'dark';
  const [anamnese, setAnamnese] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    if (!alunoId) return;
    setLoading(true);
    setErro(false);
    try {
      const res = await api.post('/aluno/anamnese', { alunoId });
      setAnamnese(res?.data?.anamnese || null);
    } catch (e) {
      setErro(true);
    } finally {
      setLoading(false);
    }
  }, [alunoId]);

  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'} p-3 rounded-md border`}>
      <div className="text-sm font-semibold mb-2 flex items-center gap-2">
        <FiClipboard className="text-cyan-500" /> Anamnese do aluno
      </div>

      {loading && <div className="text-xs text-gray-500">Carregando...</div>}
      {erro && <div className="text-xs text-red-500">Erro ao carregar anamnese.</div>}
      {!loading && !erro && !anamnese?.preenchidoEm && (
        <div className="text-xs text-gray-500">O aluno ainda não preencheu a anamnese.</div>
      )}

      {!loading && !erro && anamnese?.preenchidoEm && (
        <div className="space-y-2">
          {CAMPOS.map(({ key, label }) => (
            <div key={key}>
              <div className="text-[11px] uppercase tracking-wide text-gray-400">{label}</div>
              <div className="text-sm whitespace-pre-wrap">{anamnese[key]?.trim() ? anamnese[key] : '—'}</div>
            </div>
          ))}
          <div className="text-[10px] text-gray-400 pt-1">
            Preenchido em {new Date(anamnese.preenchidoEm).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}
