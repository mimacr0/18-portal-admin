import { aceHeaderCSS, aceFooterJs } from './common.js'

const beforeImportModal = {
    submit: true,
    fields: [
        {
            name: 'files',
            label: 'Files',
            type: 'file',
            attrs: {
                multiple: 1
            }
        }
    ]
}

const configForm = {
    submit: true,
    fields: [
        {
            name: 'id',
            type: 'hidden'
        },
        {
            name: 'name',
            label: 'Name',
            type: 'str',
            attrs: {
                required: 1
            }
        },
        {
            name: 'key',
            label: 'Key',
            type: 'str',
            attrs: {
                required: 1
            }
        },
        {
            name: 'sequence',
            label: 'Sequence',
            type: 'int',
            attrs: {
                min: 0
            }
        },
        {
            name: 'config',
            label: 'Configuration',
            type: 'ace',
            mode: 'yaml'
        }
    ]
}

const configSections = [
    {
        class: 'offset-md-2 col-md-8',
        cards: [
            {
                title: 'Configurations',
                name: 'config',
                actions: {
                    crud: ['all'],
                    batch: [
                        {
                            action: 'export',
                            label: 'Export',
                            icon: 'fa fa-download',
                            tooltip: 'Export configuration'
                        }
                    ],
                    tools: [
                        {
                            action: 'import',
                            icon: 'fa fa-upload',
                            tooltip: 'Import configuration',
                            modal: {
                                before: beforeImportModal
                            }
                        }
                    ]
                },
                columns: [
                    { label: 'Name', value: 'name' },
                    { label: 'Key', value: 'keyValue' }
                ],
                form: configForm
            }
        ]
    }
]

export const configPages = [
    {
        name: 'config',
        url: '/config',
        title: 'Configurations',
        icon: 'fa fa-cogs',
        sequence: 1000,
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
                    { url: '/config/js/config/list.js' },
                    { url: '/config/js/config/status.js' }
                ]
            }
        },
        screens: [
            {
                sections: configSections
            }
        ]
    }
]
