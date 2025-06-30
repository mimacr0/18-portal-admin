##############################################################################
#
# Copyright 2025-Today DaFe Solutions
#
##############################################################################

from odoo import http, _
from odoo.http import request
from odoo.addons.portal_admin_theme.controllers.admin import PortalAdminController


class PortalDashboardController(PortalAdminController):

    @http.route(['/account/user/settings'], type='http', auth="user")
    def account_user_settings_action_main(self, **post):
        values = self._get_admin_layout_values()
        values['page_url'] = '/account/user/settings'
        return request.render("portal_account.portal_user_settings_page", values)

    @http.route('/account/user/get/settings', type='json', auth="user")
    def account_user_get_settings(self, **post):
        """Get user settings from portal_user_configuration field"""
        try:
            user = request.env.user.sudo()
            settings = user.portal_user_configuration or {}

            return {
                'status': 'success',
                'settings': settings
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': str(e)
            }

    @http.route('/account/user/update/settings', type='json', auth="user")
    def account_user_update_settings(self, settings, **post):
        """Update user settings in portal_user_configuration field"""
        try:
            if not settings:
                return {
                    'status': 'error',
                    'message': _('No settings provided')
                }

            user = request.env.user.sudo()
            user.portal_user_configuration = settings

            return {
                'status': 'success',
                'message': _('Settings updated successfully')
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': str(e)
            }
