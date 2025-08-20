
import json

from odoo.http import request
from odoo.addons.portal.controllers.portal import CustomerPortal


class PortalAdminController(CustomerPortal):

    def _get_admin_layout_menus(self):
        return []

    def _get_admin_layout_values(self):
        user = request.env.user.sudo()
        company = user.company_id
        menus = self._get_admin_layout_menus()
        menus.sort(key=lambda x: x.get('order', 0))
        return {
            'menus': menus,
            'batch_actions': [],
            'list_actions': [],
            'tools_actions': [],
            'list_filters': [],
            'list_columns': [],
            'user': user,
            'company': company,
            'json': json
        }
