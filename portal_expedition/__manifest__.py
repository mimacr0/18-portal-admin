# -*- coding: utf-8 -*-
##############################################################################
#
# Copyright 2024 DaFe Solutions
#
##############################################################################

{
    'name': "Portal Expedition",
    'category': 'Portal',
    'version': '18.0.1.0.0',
    'author': 'DaFe Solutions',
    'maintainer': 'Angel Zhou Hu, Programador 2',
    'description': """Modulo para gestionar las expediciones desde el portal""",
    'summary': """
        Este es un ejemplo de como debería ser una descripción de un módulo
        - Los cambios del frontend deben ir en las carpetas 'controllers' y 'portal'
        - Los cambios del backend deben ir en las carpetas 'models' y 'views'
        - Para elementos avanzados en JS se debe añadir la Logica en la carpeta 'static/src',
          donde tendremos una carpeta para el JS 'static/src/js', otra para los QWeb 'static/src/xml'
          y otra para los estilos 'static/src/scss'.
    """,
    'depends': ['base', 'portal_admin_theme'],
    'license': 'LGPL-3',
    'website': "https://www.dafe.es",
    'data': [
        'portal/portal_create_expedition_modal.xml',
        'portal/portal_expedition_file_upload_modal.xml',
        'portal/expedition_templates.xml',
    ],   
    # Es importante tener en cuenta el orden en el que deben declararse las carpetas y archivos
    'assets': {
    #     'web.assets_backend': [
    #         'portal_expedition/static/src/backend/js/**.js',
    #         'portal_expedition/static/src/backend/xml/**.xml',
    #         'portal_expedition/static/src/backend/scss/**.scss',
    #     ],
        'portal_admin_theme.admin_assets_frontend': [
            'portal_expedition/static/src/js/frontend/components/**.js',
            'portal_expedition/static/src/js/frontend/expedition_main.js',
            # 'portal_expedition/static/src/js/create_expedition_modal.js',
        ],
    },
    'images': ['static/description/icon.png'],
    'installable': True, #Este campo se debe cambiar a True cuando se quiera que el modulo sea instalable
    'auto_install': False,
    'application': False,
}