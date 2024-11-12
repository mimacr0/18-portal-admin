
export const repairsMenus = [
    {
        url: '/repairs',
        ref: 'repairs',
        label: 'Repairs',
        icon: 'fa fa-wrench',
        sequence: 40
    }
]

export const repairsPages = [
    {
        name: 'repairs',
        title: 'Repairs',
        module: 'repairs',
        assets: {
            footer: {
                js: [
                    { url: '/static/base/js/sys.js' },
                    { url: '/static/base/js/tabs.js' },
                    { url: '/static/repairs/js/repairs.js' }
                ]
            }
        }
    }
]