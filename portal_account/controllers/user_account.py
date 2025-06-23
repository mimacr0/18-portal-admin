##############################################################################
#
# Copyright 2025-Today DaFe Solutions
#
##############################################################################

from odoo import http, _
from odoo.http import request
from odoo.addons.portal_admin_theme.controllers.admin import PortalAdminController


class PortalDashboardController(PortalAdminController):

    @http.route('/account/user/profile', type='http', auth="user")
    def account_user_profile_action_main(self, **post):
        values = self._get_admin_layout_values()
        values['page_url'] = '/account/user/profile'
        return request.render("portal_account.portal_user_profile_page", values)

    @http.route('/account/user/update/lang/<string:lang>', type='http', auth="user")
    def account_user_update_lang_action_main(self, lang, **post):
        user = request.env.user.sudo()
        user.lang = lang
        return request.redirect("/account/dashboard")

    @http.route('/account/user/notifications/reload', type='json', auth="user")
    def account_user_notifications_reload_action_main(self, **post):
        user = request.env.user.sudo()
        PortalNotifications = request.env['portal.user.notification'].sudo()
        notifications = PortalNotifications.search([('user_id', '=', user.id)])
        qweb = request.env['ir.qweb']
        return {
            'status': 'success',
            'list': qweb._render('portal_admin_theme.portal_user_notification_list', { 'notifications': notifications }),
            'textCount': len(notifications),
            'title': _('Notifications') if len(notifications) > 0 else _('No notifications'),
            'count': len(notifications)
        }
