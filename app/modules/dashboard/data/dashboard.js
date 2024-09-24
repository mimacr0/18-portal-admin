
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
    }
]

export const dashboardPages = [
    {
        name: 'dashboard',
        url: '/',
        type: 'dashboard',
        title: 'Dashboard',
        icon: 'fas fa-tachometer-alt',
        state: true,
        assets: {
            footer: {
                js: [
                    { url: '/static/base/js/sys.js' },
                    { url: '/static/base/js/systray.js' },
                    { url: '/static/base/js/tabs.js' },
                    { url: '/static/dashboard/js/dashboard.js' },
                    { url: '/static/dashboard/js/custom.js' }
                ]
            }
        },
        kpis
    }
]