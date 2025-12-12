import { rpc } from "@web/core/network/rpc";

// Detect current theme
const isDark = document.documentElement.classList.contains('dark');

// Store chart instance for updates
let receptionChartInstance = null;

// Default period labels (will be overridden by translations from server)
const defaultPeriodLabels = {
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

// Function to handle receptions chart
export const reloadReceptionsChartKpis = async (period = '7d') => {
    const res = await rpc('/account/dashboard/kpis/receptions/chart', { period });
    if(res?.status != 'success') return;

    // Get translations from response
    const t = res.translations || {};
    const periodLabels = t.period_labels || defaultPeriodLabels;
    const seriesName = t.series_name || 'Receptions';

    // Update period label
    const labelEl = document.getElementById('receptions-chart-period-label');
    if (labelEl) {
        labelEl.textContent = periodLabels[period] || periodLabels['7d'] || defaultPeriodLabels['7d'];
    }

    // Receptions Chart options
    const receptionChartOptions = {
        ...baseSparkOptions,
        chart: {
            ...baseSparkOptions.chart,
            type: 'area',
            height: 220,
            sparkline: {
                enabled: false
            },
            toolbar: {
                show: false
            }
        },
        series: [{
            name: seriesName,
            data: res.values
        }],
        colors: [isDark ? '#0ea5e9' : '#0284c7'],
        stroke: {
            curve: 'smooth',
            width: 2
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.5,
                opacityTo: 0.1,
                stops: [0, 90, 100]
            }
        },
        legend: {
            show: true,
            showForSingleSeries: true,
            position: 'top',
            horizontalAlign: 'center',
            fontSize: '11px',
            markers: {
                width: 8,
                height: 8,
                radius: 2
            },
            labels: {
                colors: isDark ? '#9ca3af' : '#6b7280'
            }
        },
        grid: {
            show: true,
            borderColor: isDark ? '#374151' : '#e5e7eb',
            strokeDashArray: 3,
            padding: {
                top: 5,
                left: 5,
                right: 15,
                bottom: 0
            }
        },
        xaxis: {
            categories: res.labels,
            labels: {
                show: true,
                style: {
                    colors: isDark ? '#9ca3af' : '#6b7280',
                    fontSize: '10px'
                },
                rotate: -45,
                rotateAlways: false
            },
            axisTicks: {
                show: false
            },
            axisBorder: {
                show: false
            }
        },
        yaxis: {
            labels: {
                show: true,
                style: {
                    colors: isDark ? '#9ca3af' : '#6b7280',
                    fontSize: '10px'
                },
                formatter: function(val) {
                    return val.toFixed(0);
                }
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
    if (receptionChartInstance) {
        receptionChartInstance.destroy();
        receptionChartInstance = null;
    }

    // Create new chart
    const chartEl = document.querySelector("#receptions-chart");
    if (chartEl) {
        try {
            receptionChartInstance = new ApexCharts(chartEl, receptionChartOptions);
            receptionChartInstance.render();
        } catch (error) {
            console.error('Failed to create receptions chart:', error);
        }
    }
}
