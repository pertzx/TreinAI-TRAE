import React, { useEffect, useState } from 'react'
import api from '../../../../Api'

/**
 * Painel admin dos planos (exibidos em Configurações). Cria/edita tudo:
 * priceId do Stripe, preço-texto, tipo (recorrente/único/cortesia) e as flags
 * de acesso que controlam o sistema (nutriAI, painel Coach, sem anúncios, editar treinos).
 */
const ACCENT_OPTIONS = ['gray', 'blue', 'purple', 'emerald']
const TIPO_OPTIONS = [
  { value: 'recorrente', label: 'Recorrente (mensal)' },
  { value: 'unico', label: 'Único (pago 1x, recomprável)' },
  { value: 'cortesia', label: 'Cortesia (grátis, 1x)' },
]
const ACCESS_FIELDS = [
  { key: 'nutriAI', label: 'NutriAI' },
  { key: 'coachPanel', label: 'Painel Coach' },
  { key: 'semAnuncios', label: 'Sem anúncios' },
  { key: 'editarTreinos', label: 'Editar treinos' },
]

const emptyNovo = () => ({ key: '', name: '', tipo: 'recorrente', priceId: '', precoText: '', accent: 'blue', active: true })

// Definido FORA do componente: se ficasse dentro, seria recriado a cada render
// e os inputs perderiam o foco a cada tecla.
const Field = ({ label, children }) => (
  <div>
    <label className="block text-[11px] font-medium mb-1">{label}</label>
    {children}
  </div>
)

const AdminPlanos = ({ user, tema = 'dark' }) => {
  const isDark = tema === 'dark'
  const adminId = user?._id

  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState(null)
  const [status, setStatus] = useState({})
  const [novo, setNovo] = useState(emptyNovo())

  const inputCls = isDark ? 'bg-gray-700 text-gray-100 border-gray-600' : 'bg-white text-gray-900 border-gray-300'

  const carregar = async () => {
    setLoading(true)
    try {
      const res = await api.post('/admin/plans', { adminId })
      setPlans(Array.isArray(res?.data?.plans) ? res.data.plans : [])
    } catch (e) { setPlans([]) } finally { setLoading(false) }
  }

  useEffect(() => { if (adminId) carregar() /* eslint-disable-next-line */ }, [adminId])

  const setField = (key, field, value) => setPlans(prev => prev.map(p => p.key === key ? { ...p, [field]: value } : p))
  const setAccess = (key, flag, value) => setPlans(prev => prev.map(p => p.key === key ? { ...p, access: { ...(p.access || {}), [flag]: value } } : p))

  const setFeature = (key, idx, field, value) => {
    setPlans(prev => prev.map(p => {
      if (p.key !== key) return p
      const features = [...(p.features || [])]
      features[idx] = { ...features[idx], [field]: value }
      return { ...p, features }
    }))
  }
  const addFeature = (key) => setPlans(prev => prev.map(p => p.key === key ? { ...p, features: [...(p.features || []), { text: '', included: true, highlight: false }] } : p))
  const removeFeature = (key, idx) => setPlans(prev => prev.map(p => p.key === key ? { ...p, features: (p.features || []).filter((_, i) => i !== idx) } : p))

  const salvar = async (plan) => {
    setSavingKey(plan.key)
    setStatus(s => ({ ...s, [plan.key]: null }))
    try {
      const payload = {
        adminId, key: plan.key,
        name: plan.name, subtitle: plan.subtitle, description: plan.description,
        priceId: plan.priceId ?? '', precoText: plan.precoText ?? '',
        tipo: plan.tipo || 'recorrente',
        courtesyBudgetBRL: Number(plan.courtesyBudgetBRL) || 0,
        priceBRL: Number(plan.priceBRL) || 0,
        originalPriceBRL: plan.originalPriceBRL === '' || plan.originalPriceBRL == null ? null : Number(plan.originalPriceBRL),
        periodLabel: plan.periodLabel, buttonText: plan.buttonText, accent: plan.accent,
        popular: !!plan.popular, active: plan.active !== false, sortOrder: Number(plan.sortOrder) || 0,
        access: plan.access || {},
        features: (plan.features || []).filter(f => (f.text || '').trim()),
      }
      const res = await api.post('/admin/update-plan', payload)
      if (res?.data?.plan) setPlans(prev => prev.map(p => p.key === plan.key ? res.data.plan : p))
      setStatus(s => ({ ...s, [plan.key]: 'ok' }))
      setTimeout(() => setStatus(s => ({ ...s, [plan.key]: null })), 2500)
    } catch (e) {
      setStatus(s => ({ ...s, [plan.key]: 'erro' }))
    } finally { setSavingKey(null) }
  }

  const remover = async (key) => {
    if (!window.confirm(`Remover o plano "${key}"? Usuários nesse plano mantêm o snapshot de acesso até trocar.`)) return
    try { await api.post('/admin/delete-plan', { adminId, key }); setPlans(prev => prev.filter(p => p.key !== key)) } catch (e) { /* noop */ }
  }

  const criar = async () => {
    if (!novo.key || !novo.name) { setStatus(s => ({ ...s, __novo: 'key e nome são obrigatórios' })); return }
    try {
      const res = await api.post('/admin/create-plan', { adminId, ...novo, sortOrder: (plans.length + 1) })
      if (res?.data?.plan) { setPlans(prev => [...prev, res.data.plan]); setNovo(emptyNovo()); setStatus(s => ({ ...s, __novo: null })) }
    } catch (e) {
      setStatus(s => ({ ...s, __novo: e?.response?.data?.msg || 'Erro ao criar' }))
      setTimeout(() => setStatus(s => ({ ...s, __novo: null })), 3000)
    }
  }

  if (loading) return <div className="text-sm text-gray-400">Carregando planos...</div>

  return (
    <div className="space-y-6">
      <div className="text-[11px] text-gray-400">
        As flags de acesso controlam o sistema de verdade. O <b>priceId</b> é do Stripe (usado no checkout). Planos aparecem em <b>Dashboard → Configurações</b>.
      </div>

      {plans.map(plan => (
        <div key={plan.key} className={`p-4 rounded-xl border ${isDark ? 'border-gray-700 bg-gray-800/40' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold uppercase">{plan.key}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-500/20">{plan.tipo || 'recorrente'}</span>
              {plan.active === false && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">oculto</span>}
              {plan.popular && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">popular</span>}
            </div>
            <button onClick={() => remover(plan.key)} className="text-xs text-red-400 hover:text-red-300">Remover</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <Field label="Nome"><input value={plan.name || ''} onChange={e => setField(plan.key, 'name', e.target.value)} className={`w-full rounded-md p-2 text-sm border ${inputCls}`} /></Field>
            <Field label="Tipo">
              <select value={plan.tipo || 'recorrente'} onChange={e => setField(plan.key, 'tipo', e.target.value)} className={`w-full rounded-md p-2 text-sm border ${inputCls}`}>
                {TIPO_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Stripe priceId"><input value={plan.priceId || ''} onChange={e => setField(plan.key, 'priceId', e.target.value)} placeholder="price_..." className={`w-full rounded-md p-2 text-sm border ${inputCls}`} /></Field>
            <Field label="Preço (texto exibido)"><input value={plan.precoText || ''} onChange={e => setField(plan.key, 'precoText', e.target.value)} placeholder="R$ 30/mês" className={`w-full rounded-md p-2 text-sm border ${inputCls}`} /></Field>
            <Field label="Subtítulo"><input value={plan.subtitle || ''} onChange={e => setField(plan.key, 'subtitle', e.target.value)} className={`w-full rounded-md p-2 text-sm border ${inputCls}`} /></Field>
            <Field label="Descrição"><input value={plan.description || ''} onChange={e => setField(plan.key, 'description', e.target.value)} className={`w-full rounded-md p-2 text-sm border ${inputCls}`} /></Field>
            <Field label="Texto do botão"><input value={plan.buttonText || ''} onChange={e => setField(plan.key, 'buttonText', e.target.value)} className={`w-full rounded-md p-2 text-sm border ${inputCls}`} /></Field>
            <Field label="Cor">
              <select value={plan.accent || 'blue'} onChange={e => setField(plan.key, 'accent', e.target.value)} className={`w-full rounded-md p-2 text-sm border ${inputCls}`}>
                {ACCENT_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>
            {plan.tipo === 'cortesia' && (
              <Field label="Saldo cortesia (R$)"><input type="number" step="0.01" min="0" value={plan.courtesyBudgetBRL ?? 0} onChange={e => setField(plan.key, 'courtesyBudgetBRL', e.target.value)} className={`w-full rounded-md p-2 text-sm border ${inputCls}`} /></Field>
            )}
            <Field label="Ordem"><input type="number" value={plan.sortOrder ?? 0} onChange={e => setField(plan.key, 'sortOrder', e.target.value)} className={`w-full rounded-md p-2 text-sm border ${inputCls}`} /></Field>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={!!plan.popular} onChange={e => setField(plan.key, 'popular', e.target.checked)} /> Popular</label>
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={plan.active !== false} onChange={e => setField(plan.key, 'active', e.target.checked)} /> Ativo</label>
            </div>
          </div>

          {/* Flags de acesso */}
          <div className="mb-3">
            <div className="text-xs font-semibold mb-2">Acesso liberado por este plano</div>
            <div className="flex flex-wrap gap-4">
              {ACCESS_FIELDS.map(f => (
                <label key={f.key} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={!!plan.access?.[f.key]} onChange={e => setAccess(plan.key, f.key, e.target.checked)} />
                  {f.label}
                </label>
              ))}
            </div>
          </div>

          {/* Bullets extras de exibição */}
          <div className="mb-3">
            <div className="text-xs font-semibold mb-2">Bullets extras (exibição)</div>
            <div className="space-y-2">
              {(plan.features || []).map((f, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input value={f.text || ''} onChange={e => setFeature(plan.key, idx, 'text', e.target.value)} className={`flex-1 rounded-md p-2 text-sm border ${inputCls}`} placeholder="Texto" />
                  <label className="flex items-center gap-1 text-[11px]"><input type="checkbox" checked={f.included !== false} onChange={e => setFeature(plan.key, idx, 'included', e.target.checked)} /> tem</label>
                  <label className="flex items-center gap-1 text-[11px]"><input type="checkbox" checked={!!f.highlight} onChange={e => setFeature(plan.key, idx, 'highlight', e.target.checked)} /> destaque</label>
                  <button onClick={() => removeFeature(plan.key, idx)} className="px-1 text-red-400 hover:text-red-300">✕</button>
                </div>
              ))}
            </div>
            <button onClick={() => addFeature(plan.key)} className="mt-2 text-xs text-blue-400 hover:text-blue-300">+ Adicionar bullet</button>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => salvar(plan)} disabled={savingKey === plan.key} className={`px-4 py-2 rounded-lg text-sm font-semibold ${savingKey === plan.key ? 'bg-gray-500 text-gray-300' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
              {savingKey === plan.key ? 'Salvando...' : `Salvar ${plan.name}`}
            </button>
            {status[plan.key] === 'ok' && <span className="text-green-500 text-sm">Salvo!</span>}
            {status[plan.key] === 'erro' && <span className="text-red-500 text-sm">Erro ao salvar.</span>}
          </div>
        </div>
      ))}

      {/* Criar novo plano */}
      <div className={`p-4 rounded-xl border-2 border-dashed ${isDark ? 'border-gray-600' : 'border-gray-300'}`}>
        <div className="text-sm font-semibold mb-2">+ Novo plano</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2 items-end">
          <input placeholder="key (ex.: anual)" value={novo.key} onChange={e => setNovo({ ...novo, key: e.target.value })} className={`rounded-md p-2 text-sm border ${inputCls}`} />
          <input placeholder="nome" value={novo.name} onChange={e => setNovo({ ...novo, name: e.target.value })} className={`rounded-md p-2 text-sm border ${inputCls}`} />
          <select value={novo.tipo} onChange={e => setNovo({ ...novo, tipo: e.target.value })} className={`rounded-md p-2 text-sm border ${inputCls}`}>
            {TIPO_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input placeholder="priceId (Stripe)" value={novo.priceId} onChange={e => setNovo({ ...novo, priceId: e.target.value })} className={`rounded-md p-2 text-sm border ${inputCls}`} />
          <input placeholder="preço texto" value={novo.precoText} onChange={e => setNovo({ ...novo, precoText: e.target.value })} className={`rounded-md p-2 text-sm border ${inputCls}`} />
        </div>
        <div className="flex items-center gap-3 mt-2">
          <button onClick={criar} className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">Criar plano</button>
          {status.__novo && <span className="text-red-500 text-sm">{status.__novo}</span>}
          <span className="text-[11px] text-gray-400">Depois de criar, ajuste as flags de acesso e salve.</span>
        </div>
      </div>
    </div>
  )
}

export default AdminPlanos
