
const kpis = [
    {
        icon: 'fa fa-truck',
        label: 'Expeditions',
        size: 'col-sm-6 col-md-2',
        ref: 'EXPEDITIONS_STATUS_KPI',
        type: 'state'
    },
    {
        icon: 'fa fa-box',
        label: 'Receptions',
        size: 'col-sm-6 col-md-2',
        ref: 'RECEPTIONS_STATUS_KPI',
        type: 'state'
    },
    {
        icon: 'fa fa-boxes',
        label: 'Stock',
        size: 'col-sm-6 col-md-2',
        ref: 'STOCK_STATUS_KPI',
        type: 'state'
    },
    {
        icon: 'fa fa-layer-group',
        label: 'Storage',
        size: 'col-sm-6 col-md-2',
        ref: 'STORAGE_STATUS_KPI',
        type: 'state'
    },
    {
        icon: 'fa fa-wrench',
        label: 'Repairs',
        size: 'col-sm-6 col-md-2',
        ref: 'REPAIRS_STATUS_KPI',
        type: 'state'
    },
    {
        icon: 'fa fa-puzzle-piece',
        label: 'Spare Parts',
        size: 'col-sm-6 col-md-2',
        ref: 'SPARE_PARTS_STATUS_KPI',
        type: 'state'
    },
    {
        ref: 'PORTAL_EXPEDITIONS_CHART',
        type: 'chart',
        section: 1,
        title: 'Expeditions',
        size: 'col-lg-12 col-md-12 col-sm-12',
        series: [
            { label: 'Expeditions', color: '#20c997' }
        ]
    },
    {
        ref: 'PORTAL_RECEPTIONS_CHART',
        type: 'chart',
        section: 1,
        title: 'Receptions',
        size: 'col-lg-12 col-md-12 col-sm-12',
        series: [
            { label: 'Receptions', color: '#0d6efd' }
        ]
    },
    {
        ref: 'PORTAL_EXPEDITIONS_CHART_PIE',
        type: 'chart',
        mode: 'pie',
        section: 2,
        title: 'Last month Expeditions',
        size: 'col-lg-12 col-md-12 col-sm-12',
        colors: ["#6c757d", "#ffc107", "#ff0000", "#20c997"]
    },
    {
        ref: 'PORTAL_RECEPTIONS_CHART_PIE',
        type: 'chart',
        mode: 'pie',
        section: 2,
        title: 'Last month Receptions',
        size: 'col-lg-12 col-md-12 col-sm-12',
        colors: ['#0d6efd', '#ffc107', "#ff0000"]
    }
]

export const dashboardPages = [
    {
        name: 'dashboard',
        url: '/',
        type: 'dashboard',
        module: 'dashboard',
        title: 'Dashboard',
        icon: 'fas fa-tachometer-alt',
        state: true,
        assets: {
            footer: {
                js: [
                    { url: '/static/base/js/sys.js' },
                    { url: '/static/base/js/systray.js' },
                    { url: '/static/base/js/tabs.js' },
                    { url: '/assets/js/dashboard/page.js' }
                ]
            }
        },
        kpis
    }
]