##############################################################################
#
# Copyright 2025-Today DaFe Solutions
#
##############################################################################
{
    'name': 'Portal Stock',
    'version': '18.0.1.0.0',
    'author': 'DaFe Solutions',
    'website': 'https://www.dafe.es',
    'license': 'AGPL-3',
    'category': 'Extra Tools',
    'summary': 'Stock',
    'depends': ['portal_account'],
    'data': [
        'security/ir.model.access.csv',
        'portal/stock_templates.xml'
    ],
    'assets': {
        'portal_admin_theme.admin_assets_frontend': [
            'portal_stock/static/src/js/frontend/components/**.js',
            'portal_stock/static/src/js/frontend/stock_main.js'
        ]
    }
}
