##############################################################################
#
# Copyright 2025-Today DaFe Solutions
#
##############################################################################

{
    'name': "Portal Reception",
    'category': 'Portal',
    'version': '18.0.1.0.0',
    'author': 'DaFe Solutions',
    'maintainer': 'David Fernández',
    'description': """Portal Reception""",
    'summary': """
        Modulo para recepciones en el portal del cliente.
    """,
    'depends': ['portal_account', 'portal_catalog'],
    'license': 'AGPL-3',
    'website': "https://www.dafe.es",
    'data': [
        'security/ir.model.access.csv',
        'portal/reception_templates.xml'
    ],
    'assets': {
        'portal_admin_theme.admin_assets_frontend': [
            'portal_reception/static/src/js/frontend/components/**.js',
            'portal_reception/static/src/js/frontend/reception_main.js',
            'portal_reception/static/src/js/create_modal_page.js',
            'portal_reception/static/src/css/custom.css'
        ]
    },
    'images': ['static/description/icon.png'],
    'installable': True,
    'auto_install': False,
    'application': False
}