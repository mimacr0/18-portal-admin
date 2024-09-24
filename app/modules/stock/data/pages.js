
export const stockPages = [
    {
        name: 'stock',
        url: '/stock',
        title: 'Stock',
        icon: 'fa fa-boxes',
        sequence: 20,
        access: 'portal',
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