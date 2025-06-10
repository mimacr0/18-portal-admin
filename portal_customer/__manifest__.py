##############################################################################
#
# Copyright 2025-Today DaFe Solutions
#
##############################################################################
{
    'name': 'Portal Customer',
    'version': '18.0.1.0.0',
    'author': 'DaFe Solutions',
    'website': 'https://www.dafe.es',
    'license': 'AGPL-3',
    'category': 'Extra Tools',
    'summary': 'RPC Client API Module',
    'depends': ['client_account', 'portal_admin_theme'],
    'data': [
        'views/res_users.xml',
        'portal/product_templates.xml',
        'portal/invoice_templates.xml',
        'views/menu.xml'
    ],
    'assets': {
        'portal_customer.my_dashboard_assets': [
            'portal_customer/static/src/css/dashboard.css'
        ],
        'portal_admin_theme.admin_assets_frontend': [
            'portal_customer/static/src/js/invoice_chatter.js',
            # 'portal_customer/static/src/js/products_page.js'
        ]
    }
}
