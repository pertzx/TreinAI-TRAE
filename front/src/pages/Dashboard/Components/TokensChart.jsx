import React, { useMemo } from "react";
import Chart from "react-apexcharts";
import PropTypes from "prop-types";
import { getBrazilDate } from "../../../../helpers/getBrazilDate";

/**
 * TokensChart
 * Props:
 *  - user: objeto user (usa user.stats.tokens)
 *  - tokens: alternativa para passar array direto [{ valor|value, data|date|createdAt }, ...]
 *  - days: número de dias para exibir (padrão 14)
 *  - tema: 'dark' | 'light'
 *
 * Uso:
 *  <TokensChart user={user} days={14} tema="dark" />
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
  // dayKey expected "YYYY-MM-DD"
  try {
    const [y, m, dd] = String(dayKey).split("-");
    return `${dd}/${m}`;
  } catch (e) {
    return dayKey;
  }
}

export default function TokensChart({ user, tokens, days = 14, tema = "dark" }) {
  const isLight = tema === "light";

  // Usa o registro de uso de IA por custo (R$). Mantém compat com prop `tokens`.
  const tokensArray = useMemo(() => {
    if (Array.isArray(tokens)) return tokens;
    if (user && Array.isArray(user?.stats?.aiUsage)) return user.stats.aiUsage;
    return [];
  }, [user, tokens]);

  // cria lista de últimos N dias (do mais antigo -> mais recente)
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

  // agrega tokens por dayKey
  const aggregated = useMemo(() => {
    const map = new Map();
    for (const entry of tokensArray) {
      // custoCobrado (novo) com fallback para valor/value (legado)
      const v = Number(entry?.custoCobrado ?? entry?.valor ?? entry?.value ?? 0);
      if (!Number.isFinite(v)) continue;
      const dateField = entry?.data ?? entry?.date ?? entry?.createdAt ?? entry?.publishedAt ?? null;
      const key = dateField ? brazilDayKey(dateField) : brazilDayKey(new Date());
      map.set(key, (map.get(key) || 0) + v);
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
        tokens: round2(dayVal),
        cumulative: round2(cumulative),
      });
    }
    return data;
  }, [tokensArray, daysList]);

  // preparar series para apex
  const series = useMemo(() => {
    return [
      {
        name: "Custo/dia (R$)",
        type: "column",
        data: aggregated.map((d) => d.tokens),
      },
      {
        name: "Cumulativo (R$)",
        type: "line",
        data: aggregated.map((d) => d.cumulative),
      },
    ];
  }, [aggregated]);

  const options = useMemo(() => {
    const primaryColor = isLight ? "#1D4ED8" : "#3B82F6"; // azul consistente com BMI
    const lineColor = isLight ? "#059669" : "#10B981"; // verde mais vibrante
    const textColor = isLight ? "#111827" : "#E5E7EB";
    const gridColor = isLight ? "#E5E7EB" : "#374151";

    return {
      chart: {
        toolbar: { show: false },
        height: 320,
        type: "line",
        zoom: { enabled: false },
        foreColor: textColor,
        animations: {
          enabled: true,
          speed: 800,
          animateGradually: { enabled: true, delay: 150 }
        },
        background: "transparent",
      },
      stroke: {
        width: [0, 3],
        curve: "smooth",
      },
      plotOptions: {
        bar: {
          columnWidth: "60%",
          borderRadius: 6,
        },
      },
      dataLabels: {
        enabled: false,
      },
      colors: [primaryColor, lineColor],
      xaxis: {
        categories: aggregated.map((d) => d.label),
        labels: {
          style: { colors: aggregated.map(() => textColor) },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: [
        {
          title: { text: undefined },
          labels: { style: { colors: textColor } },
        },
      ],
      grid: {
        borderColor: gridColor,
        strokeDashArray: 3,
      },
      tooltip: {
        theme: isLight ? "light" : "dark",
        x: {
          formatter: function (val, opts) {
            // val = label like '07/09' ; we can show full dayKey if we want
            const idx = opts.dataPointIndex;
            const dayKey = aggregated[idx]?.dayKey;
            const dt = new Date(`${dayKey}T00:00:00Z`);
            // show dayKey + localized full date in Brazil timezone (fallback)
            let full;
            try {
              full = new Date(aggregated[idx].dayKey + "T00:00:00").toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: '2-digit', month: '2-digit', year: 'numeric' });
            } catch (e) {
              full = dayKey;
            }
            return `${val} — ${full}`;
          },
        },
        y: {
          formatter: function (val) {
            return `R$ ${Number(val || 0).toFixed(2).replace('.', ',')}`;
          },
        },
        shared: true,
      },
      legend: {
        position: "top",
        horizontalAlign: "right",
        labels: { colors: textColor },
      },
      responsive: [
        {
          breakpoint: 768,
          options: {
            plotOptions: { bar: { columnWidth: "70%" } },
            xaxis: { labels: { rotate: -45, rotateAlways: true } },
          },
        },
      ],
    };
  }, [aggregated, isLight]);

  if (!aggregated.length) {
    return (
      <div className={`p-6 rounded-lg text-center ${isLight ? "bg-white" : "bg-gray-800"}`}>
        <div className={`text-sm font-medium ${isLight ? "text-gray-600" : "text-gray-300"}`}>
          Nenhum registro de uso de IA disponível
        </div>
        <div className={`text-xs mt-1 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
          Os dados aparecerão aqui conforme você usar o sistema
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header com informações */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col">
          <div className={`text-sm font-semibold ${isLight ? "text-gray-800" : "text-gray-100"}`}>
            Consumo de IA (R$)
          </div>
          <div className={`text-xs ${isLight ? "text-gray-600" : "text-gray-400"}`}>
            Últimos {days} dias
          </div>
        </div>
        <div className={`text-xs px-2 py-1 rounded-full ${isLight ? "bg-gray-100 text-gray-600" : "bg-gray-700 text-gray-300"}`}>
          Fuso: SP
        </div>
      </div>

      {/* Gráfico */}
      <div className="flex-1 min-h-0">
        <Chart options={options} series={series} type="line" height="100%" />
      </div>
    </div>
  );
}

TokensChart.propTypes = {
  user: PropTypes.object,
  tokens: PropTypes.array,
  days: PropTypes.number,
  tema: PropTypes.oneOf(["dark", "light"]),
};
