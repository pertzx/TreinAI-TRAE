import React, { useEffect, useMemo, useState } from 'react'
import api from '../../../Api'
import { useToast } from '../../../components/Toast'

// SupportPage
// Props: tema (string 'dark'|'light' or object de classes Tailwind), user (objeto com _id e email)
// Funcionalidades:
// - busca paginada de supports via GET /supports (query: page, perPage, search)
// - cria novo pedido de suporte via POST /supports
// - usa props tema para cores/fallbacks

const fallbackTheme = {
  bg: 'bg-white',
  cardBg: 'bg-gray-50',
  text: 'text-gray-900',
  muted: 'text-gray-600',
  primary: 'text-indigo-600',
  border: 'border-gray-200'
}
const darkTheme = {
  bg: 'bg-gray-900',
  cardBg: 'bg-gray-800',
  text: 'text-gray-100',
  muted: 'text-gray-300',
  primary: 'text-indigo-300',
  border: 'border-gray-700'
}
const getTheme = (tema) => {
  if (!tema) return fallbackTheme
  if (typeof tema === 'string') return tema === 'dark' ? darkTheme : fallbackTheme
  return {
    bg: tema.bg || fallbackTheme.bg,
    cardBg: tema.cardBg || fallbackTheme.cardBg,
    text: tema.text || fallbackTheme.text,
    muted: tema.muted || fallbackTheme.muted,
    primary: tema.primary || fallbackTheme.primary,
    border: tema.border || fallbackTheme.border
  }
}

const formatDate = (iso) => {
  if (!iso) return '-'
  try { return new Date(iso).toLocaleString() } catch (e) { return iso }
}

export default function SupportPage({ tema, user }) {
  const theme = getTheme(tema)

  const [supports, setSupports] = useState([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')

  // busca/pagination
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [total, setTotal] = useState(0)

  // form support
  const [assunto, setAssunto] = useState('')
  const [descricao, setDescricao] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { showError, showSuccess } = useToast();

  const fetchSupports = async (opts = {}) => {
    try {
      setLoading(true)
      setErro('')
      const p = opts.page ?? page
      const pp = opts.perPage ?? perPage
      const s = opts.search ?? search
      const res = await api.get('/supports', { params: { page: p, perPage: pp, search: s } })
      if (res?.data?.success) {
        setSupports(res.data.supports || [])
        setTotal(res.data.pagination?.total ?? (res.data.supports || []).length)
        // sync pagination if caller provided different page/perPage
        if (opts.page) setPage(p)
        if (opts.perPage) setPerPage(pp)
      } else {
        setErro(res?.data?.msg || 'Erro ao buscar supports')
      }
    } catch (error) {
      console.error(error)
      setErro(error?.message || 'Erro de requisição')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSupports() }, [])

  // handle create support
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!assunto || !descricao) return setErro('Assunto e descrição são obrigatórios')
    if (!user || !user._id || !user.email) return setErro('Usuário inválido')

    try {
      setSubmitting(true)
      setErro('')
      const payload = { userId: user._id, userEmail: user.email, assunto, descricao }
      const res = await api.post('/supports', payload)
      if (res?.data?.success) {
        setMsg('Suporte enviado com sucesso. Aguarde a sua resposta via email.')
        showSuccess('Suporte enviado com sucesso. Aguarde a sua resposta via email.')
        setAssunto('')
        setDescricao('')
        // recarrega a primeira página (públicos)
        fetchSupports({ page: 1 })
      } else {
        setErro(res?.data?.msg || 'Erro ao enviar suporte')
        showError(res?.data?.msg || 'Erro ao enviar suporte')
      }
    } catch (error) {
      console.error(error)
      setErro(error?.message || error?.response?.data?.msg || 'Erro ao enviar suporte')
      showError(error?.message || error?.response?.data?.msg || 'Erro ao enviar suporte')
    } finally {
      setSubmitting(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage))

  return (
    <div className={`p-4 ${theme.bg} ${theme.text} transition-all duration-300 ease-in-out`}>
      {/* Mensagens de erro e sucesso com animações */}
      {erro && (
        <div className={`mb-3 text-sm border rounded-lg p-3 animate-pulse transition-all duration-300 ease-in-out transform hover:scale-[1.02] ${theme.bg === 'bg-gray-900' ? 'text-red-300 bg-red-900/20 border-red-800' : 'text-red-700 bg-red-50 border-red-200'}`}>
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {erro}
          </div>
        </div>
      )}
      {msg && (
        <div className={`mb-3 text-sm border rounded-lg p-3 animate-pulse transition-all duration-300 ease-in-out transform hover:scale-[1.02] ${theme.bg === 'bg-gray-900' ? 'text-green-300 bg-green-900/20 border-green-800' : 'text-green-700 bg-green-50 border-green-200'}`}>
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {msg}
          </div>
        </div>
      )}

      {/* formulário de novo suporte com animações */}
      <form onSubmit={handleSubmit} className={`mb-6 p-6 rounded-xl ${theme.cardBg} ${theme.border} border shadow-sm hover:shadow-md transition-all duration-300 ease-in-out transform hover:scale-[1.01] animate-fade-in`}>
        <h3 className={`text-xl font-semibold mb-4 flex items-center ${theme.text}`}>
          <svg className={`w-5 h-5 mr-2 ${theme.primary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Abrir novo pedido de suporte
        </h3>
        
        <div className="space-y-4">
          <div className="transform transition-all duration-200 ease-in-out hover:translate-x-1">
            <label className={`block text-sm font-medium mb-2 ${theme.muted}`}>Seu email</label>
            <input 
              className={`w-full px-4 py-3 rounded-lg border ${theme.border} ${theme.cardBg} ${theme.muted} cursor-not-allowed transition-all duration-200 ease-in-out focus:ring-2 focus:ring-blue-500 focus:border-transparent`} 
              value={user?.email || ''} 
              readOnly 
            />
          </div>
          
          <div className="transform transition-all duration-200 ease-in-out hover:translate-x-1">
            <label className={`block text-sm font-medium mb-2 ${theme.muted}`}>Assunto</label>
            <input 
              className={`w-full px-4 py-3 rounded-lg border ${theme.border} ${theme.cardBg} ${theme.text} transition-all duration-200 ease-in-out focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-400 focus:scale-[1.02]`} 
              value={assunto} 
              onChange={e => setAssunto(e.target.value)} 
              placeholder="Ex: Erro no pagamento" 
            />
          </div>
          
          <div className="transform transition-all duration-200 ease-in-out hover:translate-x-1">
            <label className={`block text-sm font-medium mb-2 ${theme.muted}`}>Descrição</label>
            <textarea 
              className={`w-full px-4 py-3 rounded-lg border ${theme.border} ${theme.cardBg} ${theme.text} transition-all duration-200 ease-in-out focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-400 focus:scale-[1.02] resize-none`} 
              value={descricao} 
              onChange={e => setDescricao(e.target.value)} 
              rows={4} 
              placeholder="Descreva o problema..." 
            />
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button 
            disabled={submitting} 
            className="px-6 py-3 rounded-lg bg-blue-600 text-white font-medium transition-all duration-200 ease-in-out hover:bg-blue-700 hover:scale-105 focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-sm hover:shadow-md"
          >
            {submitting ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Enviando...
              </div>
            ) : 'Enviar suporte'}
          </button>
          <button 
            type="button" 
            onClick={() => { setAssunto(''); setDescricao(''); }} 
            className={`px-6 py-3 rounded-lg border ${theme.border} ${theme.text} font-medium transition-all duration-200 ease-in-out hover:${theme.cardBg} hover:scale-105 focus:ring-4 focus:ring-gray-200 shadow-sm hover:shadow-md`}
          >
            Limpar
          </button>
        </div>
      </form>

      {/* busca e paginação com animações */}
      <div className={`mb-6 p-4 rounded-xl ${theme.cardBg} border ${theme.border} shadow-sm hover:shadow-md transition-all duration-300 ease-in-out`}>
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 w-full">
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="🔍 Pesquisar assunto/descrição" 
              className={`w-full px-4 py-3 rounded-lg border ${theme.border} ${theme.cardBg} ${theme.text} transition-all duration-200 ease-in-out focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-400 focus:scale-[1.02]`} 
            />
          </div>
          <button 
            onClick={() => fetchSupports({ page: 1 })} 
            className={`px-6 py-3 rounded-lg ${theme.cardBg} border ${theme.border} ${theme.text} font-medium transition-all duration-200 ease-in-out hover:${theme.bg} hover:scale-105 focus:ring-4 focus:ring-gray-200 shadow-sm hover:shadow-md`}
          >
            Buscar
          </button>
          <div className="flex items-center gap-2">
            <label className={`text-sm font-medium ${theme.muted}`}>Itens / página</label>
            <select 
              value={perPage} 
              onChange={e => { setPerPage(Number(e.target.value)); setPage(1); fetchSupports({ perPage: Number(e.target.value), page: 1 }) }} 
              className={`px-3 py-2 rounded-lg border ${theme.border} ${theme.cardBg} ${theme.text} transition-all duration-200 ease-in-out focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-400`}
            >
              {[5,10,20,50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* lista de supports com animações */}
      {loading ? (
        <div className="p-8 text-center">
          <div className="inline-flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className={`${theme.muted} font-medium`}>Carregando...</span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {supports.map((s, index) => (
            <div 
              key={s._id} 
              className={`p-5 rounded-xl ${theme.cardBg} ${theme.border} border shadow-sm hover:shadow-md transition-all duration-300 ease-in-out transform hover:scale-[1.02] animate-fade-in-up`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-10 h-10 ${theme.bg === 'bg-gray-900' ? 'bg-blue-900/30' : 'bg-blue-100'} rounded-full flex items-center justify-center`}>
                      <svg className={`w-5 h-5 ${theme.bg === 'bg-gray-900' ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-semibold text-lg mb-2 ${theme.text}`}>{s.assunto}</h4>
                      <p className={`text-sm ${theme.muted} leading-relaxed`}>{s.descricao}</p>
                      <div className={`flex items-center gap-4 mt-3 text-xs ${theme.muted}`}>
                        <div className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                          {formatDate(s.respondidoEm)}
                        </div>
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${s.resposta ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                          <span>{s.resposta ? 'Respondido' : 'Pendente'}</span>
                        </div>
                      </div>
                      {s.resposta && (
                        <div className={`mt-3 p-3 border rounded-lg ${theme.bg === 'bg-gray-900' ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'}`}>
                          <p className={`text-sm font-medium ${theme.bg === 'bg-gray-900' ? 'text-green-300' : 'text-green-800'}`}>Resposta:</p>
                          <p className={`text-sm mt-1 ${theme.bg === 'bg-gray-900' ? 'text-green-200' : 'text-green-700'}`}>{s.resposta}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <details className="w-full md:w-1/3 mt-2 md:mt-0">
                  <summary className={`cursor-pointer text-sm ${theme.primary} hover:opacity-80 underline transition-colors duration-200 font-medium`}>Mostrar detalhes</summary>
                  <pre className={`mt-3 max-h-44 overflow-auto text-xs p-3 rounded-lg border ${theme.bg === 'bg-gray-900' ? 'bg-gray-800 text-green-400 border-gray-700' : 'bg-gray-900 text-green-400 border-gray-300'} font-mono`}>{JSON.stringify(s, null, 2)}</pre>
                </details>
              </div>
            </div>
          ))}

          {supports.length === 0 && (
            <div className="p-12 text-center">
              <div className={`w-16 h-16 mx-auto mb-4 ${theme.cardBg} rounded-full flex items-center justify-center`}>
                <svg className={`w-8 h-8 ${theme.muted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className={`${theme.muted} font-medium`}>Nenhum pedido de suporte público encontrado.</p>
              <p className={`${theme.muted} text-sm mt-1 opacity-75`}>Seja o primeiro a criar um ticket de suporte!</p>
            </div>
          )}
        </div>
      )}

      {/* paginação com animações */}
      <div className={`mt-8 p-4 rounded-xl ${theme.cardBg} border ${theme.border} shadow-sm`}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button 
              disabled={page===1} 
              onClick={() => { setPage(1); fetchSupports({ page: 1 }) }} 
              className={`px-4 py-2 rounded-lg border ${theme.border} ${theme.text} font-medium transition-all duration-200 ease-in-out hover:${theme.bg} hover:scale-105 focus:ring-4 focus:ring-gray-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-sm hover:shadow-md`}
            >
              Primeiro
            </button>
            <button 
              disabled={page===1} 
              onClick={() => { const np = Math.max(1, page-1); setPage(np); fetchSupports({ page: np }) }} 
              className={`px-4 py-2 rounded-lg border ${theme.border} ${theme.text} font-medium transition-all duration-200 ease-in-out hover:${theme.bg} hover:scale-105 focus:ring-4 focus:ring-gray-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-sm hover:shadow-md`}
            >
              Anterior
            </button>
            <div className={`px-4 py-2 ${theme.bg === 'bg-gray-900' ? 'bg-blue-900/30 text-blue-300 border-blue-800' : 'bg-blue-50 text-blue-700 border-blue-200'} font-semibold rounded-lg border`}>
              {page} / {totalPages}
            </div>
            <button 
              disabled={page===totalPages} 
              onClick={() => { const np = Math.min(totalPages, page+1); setPage(np); fetchSupports({ page: np }) }} 
              className={`px-4 py-2 rounded-lg border ${theme.border} ${theme.text} font-medium transition-all duration-200 ease-in-out hover:${theme.bg} hover:scale-105 focus:ring-4 focus:ring-gray-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-sm hover:shadow-md`}
            >
              Próximo
            </button>
            <button 
              disabled={page===totalPages} 
              onClick={() => { setPage(totalPages); fetchSupports({ page: totalPages }) }} 
              className={`px-4 py-2 rounded-lg border ${theme.border} ${theme.text} font-medium transition-all duration-200 ease-in-out hover:${theme.bg} hover:scale-105 focus:ring-4 focus:ring-gray-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-sm hover:shadow-md`}
            >
              Último
            </button>
          </div>

          <div className={`flex items-center gap-2 text-sm ${theme.muted}`}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Total: {total} tickets</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out both;
        }
      `}</style>
    </div>
  )
}
