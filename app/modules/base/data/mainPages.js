import { aceHeaderCSS, aceFooterJs } from './common.js'

const dashboardForm = {
    submit: true,
    fields: [
        {
            name: 'config',
            label: 'Configuration',
            type: 'ace',
            mode: 'yaml'
        }
    ]
}

const dashboardSections = [
    {
        class: 'offset-md-2 col-md-8',
        cards: [
            {
                title: 'Dashboard',
                name: 'dashboard',
                actions: {
                    crud: ['all'],
                    list: [
                        {
                            action: 'display',
                            name: 'Display',
                            icon: 'fa fa-desktop',
                            tooltip: 'Dashboard update'
                        }
                    ]
                },
                columns: [
                    { label: 'Name', value: 'name' },
                    { label: 'Mode', value: 'modeBadge' }
                ],
                form: dashboardForm
            }
        ]
    }
]

export const mainPages = [
    {
        name: 'main',
        url: '/',
        title: 'Dashboard',
        icon: 'fas fa-tachometer-alt',
        state: true,
        assets: {
            footer: {
                js: [
                    { url: '/static/base/sys.js' },
                    { url: '/main/js/main/status.js' },
                    { url: '/main/js/main/dashboard.js' }
                ]
            }
        }
    },
    {
        name: 'dashboards',
        url: '/dashboards',
        title: 'Dashboards',
        icon: 'fa fa-chart-bar',
        state: true,
        sequence: 600,
        assets: {
            header: {
                css: [
                    ...aceHeaderCSS
                ]
            },
            footer: {
                js: [
                    ...aceFooterJs,
                    { url: '/static/base/js/sys.js' },
                    { url: '/dashboards/js/dashboard/list.js' },
                    { url: '/dashboards/js/dashboard/status.js' }
                ]
            }
        },
        screens: [
            {
                sections: dashboardSections
            }
        ]
    }
]
