
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
        url: '/expeditions',
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
    },
    {
        name: 'expeditions-details',
        title: 'Expedition',
        module: 'expeditions',
        view: 'details',
        assets: {
            footer: {
                js: [
                    { url: '/static/base/js/sys.js' },
                    { url: '/static/base/js/tabs.js' }
                ]
            }
        }
    },
    {
        name: 'expeditions-create',
        title: 'Expedition create',
        module: 'expeditions',
        view: 'create',
        assets: {
            footer: {
                js: [
                    { url: '/static/base/js/sys.js' },
                    { url: '/static/base/js/tabs.js' },
                    { url: '/static/expeditions/js/expeditions_create.js' },
                    { url: '/static/expeditions/js/expeditions_products.js' }
                ]
            }
        }
    }
]
