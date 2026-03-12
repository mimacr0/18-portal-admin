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
    'depends': ['portal_account', 'repair_module'],
    'data': [
        'security/ir.model.access.csv',
        'portal/portal_stock_list_templates.xml',
        'portal/portal_lots_list_template.xml',
        'portal/portal_lot_details_template.xml',
        'portal/portal_create_product_modal.xml',
        'portal/portal_update_product_modal.xml',
        'portal/portal_file_upload_modal.xml',
        'portal/portal_import_products_modal.xml',
    ],
    'assets': {
        'portal_admin_theme.admin_assets_frontend': [
            'portal_stock/static/src/js/frontend/components/**.js',
            'portal_stock/static/src/js/frontend/stock_main.js',
            'portal_stock/static/src/js/frontend/lots_main.js',
            'portal_stock/static/src/js/create_modal_page.js',

        ]
    }
}
