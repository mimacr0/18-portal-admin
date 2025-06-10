##############################################################################
#
# Copyright 2025-Today DaFe Solutions
#
##############################################################################

from odoo import models


class ResUsersInh(models.Model):
    _inherit = 'res.users'

    def send_portal_user_notification(self, message, title, icon=None):
        pass
