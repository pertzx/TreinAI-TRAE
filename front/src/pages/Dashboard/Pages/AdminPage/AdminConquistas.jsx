import React, { useEffect, useState } from 'react'
import api from '../../../../Api'

/**
 * Painel admin dos gatilhos de conquista (card compartilhável).
 * Cada gatilho dispara um card quando o usuário bate o marco ao finalizar treino.
 */
const TYPES = [
  { value: 'streak-every', label: 'A cada X dias de sequência' },
  { value: 'streak-exact', label: 'No dia exato de sequência' },
  { value: 'workouts', label: 'Ao atingir X treinos' },
  { value: 'duration-total', label: 'Ao cruzar X segundos totais' },
  { value: 'points', label: 'Ao cruzar X pontos' },
  { value: 'record', label: 'Recorde pessoal (em breve)' },
]

const AdminConquistas = ({ user, tema = 'dark' }) => {
  const isDark = tema === 'dark'
  const adminId = user?._id

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState(null)
  const [status, setStatus] = useState({})
  const [novo, setNovo] = useState({ key: '', type: 'workouts', value: 1, title: '', message: '', emoji: '🏆', active: true, sortOrder: 0 })

  const inputCls = isDark ? 'bg-gray-700 text-gray-100 border-gray-600' : 'bg-white text-gray-900 border-gray-300'

  const carregar = async () => {
    setLoading(true)
    try {
      const res = await api.post('/admin/milestones', { adminId })
      setItems(Array.isArray(res?.data?.milestones) ? res.data.milestones : [])
    } catch (e) { setItems([]) } finally { setLoading(false) }
  }

  useEffect(() => { if (adminId) carregar() /* eslint-disable-next-line */ }, [adminId])

  const setField = (key, field, value) => setItems(prev => prev.map(m => m.key === key ? { ...m, [field]: value } : m))

  const salvar = async (m) => {
    setSavingKey(m.key)
    setStatus(s => ({ ...s, [m.key]: null }))
    try {
      const res = await api.post('/admin/update-milestone', { adminId, ...m })
      if (res?.data?.milestone) setItems(prev => prev.map(x => x.key === m.key ? res.data.milestone : x))
      setStatus(s => ({ ...s, [m.key]: 'ok' }))
      setTimeout(() => setStatus(s => ({ ...s, [m.key]: null })), 2500)
    } catch (e) {
      setStatus(s => ({ ...s, [m.key]: 'erro' }))
    } finally { setSavingKey(null) }
  }

  const remover = async (key) => {
    try {
      await api.post('/admin/delete-milestone', { adminId, key })
      setItems(prev => prev.filter(m => m.key !== key))
    } catch (e) { /* noop */ }
  }

  const criar = async () => {
    if (!novo.key || !novo.title) return
    try {
      const res = await api.post('/admin/create-milestone', { adminId, ...novo })
      if (res?.data?.milestone) {
        setItems(prev => [...prev, res.data.milestone])
        setNovo({ key: '', type: 'workouts', value: 1, title: '', message: '', emoji: '🏆', active: true, sortOrder: 0 })
      }
    } catch (e) {
      setStatus(s => ({ ...s, __novo: e?.response?.data?.msg || 'Erro ao criar' }))
      setTimeout(() => setStatus(s => ({ ...s, __novo: null })), 3000)
    }
  }

  if (loading) return <div className="text-sm text-gray-400">Carregando conquistas...</div>

  const Row = ({ m }) => (
    <div className={`p-3 rounded-xl border ${isDark ? 'border-gray-700 bg-gray-800/40' : 'border-gray-200 bg-gray-50'}`}>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 items-end">
        <div>
          <label className="block text-[11px] mb-1">Key</label>
          <input value={m.key} disabled className={`w-full rounded-md p-2 text-sm border opacity-60 ${inputCls}`} />
        </div>
        <div>
          <label className="block text-[11px] mb-1">Tipo</label>
          <select value={m.type} onChange={e => setField(m.key, 'type', e.target.value)} className={`w-full rounded-md p-2 text-sm border ${inputCls}`}>
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] mb-1">Valor</label>
          <input type="number" value={m.value ?? 0} onChange={e => setField(m.key, 'value', e.target.value)} className={`w-full rounded-md p-2 text-sm border ${inputCls}`} />
        </div>
        <div>
          <label className="block text-[11px] mb-1">Emoji</label>
          <input value={m.emoji || ''} onChange={e => setField(m.key, 'emoji', e.target.value)} className={`w-full rounded-md p-2 text-sm border ${inputCls}`} />
        </div>
        <div>
          <label className="block text-[11px] mb-1">Ordem</label>
          <input type="number" value={m.sortOrder ?? 0} onChange={e => setField(m.key, 'sortOrder', e.target.value)} className={`w-full rounded-md p-2 text-sm border ${inputCls}`} />
        </div>
        <label className="flex items-center gap-1 text-xs mb-2">
          <input type="checkbox" checked={m.active !== false} onChange={e => setField(m.key, 'active', e.target.checked)} /> Ativo
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
        <div>
          <label className="block text-[11px] mb-1">Título</label>
          <input value={m.title || ''} onChange={e => setField(m.key, 'title', e.target.value)} className={`w-full rounded-md p-2 text-sm border ${inputCls}`} />
        </div>
        <div>
          <label className="block text-[11px] mb-1">Mensagem</label>
          <input value={m.message || ''} onChange={e => setField(m.key, 'message', e.target.value)} className={`w-full rounded-md p-2 text-sm border ${inputCls}`} />
        </div>
      </div>
      <div className="flex items-center gap-3 mt-2">
        <button onClick={() => salvar(m)} disabled={savingKey === m.key}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold ${savingKey === m.key ? 'bg-gray-500 text-gray-300' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
          {savingKey === m.key ? 'Salvando...' : 'Salvar'}
        </button>
        <button onClick={() => remover(m.key)} className="px-3 py-1.5 rounded-lg text-sm text-red-400 hover:text-red-300">Remover</button>
        {status[m.key] === 'ok' && <span className="text-green-500 text-sm">Salvo!</span>}
        {status[m.key] === 'erro' && <span className="text-red-500 text-sm">Erro.</span>}
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="text-[11px] text-gray-400">
        Cada gatilho vira um card compartilhável quando o usuário bate o marco ao finalizar um treino.
      </div>

      {items.map(m => <Row key={m.key} m={m} />)}

      {/* Criar novo */}
      <div className={`p-3 rounded-xl border-2 border-dashed ${isDark ? 'border-gray-600' : 'border-gray-300'}`}>
        <div className="text-sm font-semibold mb-2">+ Nova conquista</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 items-end">
          <input placeholder="key única" value={novo.key} onChange={e => setNovo({ ...novo, key: e.target.value })} className={`rounded-md p-2 text-sm border ${inputCls}`} />
          <select value={novo.type} onChange={e => setNovo({ ...novo, type: e.target.value })} className={`rounded-md p-2 text-sm border ${inputCls}`}>
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input type="number" placeholder="valor" value={novo.value} onChange={e => setNovo({ ...novo, value: e.target.value })} className={`rounded-md p-2 text-sm border ${inputCls}`} />
          <input placeholder="emoji" value={novo.emoji} onChange={e => setNovo({ ...novo, emoji: e.target.value })} className={`rounded-md p-2 text-sm border ${inputCls}`} />
          <input placeholder="título" value={novo.title} onChange={e => setNovo({ ...novo, title: e.target.value })} className={`rounded-md p-2 text-sm border ${inputCls}`} />
          <input placeholder="mensagem" value={novo.message} onChange={e => setNovo({ ...novo, message: e.target.value })} className={`rounded-md p-2 text-sm border ${inputCls}`} />
        </div>
        <div className="flex items-center gap-3 mt-2">
          <button onClick={criar} className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">Criar</button>
          {status.__novo && <span className="text-red-500 text-sm">{status.__novo}</span>}
        </div>
      </div>
    </div>
  )
}

export default AdminConquistas
