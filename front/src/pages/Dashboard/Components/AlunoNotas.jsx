import React, { useEffect, useState, useCallback } from 'react';
import { FiSave, FiLock } from 'react-icons/fi';
import api from '../../../Api';

/**
 * Notas privadas do profissional sobre um aluno.
 * Carrega e salva sozinho via API. Visível apenas para o profissional.
 *
 * Props:
 *  - alunoId: id do aluno (obrigatório)
 *  - tema: 'dark' | 'light'
 */
export default function AlunoNotas({ alunoId, tema = 'dark' }) {
  const isDark = tema === 'dark';
  const [nota, setNota] = useState('');
  const [original, setOriginal] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // 'ok' | 'erro' | null

  const carregar = useCallback(async () => {
    if (!alunoId) return;
    setLoading(true);
    try {
      const res = await api.post('/aluno/get-nota', { alunoId });
      const value = res?.data?.notasPrivadas || '';
      setNota(value);
      setOriginal(value);
    } catch (e) {
      setStatus('erro');
    } finally {
      setLoading(false);
    }
  }, [alunoId]);

  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await api.post('/aluno/salvar-nota', { alunoId, nota });
      const value = res?.data?.notasPrivadas ?? nota;
      setOriginal(value);
      setStatus('ok');
      setTimeout(() => setStatus(null), 2500);
    } catch (e) {
      setStatus('erro');
    } finally {
      setSaving(false);
    }
  };

  const dirty = nota !== original;

  return (
    <div className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'} p-3 rounded-md border`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold flex items-center gap-2">
          <FiLock className="text-amber-500" /> Notas privadas
          <span className="text-[10px] text-gray-400 font-normal">(só você vê)</span>
        </div>
        <button
          onClick={salvar}
          disabled={saving || !dirty}
          className={`text-xs px-3 py-1 rounded-md flex items-center gap-1 ${
            saving || !dirty
              ? 'bg-gray-400/40 text-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          <FiSave /> {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      <textarea
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        disabled={loading}
        placeholder={loading ? 'Carregando...' : 'Anotações sobre lesões, restrições, evolução, observações de sessão...'}
        rows={5}
        className={`w-full rounded-md p-2 text-sm resize-y ${
          isDark ? 'bg-gray-900 text-gray-100 border-gray-700' : 'bg-white text-gray-900 border-gray-300'
        } border focus:outline-none focus:ring-2 focus:ring-indigo-500/40`}
      />

      <div className="mt-1 h-4 text-[11px]">
        {status === 'ok' && <span className="text-green-500">Notas salvas.</span>}
        {status === 'erro' && <span className="text-red-500">Erro ao salvar/carregar as notas.</span>}
        {status === null && dirty && !loading && <span className="text-amber-500">Alterações não salvas.</span>}
      </div>
    </div>
  );
}
