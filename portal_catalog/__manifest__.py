# -*- coding: utf-8 -*-
##############################################################################
#
# Copyright 2024 DaFe Solutions
#
##############################################################################

{
    'name': "Portal Catalog",
    'category': 'Portal',
    'version': '18.0.1.0.0',
    'author': 'DaFe Solutions',
    'maintainer': 'DaFe Solutions',
    'description': """Portal Catalog""",
    'summary': """
        Modulo para administrar catálogos de selección en el portal
    """,
    'depends': ['portal_admin_theme', 'stock'],
    'license': 'AGPL-3',
    'website': "https://www.dafe.es",
    'data': [
        'portal/product_product_templates.xml',
        'portal/stock_quant_templates.xml',
    ],
    'assets': {
        'portal_admin_theme.admin_assets_frontend': [
            'portal_catalog/static/src/frontend/js/products_catalog.js',
            'portal_catalog/static/src/frontend/js/quants_catalog.js',
        ],
    },
    'images': ['static/description/icon.png'],
    'installable': True,
    'auto_install': False,
    'application': False
}
