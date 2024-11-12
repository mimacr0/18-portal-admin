
export const storageMenus = [
    {
        url: '/storage',
        ref: 'storage',
        label: 'Storage',
        icon: 'fa fa-layer-group',
        sequence: 70
    }
]

export const storagePages = [
    {
        name: 'storage',
        title: 'Storage',
        module: 'storage',
        assets: {
            footer: {
                js: [
                    { url: '/static/base/js/sys.js' },
                    { url: '/static/base/js/tabs.js' },
                    { url: '/static/storage/js/storage.js' }
                ]
            }
        }
    }
]