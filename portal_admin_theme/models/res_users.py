##############################################################################
#
# Copyright 2025-Today DaFe Solutions
#
##############################################################################

from odoo import models, fields


class ResUsersInh(models.Model):
    _inherit = 'res.users'

    portal_user_configuration = fields.Json()

    def send_portal_user_notification(self, message, title, icon=None, type='info'):
        """Send notification to portal user"""
        self.ensure_one()
        UserNotification = self.env['portal.user.notification'].sudo()
        UserNotification.create({
            'user_id': self.id,
            'notification': {
                'message': message,
                'title': title,
                'icon': icon,
                'type': type
            }
        })

        self._bus_send( "portal.system.user.notification", { 'action': 'reload' } )
