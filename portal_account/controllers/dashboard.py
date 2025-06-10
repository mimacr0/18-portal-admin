##############################################################################
#
# Copyright 2025-Today DaFe Solutions
#
##############################################################################

from odoo import http, _
from odoo.http import request
from odoo.addons.portal_admin_theme.controllers.admin import PortalAdminController


class PortalDashboardController(PortalAdminController):

    def _get_admin_layout_menus(self):
        menus = super()._get_admin_layout_menus()
        menus.extend([
            {
                'name': _('Home'),
                'url': '/account',
                'icon': 'fas fa-home'
            }
        ])
        return menus

    @http.route(['/account'], type='http', auth="user", website=True)
    def account_dashboard_action_main(self, **post):
        values = self._get_admin_layout_values()
        values['page_url'] = '/account'
        return request.render("portal_account.portal_dashboard_page", values)
