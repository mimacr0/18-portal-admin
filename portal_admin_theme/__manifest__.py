##############################################################################
#
# Copyright 2025-Today DaFe Solutions
#
##############################################################################
{
    'name': 'Portal Admin Theme',
    'version': '18.0.1.0.0',
    'author': 'DaFe Solutions',
    'website': 'https://www.dafe.es',
    'license': 'AGPL-3',
    'category': 'Extra Tools',
    'summary': 'RPC Client API Module',
    'depends': ['client_account'],
    'data': [
        'portal/layout.xml',
        'security/ir.model.access.csv'
    ],
    'assets': {
        'portal_admin_theme.fontawesome': [
            'portal_admin_theme/static/src/vendor/fontawesome/css/all.min.css',
        ],
        'portal_admin_theme.admin_page': [
            ('include', 'portal_admin_theme.fontawesome'),
            'portal_admin_theme/static/src/css/admin.css'
        ],
        'portal_admin_theme.account_page': [
            ('include', 'portal_admin_theme.fontawesome'),
            'portal_admin_theme/static/src/css/account.css'
        ],
        'portal_admin_theme.admin_assets_frontend': [
            'bus/static/src/services/bus_service.js',
            'bus/static/src/bus_parameters_service.js',
            'bus/static/src/multi_tab_service.js',
            'bus/static/src/workers/*',
            ('remove', 'bus/static/src/workers/websocket_worker_script.js'),
            'portal_admin_theme/static/src/network/rpc.js',
            'portal_admin_theme/static/src/js/realtime/portal_realtime_service.js',
            'portal_admin_theme/static/src/js/layout/user_notifications.js'
        ],
        'portal_admin_theme.tools': [
            'portal_admin_theme/static/src/js/tools/numbers.js',
            'portal_admin_theme/static/src/js/tools/actions.js',
        ]
    }
}
