import React, { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import PropTypes from "prop-types";
import { getBrazilDate } from "../../../../helpers/getBrazilDate";
import api from "../../../Api.js";

/**
 * TokensChart
 * Uso de IA do cliente em PERCENTUAL do orçamento (nunca em R$).
 * Busca a série diária (%) em /tokens/token-stats (campo dailyPercent).
 *
 * Props:
 *  - days: número de dias para exibir (padrão 14)
 *  - tema: 'dark' | 'light'
 */

function brazilDayKey(d) {
  try {
    const dt = d ? new Date(d) : new Date();
    return dt.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); // YYYY-MM-DD
  } catch (err) {
    return (d ? new Date(d) : new Date()).toISOString().slice(0, 10);
  }
}

function formatDayLabel(dayKey) {
  try {
    const [, m, dd] = String(dayKey).split("-");
    return `${dd}/${m}`;
  } catch (e) {
    return dayKey;
  }
}

export default function TokensChart({ days = 14, tema = "dark" }) {
  const isLight = tema === "light";
  const [dailyPercent, setDailyPercent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.post("/tokens/token-stats", {});
        const dp = res?.data?.stats?.dailyPercent;
        if (!cancelled) setDailyPercent(Array.isArray(dp) ? dp : []);
      } catch (e) {
        if (!cancelled) setDailyPercent([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // lista dos últimos N dias (mais antigo -> mais recente)
  const daysList = useMemo(() => {
    const out = [];
    const now = new Date(getBrazilDate());
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      out.push(brazilDayKey(d));
    }
    return out;
  }, [days]);

  const aggregated = useMemo(() => {
    const map = new Map();
    for (const entry of dailyPercent) {
      const key = entry?.date || brazilDayKey(new Date());
      map.set(key, (map.get(key) || 0) + (Number(entry?.percent) || 0));
    }
    const round2 = (n) => Math.round(n * 100) / 100;
    const data = [];
    let cumulative = 0;
    for (const dayKey of daysList) {
      const dayVal = map.get(dayKey) || 0;
      cumulative += dayVal;
      data.push({
        dayKey,
        label: formatDayLabel(dayKey),
        percent: round2(dayVal),
        cumulative: round2(cumulative),
      });
    }
    return data;
  }, [dailyPercent, daysList]);

  const series = useMemo(() => ([
    { name: "Uso/dia (%)", type: "column", data: aggregated.map((d) => d.percent) },
    { name: "Acumulado (%)", type: "line", data: aggregated.map((d) => d.cumulative) },
  ]), [aggregated]);

  const options = useMemo(() => {
    const primaryColor = isLight ? "#1D4ED8" : "#3B82F6";
    const lineColor = isLight ? "#059669" : "#10B981";
    const textColor = isLight ? "#111827" : "#E5E7EB";
    const gridColor = isLight ? "#E5E7EB" : "#374151";

    return {
      chart: {
        toolbar: { show: false },
        height: 320,
        type: "line",
        zoom: { enabled: false },
        foreColor: textColor,
        animations: { enabled: true, speed: 800, animateGradually: { enabled: true, delay: 150 } },
        background: "transparent",
      },
      stroke: { width: [0, 3], curve: "smooth" },
      plotOptions: { bar: { columnWidth: "60%", borderRadius: 6 } },
      dataLabels: { enabled: false },
      colors: [primaryColor, lineColor],
      xaxis: {
        categories: aggregated.map((d) => d.label),
        labels: { style: { colors: aggregated.map(() => textColor) } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: [{
        labels: {
          style: { colors: textColor },
          formatter: (val) => `${Math.round(Number(val) || 0)}%`,
        },
        max: 100,
      }],
      grid: { borderColor: gridColor, strokeDashArray: 3 },
      tooltip: {
        theme: isLight ? "light" : "dark",
        x: {
          formatter: function (val, opts) {
            const idx = opts.dataPointIndex;
            const dayKey = aggregated[idx]?.dayKey;
            let full;
            try {
              full = new Date(dayKey + "T00:00:00").toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: '2-digit', month: '2-digit', year: 'numeric' });
            } catch (e) {
              full = dayKey;
            }
            return `${val} — ${full}`;
          },
        },
        y: { formatter: (val) => `${Number(val || 0).toFixed(1).replace('.', ',')}%` },
        shared: true,
      },
      legend: { position: "top", horizontalAlign: "right", labels: { colors: textColor } },
      responsive: [{
        breakpoint: 768,
        options: {
          plotOptions: { bar: { columnWidth: "70%" } },
          xaxis: { labels: { rotate: -45, rotateAlways: true } },
        },
      }],
    };
  }, [aggregated, isLight]);

  const hasData = aggregated.some((d) => d.percent > 0 || d.cumulative > 0);

  if (!loading && !hasData) {
    return (
      <div className={`p-6 rounded-lg text-center ${isLight ? "bg-white" : "bg-gray-800"}`}>
        <div className={`text-sm font-medium ${isLight ? "text-gray-600" : "text-gray-300"}`}>
          Nenhum uso de IA registrado ainda
        </div>
        <div className={`text-xs mt-1 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
          Os dados aparecerão aqui conforme você usar a IA
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col">
          <div className={`text-sm font-semibold ${isLight ? "text-gray-800" : "text-gray-100"}`}>
            Uso de IA (% do plano)
          </div>
          <div className={`text-xs ${isLight ? "text-gray-600" : "text-gray-400"}`}>
            Últimos {days} dias
          </div>
        </div>
        <div className={`text-xs px-2 py-1 rounded-full ${isLight ? "bg-gray-100 text-gray-600" : "bg-gray-700 text-gray-300"}`}>
          Fuso: SP
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <Chart options={options} series={series} type="line" height="100%" />
      </div>
    </div>
  );
}

TokensChart.propTypes = {
  days: PropTypes.number,
  tema: PropTypes.oneOf(["dark", "light"]),
};
