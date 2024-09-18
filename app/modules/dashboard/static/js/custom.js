
let kpiCharts = {}

const sales_chart_options = {
    series: [
        {
            name: "Net Profit",
            data: [44, 55, 57, 56, 61, 58, 63, 60, 66],
        },
        {
            name: "Revenue",
            data: [76, 85, 101, 98, 87, 105, 91, 114, 94],
        },
        {
            name: "Free Cash Flow",
            data: [35, 41, 36, 26, 45, 48, 52, 53, 41],
        },
    ],
    chart: {
        type: "bar",
        height: 150
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
    colors: ["#0d6efd", "#20c997", "#ffc107"],
    dataLabels: {
        enabled: false,
    },
    stroke: {
        show: true,
        width: 2,
        colors: ["transparent"],
    },
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
    fill: {
        opacity: 1,
    },
    tooltip: {
        y: {
            formatter: function(val) {
                return "$ " + val + " thousands";
            },
        },
    },
};

const initChartKpis = (kpi) => {
    if(kpiCharts[kpi.id]) return kpiCharts[kpi.id].updateSeries([
        {
            name: "Net Profit",
            data: [35, 41, 36, 26, 45, 48, 52, 53, 41],
        },
        {
            name: "Revenue",
            data: [44, 55, 57, 56, 61, 58, 63, 60, 66],
        },
        {
            name: "Free Cash Flow",
            data: [76, 85, 101, 98, 87, 105, 91, 114, 94],
        },
    ])

    kpiCharts[kpi.id] = new ApexCharts(
        document.querySelector(`#apex-chart-${kpi.id}`),
        sales_chart_options
    )
    kpiCharts[kpi.id].render()
}

const dashboardKPIDataReload = (e) => {
    const kpi = e.detail
    if(kpi.type === 'chart') initChartKpis(kpi)
    if(kpi.type === 'state') numberKPIUpdateValue(kpi.id, -20)
}

document.addEventListener('dashboard-kpi-change-data', dashboardKPIDataReload)