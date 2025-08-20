from odoo import http, _
from odoo.http import request
from odoo.addons.portal_admin_theme.controllers.admin import PortalAdminController


class PortalInvoicesController(PortalAdminController):

    def _get_admin_layout_menus(self):
        menus = super()._get_admin_layout_menus()
        menus.append({
            'name': _('Invoices'),
            'url': '/my/invoices?filterby=invoices',
            'icon': 'fas fa-file-invoice',
            'order': 100
        })
        return menus
