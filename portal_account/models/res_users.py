##############################################################################
#
# Copyright 2025-Today DaFe Solutions
#
##############################################################################

from odoo import models, fields, api


class ResUsersInh(models.Model):
    _inherit = 'res.users'

    def send_portal_user_recent_activity(self, message, title, icon=None, type='info', message_args=None):
        """Send recent activity to portal user
        
        Args:
            message: Message msgid (English string, will be translated when displayed)
            title: Title msgid (English string, will be translated when displayed)
            icon: FontAwesome icon class (e.g. 'fas fa-bell')
            type: Activity type ('info', 'success', 'warning', 'error')
            message_args: List of arguments to format the message (e.g. ['WH/IN/00001'])
        
        Note: Pass the English msgid WITHOUT using _(). The translation will happen
        when the activity is displayed, using the user's current language.
        
        Example:
            user.send_portal_user_recent_activity(
                "Reception '%s' created",
                "New reception",
                "fas fa-box",
                "success",
                message_args=[picking.name]
            )
        """
        self.ensure_one()
        UserActivity = self.env['portal.user.activity'].sudo()

        # Store the msgid (untranslated) - translation happens when displaying
        activity_data = {
            'message': message,
            'title': title,
            'icon': icon or 'fas fa-info',
            'type': type
        }
        
        # Store message args if provided
        if message_args:
            activity_data['message_args'] = message_args

        UserActivity.create({
            'user_id': self.id,
            'activity': activity_data
        })

        # Notify the user via bus
        self._bus_send( "portal.system.user.recent_activity", { 'action': 'reload' } )
