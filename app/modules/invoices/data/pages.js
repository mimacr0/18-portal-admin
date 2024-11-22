
export const invoicesMenus = [
    // {
    //     url: '/invoices',
    //     ref: 'invoices',
    //     label: 'Invoices',
    //     icon: 'fa fa-file-invoice',
    //     sequence: 110
    // }
]

export const invoicesPages = [
    {
        name: 'invoices',
        url: '/invoices',
        title: 'Invoices',
        module: 'invoices',
        assets: {
            footer: {
                js: [
                    { url: '/static/base/js/sys.js' },
                    { url: '/static/base/js/tabs.js' },
                    { url: '/static/invoices/js/invoices.js' }
                ]
            }
        }
    }
]