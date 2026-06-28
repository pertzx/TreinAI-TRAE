import React, { useEffect, useState, useCallback } from 'react'
import Chart from 'react-apexcharts'
import api from '../../../Api'

const dmLabel = (day) => { const [, m, d] = String(day).split('-'); return `${d}/${m}` }

/**
 * Gráfico de impressões e cliques (série temporal) de um alvo.
 * Props: targetId, targetModel ('Anuncio'|'Profissional'|'Local'), tema, days, title
 */
export default function InteractionStatsChart({ targetId, targetModel, tema = 'dark', days = 30, title }) {
  const isDark = tema === 'dark'
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)

  const text = isDark ? '#E5E7EB' : '#111827'
  const grid = isDark ? '#374151' : '#E5E7EB'

  const carregar = useCallback(async () => {
    if (!targetId || !targetModel) return
    setLoading(true); setErro(false)
    try {
      const res = await api.post('/analytics/interaction-stats', { targetId, targetModel, days })
      setData(res?.data || null)
    } catch (e) { setErro(true) } finally { setLoading(false) }
  }, [targetId, targetModel, days])

  useEffect(() => { carregar() }, [carregar])

  if (loading) return <div className="text-xs text-gray-400 py-4">Carregando estatísticas...</div>
  if (erro || !data) return <div className="text-xs text-red-500 py-4">Erro ao carregar estatísticas.</div>

  const series = data.series || []
  const totals = data.totals || { impressions: 0, clicks: 0 }

  return (
    <div className={`rounded-xl p-3 ${isDark ? 'bg-gray-800' : 'bg-gray-50'} border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
      {title && <h4 className="text-sm font-semibold mb-2">{title}</h4>}

      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div>
          <div className="text-[11px] text-gray-400">Impressões</div>
          <div className="text-lg font-bold">{(totals.impressions || 0).toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[11px] text-gray-400">Cliques</div>
          <div className="text-lg font-bold">{(totals.clicks || 0).toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[11px] text-gray-400">CTR</div>
          <div className="text-lg font-bold">{Number(data.ctr || 0).toFixed(2)}%</div>
        </div>
      </div>

      <Chart
        type="area" height={220}
        series={[
          { name: 'Impressões', data: series.map(r => r.impressions) },
          { name: 'Cliques', data: series.map(r => r.clicks) },
        ]}
        options={{
          chart: { toolbar: { show: false }, foreColor: text, background: 'transparent' },
          colors: ['#3B82F6', '#10B981'],
          grid: { borderColor: grid, strokeDashArray: 3 },
          dataLabels: { enabled: false },
          stroke: { width: 2, curve: 'smooth' },
          fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
          xaxis: { categories: series.map(r => dmLabel(r.day)), labels: { style: { colors: text } } },
          yaxis: { labels: { style: { colors: text } } },
          legend: { labels: { colors: text }, position: 'top', horizontalAlign: 'right' },
          tooltip: { theme: isDark ? 'dark' : 'light' },
        }}
      />
    </div>
  )
}
