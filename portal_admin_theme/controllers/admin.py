
import json

from odoo.http import request
from odoo.addons.portal.controllers.portal import CustomerPortal


class PortalAdminController(CustomerPortal):

    def _get_admin_layout_menus(self):
        return []

    def _get_admin_layout_values(self):
        user = request.env.user.sudo()
        return {
            'menus': self._get_admin_layout_menus(),
            'batch_actions': [],
            'list_actions': [],
            'tools_actions': [],
            'list_filters': [],
            'list_columns': [],
            'user': user,
            'json': json
        }
