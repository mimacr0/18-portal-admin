##############################################################################
#
# Copyright 2025-Today DaFe Solutions
#
##############################################################################

from odoo import models, api, _


class SaleOrder(models.Model):
    _name = 'sale.order'
    _inherit = ['sale.order', 'portal.mixin']

    def get_details_url(self):
        portal_url = self.get_portal_url()
        return portal_url.replace('/my/orders/', '/account/expedition/details/')

    @api.returns('mail.message', lambda value: value.id)
    def message_post(self, **kwargs):
        """
        Override message_post to send notifications when someone writes in the chatter.
        
        Logic to implement:
        - If the PORTAL USER writes → notify the salesperson/backend user
        - If the BACKEND USER writes → notify the portal user (customer)
        
        This ensures bidirectional communication notifications between
        portal users and backend users.
        """
        res = super().message_post(**kwargs)
        author = res.author_id  # Who wrote the message
        
        # Find portal user for the customer
        customer_user = self.env['res.users'].sudo().search([
            ('partner_id', '=', self.partner_id.id)
        ], limit=1)
        
        # If author is NOT the customer → notify the customer
        if customer_user and author.id != self.partner_id.id:
            customer_user._bus_send("portal_expedition.portal_expedition_details_page", {'action': 'reload'})
            # TODO: Implement send_portal_user_recent_activity
            # When a backend user writes in the chatter, the portal user should
            # receive a recent activity notification in their dashboard.
            # customer_user.send_portal_user_recent_activity(
            #     _("New message in expedition"),
            #     _("New message in expedition"),
            #     "fas fa-bell",
            #     "info",
            # )
            customer_user.send_portal_user_notification(
                _("New message in expedition"),
                _("New message in expedition"),
                "fas fa-bell",
                "info",
            )
        
        # TODO: Implement notification to salesperson/backend
        # If author IS the customer (portal user) → notify the salesperson (self.user_id)
        # This way the salesperson knows the customer has replied.
        # if author.id == self.partner_id.id and self.user_id:
        #     # Notify salesperson that customer wrote a message
        #     pass
        
        return res
