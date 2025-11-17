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
    'depends': ['portal_admin_theme'],
    'license': 'AGPL-3',
    'website': "https://www.dafe.es",
    'data': [
        'portal/products_template.xml'
    ],
    # 'assets': {
    #     'portal_admin_theme.admin_assets_frontend': [
    #         'portal_catalog/static/src/frontend/js/products_catalog.js'
    #     ], 
    # },
    'images': ['static/description/logo.png'],
    'installable': True,
    'auto_install': False,
    'application': False
}
