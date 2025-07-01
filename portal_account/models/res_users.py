##############################################################################
#
# Copyright 2025-Today DaFe Solutions
#
##############################################################################

from odoo import models, fields, api


class ResUsersInh(models.Model):
    _inherit = 'res.users'

    def send_portal_user_recent_activity(self, message, title, icon=None, type='info'):
        """Send recent activity to portal user"""
        self.ensure_one()
        UserActivity = self.env['portal.user.activity'].sudo()

        UserActivity.create({
            'user_id': self.id,
            'activity': {
                'message': message,
                'title': title,
                'icon': icon or 'fas fa-info',
                'type': type
            }
        })

        # Notify the user via bus
        self._bus_send( "portal.system.user.recent_activity", { 'action': 'reload' } )
