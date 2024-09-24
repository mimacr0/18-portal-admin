
let kpiCharts = {}

const expeditionsChartData = {
    series: [
        {
            name: "Expeditions",
            data: [35, 41, 36, 26, 45, 48, 52, 53, 41]
        }
    ],
    xaxis: {
        categories: [
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
        ],
    },
    colors: ["#20c997"]
}

const expeditionsChartPieData = {
    chart: {
        type: "pie",
        height: 170
    },
    series: [35, 41],
    labels: ["Completed", "In Progress"],
    colors: ["#20c997", "#ffc107"],
    responsive: [{
        breakpoint: 480,
        options: {
            chart: {
                width: 200
            },
            legend: {
                position: 'bottom'
            }
        }
    }]
}

const receptionsChartData = {
    series: [
        {
            name: "Receptions",
            data: [35, 41, 36, 26, 45, 48, 52, 53, 41]
        },
    ],
    xaxis: {
        categories: [
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
        ],
    },
    colors: ["#0d6efd", "#ffc107"]
}

const receptionsChartPieData = {
    chart: {
        type: "pie",
        height: 170
    },
    series: [35, 41],
    labels: ["Completed", "In Progress"],
    colors: ["#0d6efd", "#ffc107"],
    responsive: [{
        breakpoint: 480,
        options: {
            chart: {
                width: 200
            },
            legend: {
                position: 'bottom'
            }
        }
    }]
}

const baseChartOptions = {
    chart: {
        type: "bar",
        height: 170
    },
    plotOptions: {
        bar: {
            horizontal: false,
            columnWidth: "55%",
            endingShape: "rounded",
        },
    },
    legend: {
        show: true,
    },
    dataLabels: {
        enabled: false,
    },
    stroke: {
        show: true,
        width: 2,
        colors: ["transparent"],
    },
    fill: {
        opacity: 1,
    },
    tooltip: {
        y: {
            formatter: function(val) {
                return "$ " + val + " thousands";
            },
        },
    }
}

const createExpeditionsChart = () => {
    kpiCharts['expeditions'] = new ApexCharts(
        document.querySelector(`#portal-customer-expeditions-chart`), {
        ...baseChartOptions,
        ...expeditionsChartData
    })
    kpiCharts['expeditions'].render()

    kpiCharts['expeditions-pie'] = new ApexCharts(
        document.querySelector(`#portal-customer-expeditions-chart-pie`), {
        ...baseChartOptions,
        ...expeditionsChartPieData
    })
    kpiCharts['expeditions-pie'].render()
}

const createReceptionsChart = () => {
    kpiCharts['receptions'] = new ApexCharts(
        document.querySelector(`#portal-customer-receptions-chart`), {
        ...baseChartOptions,
        ...receptionsChartData
    })
    kpiCharts['receptions'].render()

    kpiCharts['receptions-pie'] = new ApexCharts(
        document.querySelector(`#portal-customer-receptions-chart-pie`), {
        ...baseChartOptions,
        ...receptionsChartPieData
    })
    kpiCharts['receptions-pie'].render()
}

const updateExpeditionsChart = (data) => {
    kpiCharts['expeditions'].updateOptions({
        xaxis: {
            categories: [
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec"
            ],
        }
    })
    kpiCharts['expeditions'].updateSeries([
        {
            name: "Expeditions",
            data: [ 36, 41, 36, 26, 45, 48, 52, 53, 41, 35, 41 ]
        }
    ])
}

createExpeditionsChart()
createReceptionsChart()

socket.on('dashboard expeditions update', () => {
    updateExpeditionsChart()
})
