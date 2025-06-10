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
        'security/ir.model.access.csv',
        'portal/product_templates.xml'
    ],
    'assets': {
        'portal_admin_theme.admin_assets_frontend': [
            'portal_account_products/static/src/js/products_page.js'
        ]
    }
}
