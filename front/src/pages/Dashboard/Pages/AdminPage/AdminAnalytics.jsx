import React, { useEffect, useMemo, useState, useCallback } from 'react'
import Chart from 'react-apexcharts'
import api from '../../../../Api'

const brl = (v) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`
const dmLabel = (day) => { const [, m, d] = String(day).split('-'); return `${d}/${m}` }

/**
 * Dashboard de analytics do admin: usuários, planos, receita/lucro de IA e visitas.
 */
const AdminAnalytics = ({ user, tema = 'dark' }) => {
  const isDark = tema === 'dark'
  const adminId = user?._id
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)
  const [erro, setErro] = useState(false)

  const text = isDark ? '#E5E7EB' : '#111827'
  const grid = isDark ? '#374151' : '#E5E7EB'

  const carregar = useCallback(async () => {
    if (!adminId) return
    setLoading(true); setErro(false)
    try {
      const res = await api.post('/admin/analytics', { adminId, days })
      setData(res?.data || null)
    } catch (e) { setErro(true) } finally { setLoading(false) }
  }, [adminId, days])

  useEffect(() => { carregar() }, [carregar])

  const baseChart = useMemo(() => ({
    chart: { toolbar: { show: false }, foreColor: text, background: 'transparent', animations: { enabled: true } },
    grid: { borderColor: grid, strokeDashArray: 3 },
    dataLabels: { enabled: false },
    stroke: { width: 2, curve: 'smooth' },
    tooltip: { theme: isDark ? 'dark' : 'light' },
    legend: { labels: { colors: text }, position: 'top', horizontalAlign: 'right' },
  }), [text, grid, isDark])

  if (loading) return <div className="text-sm text-gray-400">Carregando analytics...</div>
  if (erro || !data) return <div className="text-sm text-red-500">Não foi possível carregar os analytics.</div>

  const k = data.kpis || {}
  const s = data.series || {}
  const visitsCats = (s.visits || []).map(r => dmLabel(r.day))

  const cards = [
    { label: 'Usuários totais', value: k.totalUsers ?? 0, color: 'from-blue-500 to-cyan-500' },
    { label: 'Assinantes ativos', value: k.assinantesAtivos ?? 0, color: 'from-emerald-500 to-teal-500' },
    { label: 'MRR (receita recorrente)', value: brl(k.mrrBRL), color: 'from-amber-400 to-orange-500' },
    { label: `Novos usuários (${data.periodoDias}d)`, value: k.novosUsuarios ?? 0, color: 'from-violet-500 to-purple-500' },
    { label: `Visitas únicas (${data.periodoDias}d)`, value: k.visitasUnicas ?? 0, color: 'from-pink-500 to-rose-500' },
    { label: 'Receita de IA', value: brl(k.receitaIA), color: 'from-sky-500 to-blue-500' },
    { label: 'Custo real de IA', value: brl(k.custoIA), color: 'from-gray-500 to-gray-600' },
    { label: 'Lucro de IA', value: brl(k.lucroIA), color: 'from-green-500 to-emerald-600' },
  ]

  const planLabels = Object.keys(data.planDist || {})
  const planValues = planLabels.map(p => data.planDist[p])

  return (
    <div className="space-y-6">
      {/* Período */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">Período:</span>
        {[7, 30, 90].map(d => (
          <button key={d} onClick={() => setDays(d)}
            className={`px-3 py-1 rounded-lg text-sm ${days === d ? 'bg-blue-600 text-white' : (isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700')}`}>
            {d}d
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c, i) => (
          <div key={i} className={`rounded-xl p-4 bg-gradient-to-br ${c.color} text-white shadow-lg`}>
            <div className="text-xs opacity-90">{c.label}</div>
            <div className="text-2xl font-bold mt-1 truncate">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Receita x Custo x Lucro de IA */}
      <div className={`rounded-xl p-4 ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <h3 className="font-semibold mb-2">Receita, custo e lucro de IA (R$/dia)</h3>
        <Chart
          type="area" height={300}
          series={[
            { name: 'Receita', data: (s.ai || []).map(r => r.revenue) },
            { name: 'Custo', data: (s.ai || []).map(r => r.cost) },
            { name: 'Lucro', data: (s.ai || []).map(r => r.profit) },
          ]}
          options={{
            ...baseChart,
            colors: ['#3B82F6', '#9CA3AF', '#10B981'],
            xaxis: { categories: (s.ai || []).map(r => dmLabel(r.day)), labels: { style: { colors: text } } },
            yaxis: { labels: { style: { colors: text }, formatter: (v) => brl(v) } },
            fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
            tooltip: { ...baseChart.tooltip, y: { formatter: (v) => brl(v) } },
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visitas únicas */}
        <div className={`rounded-xl p-4 ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className="font-semibold mb-2">Visitas únicas por dia</h3>
          <Chart
            type="area" height={260}
            series={[{ name: 'Visitas', data: (s.visits || []).map(r => r.count) }]}
            options={{
              ...baseChart, colors: ['#EC4899'],
              xaxis: { categories: visitsCats, labels: { style: { colors: text } } },
              yaxis: { labels: { style: { colors: text } } },
              fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
            }}
          />
        </div>

        {/* Novos usuários */}
        <div className={`rounded-xl p-4 ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className="font-semibold mb-2">Novos usuários por dia</h3>
          <Chart
            type="bar" height={260}
            series={[{ name: 'Cadastros', data: (s.signups || []).map(r => r.count) }]}
            options={{
              ...baseChart, colors: ['#8B5CF6'],
              plotOptions: { bar: { columnWidth: '55%', borderRadius: 5 } },
              xaxis: { categories: (s.signups || []).map(r => dmLabel(r.day)), labels: { style: { colors: text } } },
              yaxis: { labels: { style: { colors: text } } },
            }}
          />
        </div>
      </div>

      {/* Distribuição de planos */}
      <div className={`rounded-xl p-4 ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-200'} max-w-md`}>
        <h3 className="font-semibold mb-2">Distribuição de planos</h3>
        {planLabels.length === 0 ? <div className="text-sm text-gray-400">Sem dados.</div> : (
          <Chart
            type="donut" height={300}
            series={planValues}
            options={{
              labels: planLabels.map(p => p.toUpperCase()),
              colors: ['#9CA3AF', '#3B82F6', '#8B5CF6', '#F59E0B'],
              legend: { labels: { colors: text }, position: 'bottom' },
              dataLabels: { enabled: true },
              stroke: { width: 0 },
              tooltip: { theme: isDark ? 'dark' : 'light' },
            }}
          />
        )}
      </div>
    </div>
  )
}

export default AdminAnalytics
