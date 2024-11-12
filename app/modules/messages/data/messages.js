
export const messagesMenu = [
    {
        label: 'Messages',
        url: '/messages',
        icon: 'fa fa-comments',
        ref: 'messages',
        sequence: 100
    }
]

export const messagesPages = [
    {
        name: 'messages',
        type: 'messages',
        module: 'messages',
        title: 'Messages',
        assets: {
            footer: {
                js: [
                    { url: '/static/base/js/sys.js' },
                    { url: '/static/base/js/systray.js' },
                    { url: '/static/base/js/tabs.js' },
                    { url: '/static/messages/js/messages.js' }
                ]
            }
        }
    }
]