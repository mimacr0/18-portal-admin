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
        # Ensure translations use user's language
        self._ensure_user_lang_context()
        values = self._get_admin_layout_values()
        values['page_url'] = '/account/user/profile'
        return request.render("portal_account.portal_user_profile_page", values)

    @http.route('/account/user/update/lang/<string:lang>', type='http', auth="user")
    def account_user_update_lang_action_main(self, lang, **post):
        user = request.env.user.sudo()
        user.lang = lang
        # Persist language for website/frontend rendering as well
        resp = request.redirect("/my")
        try:
            resp.set_cookie('frontend_lang', lang, path='/')
        except Exception:
            pass
        return resp

    @http.route('/account/user/notifications/reload', type='json', auth="user")
    def account_user_notifications_reload_action_main(self, **post):
        # Ensure translations use user's language in rendered snippets
        self._ensure_user_lang_context()
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

    @http.route('/account/user/notifications/clear', type='json', auth="user")
    def account_user_notifications_clear_action_main(self, **post):
        self._ensure_user_lang_context()
        user = request.env.user.sudo()
        PortalNotifications = request.env['portal.user.notification'].sudo()
        PortalNotifications.clear_all_notifications(user.id)
        return {
            'status': 'success',
            'message': _('All notifications cleared')
        }

    @http.route('/account/user/notifications/remove/<int:notification_id>', type='json', auth="user")
    def account_user_notifications_remove_action_main(self, notification_id, **post):
        self._ensure_user_lang_context()
        user = request.env.user.sudo()
        PortalNotifications = request.env['portal.user.notification'].sudo()
        notification = PortalNotifications.browse(notification_id)

        # Security check - only allow users to remove their own notifications
        if notification and notification.exists() and notification.user_id.id == user.id:
            notification.remove_notification()
            return {
                'status': 'success',
                'message': _('Notification removed')
            }
        return {
            'status': 'error',
            'message': _('Notification not found or access denied')
        }

    @http.route('/account/user/update/profile', type='json', auth="user")
    def account_user_update_profile(self, **post):
        """Update user profile information"""
        try:
            self._ensure_user_lang_context()
            user = request.env.user.sudo()
            partner = user.partner_id.sudo()

            # Update user fields
            update_values = {}

            if post.get('name'):
                update_values['name'] = post.get('name')

            if post.get('email'):
                update_values['email'] = post.get('email')

            if post.get('phone'):
                update_values['phone'] = post.get('phone')

            if post.get('mobile'):
                update_values['mobile'] = post.get('mobile')

            # Update fields if there are values to update
            if update_values:
                user.write(update_values)

            return {
                'status': 'success',
                'message': _('Profile updated successfully')
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': str(e)
            }

    @http.route('/account/user/upload/image', type='json', auth="user")
    def account_user_upload_image(self, image_data, **post):
        """Upload user profile image"""
        try:
            self._ensure_user_lang_context()
            partner = request.env.user.partner_id.sudo()

            if image_data:
                partner.image_1920 = image_data

            return {
                'status': 'success',
                'message': _('Profile image updated successfully')
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': str(e)
            }

    @http.route('/account/user/remove/image', type='json', auth="user")
    def account_user_remove_image(self, **post):
        """Remove user profile image"""
        try:
            self._ensure_user_lang_context()
            partner = request.env.user.partner_id.sudo()
            partner.image_1920 = False

            return {
                'status': 'success',
                'message': _('Profile image removed successfully')
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': str(e)
            }
