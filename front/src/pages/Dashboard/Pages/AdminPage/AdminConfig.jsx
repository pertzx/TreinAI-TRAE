import React, { useEffect, useState } from 'react'
import api from '../../../../Api'

/**
 * Painel admin do modelo de cobrança de IA por custo (R$).
 * Edita a margem de lucro (principal), cortesia do free, custo de imagem,
 * fallback por plano e preços por modelo.
 */
const AdminConfig = ({ user, tema = 'dark' }) => {
  const isDark = tema === 'dark'
  const adminId = user?._id

  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)

  const inputCls = isDark
    ? 'bg-gray-700 text-gray-100 border-gray-600'
    : 'bg-white text-gray-900 border-gray-300'

  const carregar = async () => {
    setLoading(true)
    try {
      const res = await api.post('/admin/global-settings', { adminId })
      setSettings(res?.data?.settings || null)
    } catch (e) {
      setStatus('erro')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (adminId) carregar() /* eslint-disable-next-line */ }, [adminId])

  const set = (path, value) => {
    setSettings(prev => {
      const next = { ...prev }
      if (path.length === 1) next[path[0]] = value
      else if (path.length === 2) next[path[0]] = { ...next[path[0]], [path[1]]: value }
      return next
    })
  }

  const setModelPrice = (model, field, value) => {
    setSettings(prev => ({
      ...prev,
      modelPricingBRL: {
        ...prev.modelPricingBRL,
        [model]: { ...prev.modelPricingBRL?.[model], [field]: value }
      }
    }))
  }

  const salvar = async () => {
    setSaving(true)
    setStatus(null)
    try {
      const payload = {
        adminId,
        marginMultiplier: Number(settings.marginMultiplier),
        freeCourtesyBudgetBRL: Number(settings.freeCourtesyBudgetBRL),
        imageCostBRL: Number(settings.imageCostBRL),
        planBudgetFallbackBRL: settings.planBudgetFallbackBRL,
        modelPricingBRL: settings.modelPricingBRL,
      }
      const res = await api.post('/admin/update-global-settings', payload)
      setSettings(res?.data?.settings || settings)
      setStatus('ok')
      setTimeout(() => setStatus(null), 2500)
    } catch (e) {
      setStatus('erro')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-sm text-gray-400">Carregando configurações...</div>
  if (!settings) return <div className="text-sm text-red-500">Não foi possível carregar as configurações.</div>

  const models = Object.keys(settings.modelPricingBRL || {})

  const Field = ({ label, children, hint }) => (
    <div>
      <label className="block text-xs font-medium mb-1">{label}</label>
      {children}
      {hint && <div className="text-[11px] text-gray-400 mt-1">{hint}</div>}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Margem — destaque */}
      <div className={`p-4 rounded-xl border ${isDark ? 'border-amber-500/30 bg-amber-400/5' : 'border-amber-300 bg-amber-50'}`}>
        <Field
          label="Margem de lucro (multiplicador)"
          hint="O custo real de cada uso de IA é multiplicado por este valor antes de debitar do orçamento. Ex.: 2 = lucro de ~50% do plano."
        >
          <input
            type="number" step="0.1" min="1"
            value={settings.marginMultiplier ?? 2}
            onChange={e => set(['marginMultiplier'], e.target.value)}
            className={`w-40 rounded-md p-2 text-sm border ${inputCls}`}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Cortesia do plano Free (R$)" hint="Saldo único (não renovável) de IA para usuários free.">
          <input type="number" step="0.01" min="0" value={settings.freeCourtesyBudgetBRL ?? 0}
            onChange={e => set(['freeCourtesyBudgetBRL'], e.target.value)}
            className={`w-full rounded-md p-2 text-sm border ${inputCls}`} />
        </Field>
        <Field label="Custo real por imagem (R$)" hint="Custo de cada geração de imagem (gpt-image-1).">
          <input type="number" step="0.01" min="0" value={settings.imageCostBRL ?? 0}
            onChange={e => set(['imageCostBRL'], e.target.value)}
            className={`w-full rounded-md p-2 text-sm border ${inputCls}`} />
        </Field>
      </div>

      <div>
        <div className="text-sm font-semibold mb-2">Orçamento de segurança por plano (R$)</div>
        <div className="grid grid-cols-3 gap-3">
          {['pro', 'max', 'coach'].map(p => (
            <Field key={p} label={p.toUpperCase()}>
              <input type="number" step="0.01" min="0"
                value={settings.planBudgetFallbackBRL?.[p] ?? 0}
                onChange={e => set(['planBudgetFallbackBRL', p], e.target.value)}
                className={`w-full rounded-md p-2 text-sm border ${inputCls}`} />
            </Field>
          ))}
        </div>
        <div className="text-[11px] text-gray-400 mt-1">Usado só se o valor pago não estiver disponível (evita travar o usuário).</div>
      </div>

      <div>
        <div className="text-sm font-semibold mb-2">Preço real por modelo (R$ por 1M de tokens)</div>
        <div className="space-y-3">
          {models.map(model => (
            <div key={model} className="grid grid-cols-3 gap-3 items-end">
              <div className="text-sm font-mono truncate">{model}</div>
              <Field label="Entrada / 1M">
                <input type="number" step="0.01" min="0"
                  value={settings.modelPricingBRL?.[model]?.inputPer1M ?? 0}
                  onChange={e => setModelPrice(model, 'inputPer1M', e.target.value)}
                  className={`w-full rounded-md p-2 text-sm border ${inputCls}`} />
              </Field>
              <Field label="Saída / 1M">
                <input type="number" step="0.01" min="0"
                  value={settings.modelPricingBRL?.[model]?.outputPer1M ?? 0}
                  onChange={e => setModelPrice(model, 'outputPer1M', e.target.value)}
                  className={`w-full rounded-md p-2 text-sm border ${inputCls}`} />
              </Field>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={salvar} disabled={saving}
          className={`px-5 py-2 rounded-lg font-semibold ${saving ? 'bg-gray-500 text-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
          {saving ? 'Salvando...' : 'Salvar configurações'}
        </button>
        {status === 'ok' && <span className="text-green-500 text-sm">Salvo!</span>}
        {status === 'erro' && <span className="text-red-500 text-sm">Erro ao salvar.</span>}
      </div>
    </div>
  )
}

export default AdminConfig
