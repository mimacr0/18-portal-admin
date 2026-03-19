{
    'name': 'Portal General Product Mapping',
    'version': '18.0.1.0.0',
    'category': 'Website/Portal',
    'summary': 'General Product Modal and Mapping for Customer Portal',
    'description': """
        This module allows customers to view and manage their product mappings (SKU, EAN13, ASIN, etc.) 
        from the customer portal. It also provides the product edition modal.
    """,
    'author': 'DaFe Solutions',
    'website': 'https://www.proogeeks.com',
    'depends': [
        'portal_admin_theme',
        'rma_base',
        'stock',
    ],
    'data': [
        'security/ir.model.access.csv',
        'portal/portal_product_mapping_modal_templates.xml',
        'portal/portal_product_mapping_templates.xml',
        'portal/portal_file_upload_modal.xml',
        'portal/portal_import_products_modal.xml',
        'portal/portal_edit_product_modal.xml',
    ],
    'assets': {
        'portal_admin_theme.admin_assets_frontend': [
            'portal_general_product/static/src/js/frontend/components/**.js',
            'portal_general_product/static/src/js/frontend/product_mapping_main.js',
            'portal_general_product/static/src/js/product_modal.js',
        ],
    },
    'installable': True,
    'application': False,
    'auto_install': False,
    'license': 'LGPL-3',
}
