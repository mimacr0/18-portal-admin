
let kpiCharts = {}

const expeditionsChartData = {
    series: [{ name: "", data: [0] }],
    xaxis: { categories: [""] },
    colors: ["#20c997"]
}

const expeditionsChartPieData = {
    chart: {
        type: "pie",
        height: 170
    },
    series: [],
    labels: [],
    colors: ["#20c997", "#ffc107", "#ff0000", "#ffc107"],
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
    series: [{ name: "", data: [0] }],
    xaxis: { categories: [""] },
    colors: ["#0d6efd", "#ffc107"]
}

const receptionsChartPieData = {
    chart: {
        type: "pie",
        height: 170
    },
    series: [],
    labels: [],
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
            categories: [""],
        }
    })
    kpiCharts['expeditions'].updateSeries([
        {
            name: "",
            data: [ 0 ]
        }
    ])
}

const updateDashboardCharts = async (data) => {
    const res = await jsonGet(`/dashboard/get/charts/data`)
    if(res?.status != 'success') return
    kpiCharts['receptions-pie'].updateOptions({ labels: res.data.receptions.labels })
    kpiCharts['receptions-pie'].updateSeries(res.data.receptions.series)

    kpiCharts['expeditions-pie'].updateOptions({ labels: res.data.expeditions.labels })
    kpiCharts['expeditions-pie'].updateSeries(res.data.expeditions.series)

    kpiCharts['expeditions'].updateOptions({
        xaxis: {
            categories: res.data.expeditions_data.labels
        }
    })
    kpiCharts['expeditions'].updateSeries([
        {
            name: "Expeditions",
            data: res.data.expeditions_data.series
        }
    ])

    kpiCharts['receptions'].updateOptions({
        xaxis: {
            categories: res.data.receptions_data.labels
        }
    })
    kpiCharts['receptions'].updateSeries([
        {
            name: "Receptions",
            data: res.data.receptions_data.series
        }
    ])
}

createExpeditionsChart()
createReceptionsChart()
updateDashboardCharts()

socket.on('dashboard expeditions update', () => {
    updateExpeditionsChart()
})
