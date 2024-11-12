
const kpis = []

export const dashboardMenus = [
    {
        icon: 'fas fa-tachometer-alt',
        label: 'Dashboard',
        ref: 'dashboard',
        url: '/',
        sequence: 10
    }
]

export const dashboardPages = [
    {
        name: 'dashboard',
        type: 'dashboard',
        module: 'dashboard',
        title: 'Dashboard',
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