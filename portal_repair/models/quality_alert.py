##############################################################################
#
# Copyright 2025 DaFe Solutions
#
##############################################################################

from odoo import models, fields, api


class BaseModel(models.Model):
    _name = 'quality.alert'
    _inherit = ['quality.alert', 'portal.mixin']

    
    @api.returns('mail.message', lambda value: value.id)
    def message_post(self, **kwargs):
        res = super().message_post(**kwargs)
        user = self.env['res.users'].sudo().search([('partner_id', '=', self.user_id.partner_id.id)],limit=1)
        partner_ids = []
        partner_ids.extend(self.partner_id.ids)
        partner_ids.extend(self.user_id.partner_id.ids)
        if user and user.partner_id.id in partner_ids:
            user._bus_send( "portal_repair.portal_repair_details_reload_request", { 'action': 'reload' } )
            user.send_portal_user_notification( "New message in reception", "New message in reception", "fas fa-bell", "info" )
        return res
