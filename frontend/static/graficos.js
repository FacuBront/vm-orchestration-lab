// Gráficos del panel (Chart.js). Colores de severidad fijos por categoría:
// el color sigue a la severidad, nunca al orden ni a la cantidad.
const Graficos = (() => {
  const COLOR_SEV = {
    'Crítica': '#dc2626',
    'Alta': '#fb923c',
    'Media': '#fde047',
    'Baja': '#60a5fa',
    'Ninguna': '#9ca3af',
  };
  const TINTA = '#cbd5e1';
  const TINTA_TENUE = '#64748b';
  const GRILLA = 'rgba(148, 163, 184, 0.10)';
  const ACENTO = '#2dd4bf';

  Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
  Chart.defaults.color = TINTA_TENUE;

  const tooltip = {
    backgroundColor: '#0b1220',
    borderColor: '#1f2a3a',
    borderWidth: 1,
    titleColor: '#f8fafc',
    bodyColor: TINTA,
    padding: 10,
    cornerRadius: 8,
    displayColors: true,
    boxPadding: 4,
  };

  // Rótulo con el valor al final de cada barra (la identidad no depende solo del color).
  const etiquetasDeValor = {
    id: 'etiquetasDeValor',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      ctx.save();
      ctx.font = '600 12px "JetBrains Mono", monospace';
      ctx.fillStyle = TINTA;
      ctx.textBaseline = 'middle';
      chart.getDatasetMeta(0).data.forEach((barra, i) => {
        ctx.fillText(chart.data.datasets[0].data[i], barra.x + 8, barra.y);
      });
      ctx.restore();
    },
  };

  // conteos: pares [severidad, cantidad] en el orden Crítica → Ninguna.
  function severidad(canvas, conteos) {
    const etiquetas = conteos.map(([s]) => s);
    const valores = conteos.map(([, n]) => n);
    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels: etiquetas,
        datasets: [{
          data: valores,
          backgroundColor: etiquetas.map((s) => COLOR_SEV[s]),
          borderRadius: 4,
          borderSkipped: 'start',
          barPercentage: 0.7,
          categoryPercentage: 0.9,
        }],
      },
      options: {
        indexAxis: 'y',
        maintainAspectRatio: false,
        layout: { padding: { right: 36 } },
        plugins: {
          legend: { display: false },
          tooltip: { ...tooltip, displayColors: false, callbacks: { label: (c) => `${c.raw} hallazgos` } },
        },
        scales: {
          x: { beginAtZero: true, grid: { color: GRILLA }, border: { display: false }, ticks: { precision: 0 } },
          y: { grid: { display: false }, border: { display: false }, ticks: { color: TINTA, font: { size: 13, weight: '500' } } },
        },
      },
      plugins: [etiquetasDeValor],
    });
  }

  function tendencia(canvas, datos) {
    return new Chart(canvas, {
      type: 'line',
      data: {
        labels: datos.etiquetas,
        datasets: [{
          label: 'Hallazgos',
          data: datos.valores,
          borderColor: ACENTO,
          borderWidth: 2,
          backgroundColor: 'rgba(45, 212, 191, 0.08)',
          fill: true,
          tension: 0,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: datos.oficial.map((o) => (o ? ACENTO : '#475569')),
          pointBorderColor: '#111827',
          pointBorderWidth: 2,
        }],
      },
      options: {
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...tooltip,
            displayColors: false,
            callbacks: {
              title: (items) => `Escaneo ${items[0].label}${datos.oficial[items[0].dataIndex] ? ' · corrida oficial' : ''}`,
              label: (c) => `${c.raw} hallazgos`,
            },
          },
        },
        scales: {
          x: { grid: { display: false }, border: { color: '#1f2a3a' }, ticks: { font: { family: '"JetBrains Mono", monospace', size: 11 } } },
          y: { beginAtZero: true, grid: { color: GRILLA }, border: { display: false }, ticks: { precision: 0 } },
        },
      },
    });
  }

  return { severidad, tendencia };
})();
