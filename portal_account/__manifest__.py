##############################################################################
#
# Copyright 2025-Today DaFe Solutions
#
##############################################################################
{
    'name': 'Portal Account Dashboard',
    'version': '18.0.1.0.0',
    'author': 'DaFe Solutions',
    'website': 'https://www.dafe.es',
    'license': 'AGPL-3',
    'category': 'Extra Tools',
    'summary': 'Account Dashboard',
    'depends': ['portal_admin_theme'],
    'data': [
        'portal/home_templates.xml',
        'portal/dashboard_modals.xml',
        'portal/dashboard_templates.xml',
        'portal/account_templates.xml',
        'portal/settings_templates.xml',
        'portal/file_upload_modal.xml',
        'views/res_users.xml',
        'views/menu.xml'
    ],
    'assets': {
        'portal_admin_theme.admin_assets_frontend': [
            'portal_account/static/src/js/frontend/kpis/*.js',
            'portal_account/static/src/js/frontend/dashboard_page.js',
            'portal_account/static/src/js/frontend/account_user_profile.js',
            'portal_account/static/src/js/frontend/account_user_settings.js',
            'portal_account/static/src/js/frontend/file_upload_modal.js'
        ]
    }
}
