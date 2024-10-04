
export const messagesPages = [
    {
        name: 'messages',
        url: '/messages',
        type: 'messages',
        module: 'messages',
        title: 'Messages',
        icon: 'fa fa-comments',
        sequence: 50,
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