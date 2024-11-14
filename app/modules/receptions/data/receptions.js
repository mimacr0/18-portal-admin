
export const receptionsMenus = [
    {
        url: '/receptions',
        ref: 'receptions',
        label: 'Receptions',
        icon: 'fa fa-box',
        sequence: 30
    }
]

export const receptionsPages = [
    {
        name: 'receptions',
        url: '/receptions',
        title: 'Receptions',
        module: 'receptions',
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
