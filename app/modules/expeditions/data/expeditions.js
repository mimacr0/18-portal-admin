
export const expeditionsPages = [
    {
        name: 'expeditions',
        url: '/expeditions',
        title: 'Expeditions',
        icon: 'fa fa-truck',
        access: 'portal',
        module: 'expeditions',
        sequence: 30,
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
