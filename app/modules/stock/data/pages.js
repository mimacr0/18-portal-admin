
export const stockMenus = [
    {
        url: '/stock',
        ref: 'stock',
        label: 'Stock',
        icon: 'fa fa-boxes',
        sequence: 60
    }
]

export const stockPages = [
    {
        name: 'stock',
        url: '/stock',
        title: 'Stock',
        module: 'stock',
        assets: {
            footer: {
                js: [
                    { url: '/static/base/js/sys.js' },
                    { url: '/static/base/js/tabs.js' },
                    { url: '/static/stock/js/stock.js' }
                ]
            }
        }
    }
]