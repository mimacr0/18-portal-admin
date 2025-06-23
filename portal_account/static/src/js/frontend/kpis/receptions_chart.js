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
            followCursor: false,  // Don't follow cursor
            intersect: false,     // Don't require intersect
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
        size: 0,  // No markers for cleaner look
        hover: {
            size: 3  // Show markers only on hover
        }
    },
    tooltip: {
        enabled: true,
        fixed: {
            enabled: true,     // Try fixed position
            position: 'topRight',
            offsetX: 0,
            offsetY: 0
        },
        marker: {
            show: false        // Hide marker
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
        show: false  // No legend for sparklines
    },
    dataLabels: {
        enabled: false  // No data labels for cleaner look
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

// Add this improved helper function at the beginning of the file
function checkElementExists(selector) {
    const element = document.querySelector(selector);
    if (!element) {
        console.warn(`Chart container not found: ${selector}`);
        return false;
    }
    return true;
}

// Add a safe chart creation helper
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

// Function to handle receptions chart
export const reloadReceptionsChartKpis = async () => {
    const res = await rpc('/account/dashboard/kpis/receptions/chart');
    if(res?.status != 'success') return;

    // Receptions Chart
    const receptionChartOptions = {
        ...baseSparkOptions,
        chart: {
            ...baseSparkOptions.chart,
            type: 'area',
            height: 130
        },
        series: [{
            name: 'Receptions',
            data: res.values
        }],
        colors: [isDark ? '#0ea5e9' : '#0284c7'], // Blue color theme
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
    const receptionChart = createChart("#receptions-chart", receptionChartOptions);

    // Update the KPI values in the dashboard
    const totalReceptions = res.values.reduce((acc, val) => acc + val, 0);

    const receptionsValueEls = document.querySelectorAll('#dashboard-total-receptions-value');
    receptionsValueEls.forEach(el => {
        el.textContent = totalReceptions.toLocaleString();
        el.dataset.value = totalReceptions;
    });
}
