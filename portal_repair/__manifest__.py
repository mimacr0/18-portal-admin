# -*- coding: utf-8 -*-
##############################################################################
#
# Copyright 2024 DaFe Solutions
#
##############################################################################

{
    'name': "Base Module ",
    'category': 'All',
    'version': '18.0.1.0.0',
    'author': 'DaFe Solutions',
    'maintainer': 'Angel Zhou Hu, Programador 2',
    'description': """Base para crear nuevos módulos de Odoo""",
    'summary': """
        En este módulo podemos ver el estado de las reparaciones, pero no las reparaciones en sí.
        Es por eso que emplearemos la clase quality.alert, para gestionar la creación y ver el estado
        de las reparaciones.
        Se recomienda no emplear las reparaciones directamente, pues es una clase que puede contener información 
        sensible.
    """,
    'depends': ['base', 'portal_admin_theme', 'portal_account', 'portal_catalog', 'repair_module'],
    'license': 'LGPL-3',
    'website': "https://www.dafe.es",
    'data': [
        'portal/portal_repair_alert_list_template.xml',
        'portal/portal_repair_alert_modal_template.xml',
        'portal/portal_repair_alert_details_template.xml',
    ],
    'assets': {
        'portal_admin_theme.admin_assets_frontend': [
            'portal_repair/static/src/js/frontend/components/**.js',
            'portal_repair/static/src/js/frontend/repair_alert_main.js',
            'portal_repair/static/src/js/create_modal_page.js',
            'portal_repair/static/src/css/custom.css'
        ]
    },
    'images': ['static/description/icon.png'],
    'installable': True,
    'auto_install': False,
    'application': False,
}