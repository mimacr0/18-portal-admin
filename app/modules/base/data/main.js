
export const mainPages = [
    {
        name: 'main',
        url: '/',
        title: 'Dashboard',
        icon: 'fas fa-tachometer-alt',
        state: true,
        assets: {
            footer: {
                js: [
                    { url: '/static/base/sys.js' },
                    { url: '/main/js/main/status.js' },
                    { url: '/main/js/main/dashboard.js' }
                ]
            }
        }
    }
]
