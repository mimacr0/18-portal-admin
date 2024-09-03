
// const expeditionsForm = {
//     submit: true,
//     fields: [
//         {
//             name: 'name',
//             label: 'Name',
//             type: 'str'
//         }
//     ]
// }

// const expeditionsSections = [
//     {
//         class: 'offset-md-2 col-md-8',
//         cards: [
//             {
//                 title: 'users',
//                 name: 'users',
//                 actions: {
//                     crud: ['all'],
//                     tools: [
//                         {
//                             action: 'sync',
//                             icon: 'fa fa-sync',
//                             tooltip: 'Sync users'
//                         }
//                     ]
//                 },
//                 columns: [
//                     { label: 'Name', value: 'name' }
//                 ],
//                 form: usersForm
//             }
//         ]
//     }
// ]

export const expeditionsPages = [
    {
        name: 'expeditions',
        url: '/expeditions',
        title: 'Expeditions',
        icon: 'fa fa-truck',
        sequence: 20,
        assets: {
            footer: {
                js: [
                    { url: '/static/base/js/sys.js' },
                    // { url: '/users/js/users/list.js' }
                ]
            }
        },
    //     screens: [
    //         {
    //             sections: expeditionsSections
    //         }
    //     ]
    }
]
