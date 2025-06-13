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
        Modulo para para recepciones en el portal del cliente.
    """,
    'depends': ['portal_account'],
    'license': 'LGPL-3',
    'website': "https://www.dafe.es",
    'data': [
        'portal/reception_templates.xml'
    ],
    # 'assets': {
    #     'portal_reception.admin_assets_frontend': [
    #         'portal_catalog/static/src/frontend/js/products_catalog.js'
    #     ],
    # },
    'images': ['static/description/icon.png'],
    'installable': True,
    'auto_install': False,
    'application': False
}