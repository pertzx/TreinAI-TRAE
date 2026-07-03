import React, { useEffect, useState } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import api from '../Api';
import { buildImageUrl } from '../utils/imageUtils';
import PublicFooter from '../components/PublicFooter';

const ESPECIALIDADE_LABEL = {
  'personal-trainner': 'Personal Trainer',
  'fisioterapeuta': 'Fisioterapeuta',
  'nutricionista': 'Nutricionista',
};

export default function PublicProfissional() {
  const { profissionalId } = useParams();
  const [prof, setProf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/profissionais/public/${encodeURIComponent(profissionalId)}`);
        if (cancelled) return;
        if (res?.data?.profissional) setProf(res.data.profissional);
        else setNotFound(true);
      } catch (e) {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profissionalId]);

  useEffect(() => {
    if (prof?.profissionalName) document.title = `${prof.profissionalName} — TreinAI`;
  }, [prof]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
        Carregando perfil...
      </div>
    );
  }

  if (notFound || !prof) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-center px-4">
        <div className="text-5xl mb-4">🕵️</div>
        <h1 className="text-2xl font-bold text-white mb-2">Profissional não encontrado</h1>
        <p className="text-gray-400 mb-6">Este perfil não existe ou foi removido.</p>
        <NavLink to="/" className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold">
          Ir para o TreinAI
        </NavLink>
      </div>
    );
  }

  const local = [prof.city, prof.state, prof.country].filter(Boolean).join(', ');
  const especialidade = ESPECIALIDADE_LABEL[prof.especialidade] || prof.especialidade;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="rounded-3xl overflow-hidden border border-gray-800 bg-gray-900/60 shadow-2xl">
          <div className="h-40 bg-gradient-to-r from-blue-600 to-purple-600 relative">
            {prof.imageUrl && (
              <div
                className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay"
                style={{ backgroundImage: `url(${buildImageUrl(prof.imageUrl)})` }}
              />
            )}
          </div>
          <div className="px-6 pb-8 -mt-16">
            <div className="w-28 h-28 rounded-2xl border-4 border-gray-900 overflow-hidden bg-gray-800 shadow-lg">
              {prof.imageUrl ? (
                <img src={buildImageUrl(prof.imageUrl)} alt={prof.profissionalName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-500">
                  {(prof.profissionalName || 'P')[0]}
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold">{prof.profissionalName}</h1>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 uppercase tracking-wide">
                {especialidade}
              </span>
            </div>

            {local && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {local}
              </div>
            )}

            {prof.biografia && (
              <p className="mt-5 text-gray-300 leading-relaxed whitespace-pre-line">{prof.biografia}</p>
            )}

            <div className="mt-8 rounded-2xl bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20 p-6 text-center">
              <h2 className="text-xl font-bold mb-1">Quer treinar com {prof.profissionalName?.split(' ')[0]}?</h2>
              <p className="text-gray-400 text-sm mb-4">Crie sua conta no TreinAI e comece agora — treino e dieta com IA, acompanhado de perto.</p>
              <NavLink to="/login" className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white font-semibold shadow-lg">
                Quero treinar com este profissional
              </NavLink>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <NavLink to="/" className="text-sm text-gray-500 hover:text-gray-300">← Conhecer o TreinAI</NavLink>
        </div>
      </div>
      <PublicFooter initialMinimized={true} />
    </div>
  );
}
