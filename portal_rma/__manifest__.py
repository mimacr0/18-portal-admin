{
    'name': 'Portal RMA',
    'version': '18.0.1.0.0',
    'author': 'DaFe Solutions',
    'website': 'https://www.dafe.es',
    'license': 'AGPL-3',
    'category': 'Portal',
    'summary': 'Portal RMA Units Management',
    'depends': ['portal_account', 'portal_admin_theme', 'rma_inventory'],
    'data': [
        'security/ir.model.access.csv',
        'portal/portal_rma_modal_templates.xml',
        'portal/portal_rma_templates.xml',
    ],
    'assets': {
        'portal_admin_theme.admin_assets_frontend': [
            'portal_rma/static/src/css/custom.css',
            'portal_rma/static/src/js/frontend/components/**.js',
            'portal_rma/static/src/js/frontend/rma_main.js',
        ]
    },
    'installable': True,
    'application': False,
}
