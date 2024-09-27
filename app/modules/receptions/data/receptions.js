
export const receptionsPages = [
    {
        name: 'receptions',
        url: '/receptions',
        title: 'Receptions',
        icon: 'fa fa-box',
        access: 'portal',
        sequence: 30,
        assets: {
            footer: {
                js: [
                    { url: '/static/base/js/sys.js' },
                    { url: '/static/base/js/tabs.js' },
                    { url: '/static/receptions/js/receptions.js' }
                ]
            }
        }
    }
]
