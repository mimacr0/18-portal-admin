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
    'description': """
        Module to manage expeditions (deliveries) from the portal.
        
        In the context of the Sale + Delivery process:
        - SALE (sale.order): Customer sales order with products, prices and conditions.
        - EXPEDITION (stock.picking OUT): Physical preparation and shipment of goods to the customer.
        
        An expedition is the warehouse outbound document (delivery note) that is automatically 
        generated when a sale is confirmed. It represents the physical movement of products 
        from the warehouse to the customer.
        
        Flow: Quote → Confirmed Order → Expedition (picking) → Delivery
    """,
    'summary': """
        Management of expeditions (outbound delivery notes) from the customer portal.
        
        Features:
        - View pending and completed expeditions
        - Track shipment status
        - Export data to Excel
        - Bulk import of sales orders
    """,
    'depends': ['base', 'portal_admin_theme', 'portal_account', 'stock_reception'],
    'license': 'AGPL-3',
    'website': "https://www.dafe.es",
    'data': [
        'portal/portal_create_expedition_modal.xml',
        'portal/portal_expedition_file_upload_modal.xml',
        'portal/expedition_templates.xml',
        'portal/expedition_details_page.xml',
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
            'portal_expedition/static/src/js/create_expedition_modal.js',
        ],
    },
    'images': ['static/description/icon.png'],
    'installable': True, #Este campo se debe cambiar a True cuando se quiera que el modulo sea instalable
    'auto_install': False,
    'application': False,
}