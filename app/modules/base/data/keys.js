
const forms = [
    {
        submit: true,
        title: 'Authorization',
        name: 'keys',
        fields: [
            {
                name: 'name',
                label: 'Name',
                type: 'str',
                attrs: {
                    required: 1
                }
            },
            {
                name: 'client_user',
                label: 'Client ID',
                type: 'str',
                attrs: {
                    required: 1
                }
            },
            {
                name: 'user_id',
                label: 'User',
                type: 'm2o',
                attrs: {
                    required: 1
                }
            },
            {
                name: 'key',
                label: 'Key',
                type: 'file'
            }
        ]
    }
]

const assets = {
    footer: {
        js: [
            { url: '/static/base/js/sys.js' },
            { url: '/assets/js/keys/page.js' }
        ]
    }
}

const screens = [
    {
        sections: [
            {
                class: 'offset-md-2 col-md-8',
                cards: [
                    {
                        title: 'Authorizations',
                        name: 'keys',
                        actions: {
                            crud: ['all']
                        },
                        columns: [
                            { label: 'Name', value: 'name' }
                        ],
                        form: forms.find(i => i.name === 'keys')
                    }
                ]
            }
        ]
    }
]

export const keysPages = [
    {
        name: 'keys',
        module: 'base',
        url: '/keys',
        title: 'Authorizations',
        icon: 'fa fa-link',
        view: 'keys',
        js_view: 'keys',
        privilege: 'system',
        sequence: 100,
        screens,
        forms,
        assets
    }
]
