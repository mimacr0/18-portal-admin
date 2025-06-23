import { rpc } from "@web/core/network/rpc";

// Detect current theme
const isDark = document.documentElement.classList.contains('dark');

// Base sparkline chart options to reuse - true sparkline configuration
const baseSparkOptions = {
    chart: {
        type: 'area',
        height: 120,
        sparkline: {
            enabled: true  // This enables true sparkline mode
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
            left: 0,
            right: 0
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

// Helper function to check if element exists
function checkElementExists(selector) {
    const element = document.querySelector(selector);
    if (!element) {
        console.warn(`Chart container not found: ${selector}`);
        return false;
    }
    return true;
}

// Safe chart creation helper
function createChart(selector, options) {
    if (!checkElementExists(selector)) {
        return null;
    }

    try {
        const chart = new ApexCharts(document.querySelector(selector), options);
        chart.render();
        console.log(`Chart created for ${selector}`);
        return chart;
    } catch (error) {
        console.error(`Failed to create chart for ${selector}:`, error);
        return null;
    }
}

// Function to handle expeditions chart
export const reloadExpeditionsChartKpis = async () => {
    const res = await rpc('/account/dashboard/kpis/expeditions/chart');
    if(res?.status != 'success') return;

    // Expeditions Chart
    const expeditionsChartOptions = {
        ...baseSparkOptions,
        chart: {
            ...baseSparkOptions.chart,
            type: 'area',
            height: 130
        },
        series: [{
            name: 'Expeditions',
            data: res.values
        }],
        colors: [isDark ? '#a78bfa' : '#8b5cf6'], // Purple color theme
        tooltip: {
            enabled: true,
            fixed: {
                enabled: false
            },
            x: {
                show: true,
                formatter: function(idx) {
                    return res.dates[idx];
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

    // Create chart
    const expeditionsChart = createChart("#expeditions-chart", expeditionsChartOptions);

    // Update the KPI values in the dashboard
    const totalExpeditions = res.values.reduce((acc, val) => acc + val, 0);

    const expeditionsValueEls = document.querySelectorAll('#dashboard-total-expeditions-value');
    expeditionsValueEls.forEach(el => {
        el.textContent = totalExpeditions.toLocaleString();
        el.dataset.value = totalExpeditions;
    });
}