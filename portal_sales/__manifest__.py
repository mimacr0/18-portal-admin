##############################################################################
#
# Copyright 2025-Today DaFe Solutions
#
##############################################################################

{
    'name': "Portal Sales",
    'category': 'Portal',
    'version': '18.0.1.0.0',
    'author': 'DaFe Solutions',
    'maintainer': 'Angel Zhou Hu',
    'description': """Portal Sales Management""",
    'summary': """
        Module for managing sales orders in the customer portal.
    """,
    'depends': ['portal_account', 'portal_catalog', 'sale'],
    'license': 'AGPL-3',
    'website': "https://www.dafe.es",
    'data': [
        'security/ir.model.access.csv',
        'portal/sale_list_templates.xml',
        'portal/sale_details_templates.xml',
        'portal/sale_modal_templates.xml',
    ],
    'assets': {
        'portal_admin_theme.admin_assets_frontend': [
            'portal_sales/static/src/js/frontend/components/**.js',
            'portal_sales/static/src/js/frontend/sale_main.js',
            'portal_sales/static/src/css/custom.css'
        ]
    },
    'images': ['static/description/icon.png'],
    'installable': True,
    'auto_install': False,
    'application': False
}