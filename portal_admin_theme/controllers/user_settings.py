##############################################################################
#
# Copyright 2025-Today DaFe Solutions
#
##############################################################################

from odoo import http, _
from odoo.http import request
from .admin import PortalAdminController


class PortalDashboardController(PortalAdminController):

    @http.route(['/account/user/settings'], type='http', auth="user")
    def account_user_settings_action_main(self, **post):
        values = self._get_admin_layout_values()
        values['page_url'] = '/account/user/settings'
        return request.render("portal_admin_theme.portal_user_settings_page", values)
