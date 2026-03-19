##############################################################################
#
# Copyright 2025-Today DaFe Solutions
#
##############################################################################

from odoo import models, api, _
from odoo.tools import html2plaintext


class SaleOrder(models.Model):
    _inherit = 'sale.order'

    def get_details_url(self):
        """Returns the custom portal details URL for this sale order."""
        return f'/account/sales/details/{self.id}'

    @api.returns('mail.message', lambda value: value.id)
    def message_post(self, **kwargs):
        """
        Override message_post to send notifications when someone writes in the chatter.
        """
        res = super().message_post(**kwargs)
        if self.env.context.get('skip_portal_follower_notify'):
            return res
        
        author = res.author_id
        
        # Notify portal users via Bus for real-time reload
        # and via portal notification system if available
        customer_user = self.env['res.users'].sudo().search([
            ('partner_id', '=', self.partner_id.id)
        ], limit=1)
        
        if customer_user and author.id != self.partner_id.id:
            customer_user._bus_send("portal_sales.sale_details_reload_request", {'action': 'reload'})
            if hasattr(customer_user, 'send_portal_user_notification'):
                customer_user.send_portal_user_notification(
                    _("New message in Sales Order %s") % self.name,
                    _("A new message has been posted in your sales order."),
                    "fas fa-shopping-cart",
                    "info"
                )

        return res

    def get_note_text(self):
        """Returns the note field (or another text field) as plain text."""
        self.ensure_one()
        # In sale.order, we might use 'note' or just empty
        return html2plaintext(self.note or '')

