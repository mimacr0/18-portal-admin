import { rpc } from "@web/core/network/rpc";

// Detect current theme
const isDark = document.documentElement.classList.contains('dark');

// Store chart instance for updates
let expeditionsChartInstance = null;

// Period labels mapping
const periodLabels = {
    '7d': 'Last 7 days',
    'week': 'Last 4 weeks',
    'month': 'Last 12 months',
    'year': 'Last 5 years'
};

// Base sparkline chart options to reuse - true sparkline configuration
const baseSparkOptions = {
    chart: {
        type: 'area',
        height: 120,
        sparkline: {
            enabled: true
        },
        toolbar: {
            show: false
        },
        animations: {
            enabled: true,
            easing: 'easeinout',
            speed: 800
        },
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        background: 'transparent',
        tooltip: {
            enabled: true,
            enabledOnSeries: undefined,
            followCursor: false,
            intersect: false,
            inverseOrder: false,
            fillSeriesColor: false
        }
    },
    stroke: {
        curve: 'smooth',
        width: 2
    },
    fill: {
        type: 'gradient',
        gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.7,
            opacityTo: 0.3,
            stops: [0, 90, 100]
        }
    },
    markers: {
        size: 0,
        hover: {
            size: 3
        }
    },
    tooltip: {
        enabled: true,
        fixed: {
            enabled: true,
            position: 'topRight',
            offsetX: 0,
            offsetY: 0
        },
        marker: {
            show: false
        },
        x: {
            show: false
        },
        y: {
            formatter: function(value) {
                return value.toLocaleString();
            }
        },
        theme: isDark ? 'dark' : 'light',
        style: {
            fontSize: '12px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas'
        },
        custom: undefined,
        onDatasetHover: {
            highlightDataSeries: false
        }
    },
    grid: {
        show: false,
        padding: {
            top: 10,
            left: 0,
            right: 0,
            bottom: 0
        }
    },
    xaxis: {
        labels: {
            show: false
        },
        axisTicks: {
            show: false
        },
        axisBorder: {
            show: false
        },
        crosshairs: {
            show: false
        }
    },
    yaxis: {
        labels: {
            show: false
        },
        crosshairs: {
            show: false
        }
    },
    legend: {
        show: false
    },
    dataLabels: {
        enabled: false
    },
    crosshairs: {
        show: false,
        width: 0,
        position: 'none',
        opacity: 0,
        stroke: {
            width: 0,
            dashArray: 0
        }
    }
};

// Function to handle expeditions chart
export const reloadExpeditionsChartKpis = async (period = '7d') => {
    const res = await rpc('/account/dashboard/kpis/expeditions/chart', { period });
    if(res?.status != 'success') return;

    // Update period label
    const labelEl = document.getElementById('expeditions-chart-period-label');
    if (labelEl) {
        labelEl.textContent = periodLabels[period] || periodLabels['7d'];
    }

    // Expeditions Chart options
    const expeditionsChartOptions = {
        ...baseSparkOptions,
        chart: {
            ...baseSparkOptions.chart,
            type: 'area',
            height: 160
        },
        series: [{
            name: 'Expeditions',
            data: res.values
        }],
        colors: [isDark ? '#a78bfa' : '#8b5cf6'],
        stroke: {
            curve: 'smooth',
            width: 2
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.7,
                opacityTo: 0.3,
                stops: [0, 90, 100]
            }
        },
        tooltip: {
            enabled: true,
            fixed: {
                enabled: false
            },
            x: {
                show: true,
                formatter: function(val, opts) {
                    const idx = opts?.dataPointIndex ?? (val - 1);
                    return res.labels[idx] || '';
                }
            },
            y: {
                formatter: function(value) {
                    return value.toLocaleString();
                }
            },
            theme: isDark ? 'dark' : 'light'
        }
    };

    // Destroy previous chart if exists
    if (expeditionsChartInstance) {
        expeditionsChartInstance.destroy();
        expeditionsChartInstance = null;
    }

    // Create new chart
    const chartEl = document.querySelector("#expeditions-chart");
    if (chartEl) {
        try {
            expeditionsChartInstance = new ApexCharts(chartEl, expeditionsChartOptions);
            expeditionsChartInstance.render();
        } catch (error) {
            console.error('Failed to create expeditions chart:', error);
        }
    }

    // Update the KPI values in the dashboard
    const totalExpeditions = res.values.reduce((acc, val) => acc + val, 0);

    const expeditionsValueEls = document.querySelectorAll('#dashboard-chart-expeditions-total');
    expeditionsValueEls.forEach(el => {
        el.textContent = totalExpeditions.toLocaleString();
        el.dataset.value = totalExpeditions;
    });
}
