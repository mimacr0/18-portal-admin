
export const sparepartsMenus = [
    {
        url: '/spareparts',
        ref: 'spareparts',
        label: 'Spare Parts',
        icon: 'fa fa-screwdriver',
        sequence: 90
    }
]

export const sparepartsPages = [
    {
        name: 'spareparts',
        title: 'Spare Parts',
        module: 'spareparts',
        assets: {
            footer: {
                js: [
                    { url: '/static/base/js/sys.js' },
                    { url: '/static/base/js/tabs.js' },
                    { url: '/static/spareparts/js/spareparts.js' }
                ]
            }
        }
    }
]