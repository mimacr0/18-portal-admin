
export const expeditionsMenus = [
    {
        url: '/expeditions',
        ref: 'expeditions',
        label: 'Expeditions',
        icon: 'fa fa-truck',
        sequence: 20
    }
]

export const expeditionsPages = [
    {
        name: 'expeditions',
        title: 'Expeditions',
        module: 'expeditions',
        assets: {
            footer: {
                js: [
                    { url: '/static/base/js/sys.js' },
                    { url: '/static/base/js/tabs.js' },
                    { url: '/static/expeditions/js/expeditions.js' }
                ]
            }
        }
    }
]
