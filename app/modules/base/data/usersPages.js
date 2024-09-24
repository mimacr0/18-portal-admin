
const usersForm = {
    submit: true,
    fields: [
        {
            name: 'id',
            type: 'hidden'
        },
        {
            name: 'name',
            label: 'Name',
            type: 'str'
        }
    ]
}

const usersSections = [
    {
        class: 'offset-md-2 col-md-8',
        cards: [
            {
                title: 'Users',
                name: 'users',
                actions: {
                    crud: ['all'],
                    tools: [
                        {
                            action: 'sync',
                            icon: 'fa fa-sync',
                            tooltip: 'Sync users'
                        }
                    ]
                },
                columns: [
                    { label: '', value: 'userImage' },
                    { label: 'Name', value: 'name' },
                    { label: 'Login', value: 'login' }
                ],
                form: usersForm
            }
        ]
    }
]

export const usersPages = [
    {
        name: 'users',
        url: '/users',
        title: 'Users',
        icon: 'fa fa-users',
        sequence: 900,
        assets: {
            footer: {
                js: [
                    { url: '/static/base/js/sys.js' },
                    { url: '/users/js/users/list.js' }
                ]
            }
        },
        screens: [
            {
                sections: usersSections
            }
        ],
        access: 'admin'
    }
]
