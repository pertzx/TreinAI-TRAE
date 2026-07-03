import React, { useEffect, useState } from 'react'
import api from '../../../../Api'

/**
 * Painel admin dos planos comerciais (landing /planos).
 * Edita nome, preço de exibição, descrição, features (tem/não tem), destaque,
 * ordem e visibilidade. O preço realmente cobrado continua vindo do Stripe.
 */
const ACCENT_OPTIONS = ['gray', 'blue', 'purple', 'emerald']

const AdminPlanos = ({ user, tema = 'dark' }) => {
  const isDark = tema === 'dark'
  const adminId = user?._id

  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState(null)
  const [status, setStatus] = useState({}) // { [key]: 'ok' | 'erro' }

  const inputCls = isDark
    ? 'bg-gray-700 text-gray-100 border-gray-600'
    : 'bg-white text-gray-900 border-gray-300'

  const carregar = async () => {
    setLoading(true)
    try {
      const res = await api.post('/admin/plans', { adminId })
      setPlans(Array.isArray(res?.data?.plans) ? res.data.plans : [])
    } catch (e) {
      setPlans([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (adminId) carregar() /* eslint-disable-next-line */ }, [adminId])

  const setField = (key, field, value) => {
    setPlans(prev => prev.map(p => p.key === key ? { ...p, [field]: value } : p))
  }

  const setFeature = (key, idx, field, value) => {
    setPlans(prev => prev.map(p => {
      if (p.key !== key) return p
      const features = [...(p.features || [])]
      features[idx] = { ...features[idx], [field]: value }
      return { ...p, features }
    }))
  }

  const addFeature = (key) => {
    setPlans(prev => prev.map(p => p.key === key
      ? { ...p, features: [...(p.features || []), { text: '', included: true, highlight: false }] }
      : p))
  }

  const removeFeature = (key, idx) => {
    setPlans(prev => prev.map(p => p.key === key
      ? { ...p, features: (p.features || []).filter((_, i) => i !== idx) }
      : p))
  }

  const moveFeature = (key, idx, dir) => {
    setPlans(prev => prev.map(p => {
      if (p.key !== key) return p
      const features = [...(p.features || [])]
      const j = idx + dir
      if (j < 0 || j >= features.length) return p
      ;[features[idx], features[j]] = [features[j], features[idx]]
      return { ...p, features }
    }))
  }

  const salvar = async (plan) => {
    setSavingKey(plan.key)
    setStatus(s => ({ ...s, [plan.key]: null }))
    try {
      const payload = {
        adminId,
        key: plan.key,
        name: plan.name,
        subtitle: plan.subtitle,
        description: plan.description,
        priceBRL: Number(plan.priceBRL) || 0,
        originalPriceBRL: plan.originalPriceBRL === '' || plan.originalPriceBRL == null ? null : Number(plan.originalPriceBRL),
        periodLabel: plan.periodLabel,
        buttonText: plan.buttonText,
        accent: plan.accent,
        popular: !!plan.popular,
        isProfessional: !!plan.isProfessional,
        active: plan.active !== false,
        sortOrder: Number(plan.sortOrder) || 0,
        features: (plan.features || []).filter(f => (f.text || '').trim()),
      }
      const res = await api.post('/admin/update-plan', payload)
      if (res?.data?.plan) {
        setPlans(prev => prev.map(p => p.key === plan.key ? res.data.plan : p))
      }
      setStatus(s => ({ ...s, [plan.key]: 'ok' }))
      setTimeout(() => setStatus(s => ({ ...s, [plan.key]: null })), 2500)
    } catch (e) {
      setStatus(s => ({ ...s, [plan.key]: 'erro' }))
    } finally {
      setSavingKey(null)
    }
  }

  if (loading) return <div className="text-sm text-gray-400">Carregando planos...</div>
  if (!plans.length) return <div className="text-sm text-red-500">Nenhum plano encontrado. Rode o seed: <code>node scripts/seedPlans.js</code>.</div>

  const Field = ({ label, children }) => (
    <div>
      <label className="block text-xs font-medium mb-1">{label}</label>
      {children}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="text-[11px] text-gray-400">
        O preço aqui é só de <b>exibição</b>. O valor realmente cobrado vem do Stripe (não muda o checkout).
      </div>

      {plans.map(plan => (
        <div key={plan.key} className={`p-4 rounded-xl border ${isDark ? 'border-gray-700 bg-gray-800/40' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold uppercase">{plan.key}</span>
              {plan.active === false && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">oculto</span>}
              {plan.popular && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">popular</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <Field label="Nome">
              <input value={plan.name || ''} onChange={e => setField(plan.key, 'name', e.target.value)}
                className={`w-full rounded-md p-2 text-sm border ${inputCls}`} />
            </Field>
            <Field label="Preço (R$)">
              <input type="number" step="0.01" min="0" value={plan.priceBRL ?? 0}
                onChange={e => setField(plan.key, 'priceBRL', e.target.value)}
                className={`w-full rounded-md p-2 text-sm border ${inputCls}`} />
            </Field>
            <Field label="Preço original (riscado)">
              <input type="number" step="0.01" min="0" value={plan.originalPriceBRL ?? ''}
                onChange={e => setField(plan.key, 'originalPriceBRL', e.target.value)}
                className={`w-full rounded-md p-2 text-sm border ${inputCls}`} placeholder="opcional" />
            </Field>
            <Field label="Período">
              <input value={plan.periodLabel || ''} onChange={e => setField(plan.key, 'periodLabel', e.target.value)}
                className={`w-full rounded-md p-2 text-sm border ${inputCls}`} placeholder="/mês" />
            </Field>
            <Field label="Subtítulo">
              <input value={plan.subtitle || ''} onChange={e => setField(plan.key, 'subtitle', e.target.value)}
                className={`w-full rounded-md p-2 text-sm border ${inputCls}`} />
            </Field>
            <Field label="Descrição">
              <input value={plan.description || ''} onChange={e => setField(plan.key, 'description', e.target.value)}
                className={`w-full rounded-md p-2 text-sm border ${inputCls}`} />
            </Field>
            <Field label="Texto do botão">
              <input value={plan.buttonText || ''} onChange={e => setField(plan.key, 'buttonText', e.target.value)}
                className={`w-full rounded-md p-2 text-sm border ${inputCls}`} />
            </Field>
            <Field label="Cor (acento)">
              <select value={plan.accent || 'blue'} onChange={e => setField(plan.key, 'accent', e.target.value)}
                className={`w-full rounded-md p-2 text-sm border ${inputCls}`}>
                {ACCENT_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>
            <Field label="Ordem">
              <input type="number" value={plan.sortOrder ?? 0} onChange={e => setField(plan.key, 'sortOrder', e.target.value)}
                className={`w-full rounded-md p-2 text-sm border ${inputCls}`} />
            </Field>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" checked={!!plan.popular} onChange={e => setField(plan.key, 'popular', e.target.checked)} />
                Popular
              </label>
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" checked={plan.active !== false} onChange={e => setField(plan.key, 'active', e.target.checked)} />
                Ativo
              </label>
            </div>
          </div>

          {/* Features */}
          <div className="mb-3">
            <div className="text-sm font-semibold mb-2">Funcionalidades</div>
            <div className="space-y-2">
              {(plan.features || []).map((f, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input value={f.text || ''} onChange={e => setFeature(plan.key, idx, 'text', e.target.value)}
                    className={`flex-1 rounded-md p-2 text-sm border ${inputCls}`} placeholder="Texto da funcionalidade" />
                  <label className="flex items-center gap-1 text-[11px] whitespace-nowrap">
                    <input type="checkbox" checked={f.included !== false} onChange={e => setFeature(plan.key, idx, 'included', e.target.checked)} />
                    tem
                  </label>
                  <label className="flex items-center gap-1 text-[11px] whitespace-nowrap">
                    <input type="checkbox" checked={!!f.highlight} onChange={e => setFeature(plan.key, idx, 'highlight', e.target.checked)} />
                    destaque
                  </label>
                  <button onClick={() => moveFeature(plan.key, idx, -1)} className="px-1 text-gray-400 hover:text-white" title="Subir">↑</button>
                  <button onClick={() => moveFeature(plan.key, idx, 1)} className="px-1 text-gray-400 hover:text-white" title="Descer">↓</button>
                  <button onClick={() => removeFeature(plan.key, idx)} className="px-1 text-red-400 hover:text-red-300" title="Remover">✕</button>
                </div>
              ))}
            </div>
            <button onClick={() => addFeature(plan.key)} className="mt-2 text-xs text-blue-400 hover:text-blue-300">+ Adicionar funcionalidade</button>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => salvar(plan)} disabled={savingKey === plan.key}
              className={`px-4 py-2 rounded-lg text-sm font-semibold ${savingKey === plan.key ? 'bg-gray-500 text-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
              {savingKey === plan.key ? 'Salvando...' : `Salvar ${plan.name}`}
            </button>
            {status[plan.key] === 'ok' && <span className="text-green-500 text-sm">Salvo!</span>}
            {status[plan.key] === 'erro' && <span className="text-red-500 text-sm">Erro ao salvar.</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

export default AdminPlanos
