##############################################################################
#
# Copyright 2025-Today DaFe Solutions
#
##############################################################################

from odoo import models, api


class SaleOrder(models.Model):
    _name = 'sale.order'
    _inherit = ['sale.order', 'portal.mixin']

    def get_details_url(self):
        portal_url = self.get_portal_url()
        return portal_url.replace('/my/orders/', f'/account/expedition/details/')

    @api.returns('mail.message', lambda value: value.id)
    def message_post(self, **kwargs):
        res = super().message_post(**kwargs)
        user = self.env['res.users'].sudo().search([('partner_id', '=', self.user_id.partner_id.id)],limit=1)
        partner_ids = []
        partner_ids.extend(self.partner_id.ids)
        partner_ids.extend(self.user_id.partner_id.ids)
        if user and user.partner_id.id in partner_ids:
            user._bus_send( "portal_expedition.portal_expedition_details_page", { 'action': 'reload' } )
        return res
