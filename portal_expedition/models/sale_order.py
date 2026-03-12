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
        if self.env.context.get('skip_portal_follower_notify'):
            return res
        author = res.author_id  # Who wrote the message
        
        # Find portal user for the customer
        customer_user = self.env['res.users'].sudo().search([
            ('partner_id', '=', self.partner_id.id)
        ], limit=1)
        
        # If author is NOT the customer → notify the customer
        if customer_user and author.id != self.partner_id.id:
            customer_user._bus_send("portal_expedition.portal_expedition_details_page", {'action': 'reload'})
            customer_user.send_portal_user_notification(
                _("New message in expedition"),
                _("New message in expedition"),
                "fas fa-bell",
                "info",
            )

        # Notify all followers
        follower_partners = self.message_follower_ids.mapped('partner_id')
        users = follower_partners.mapped('user_ids') | follower_partners.mapped('portal_user_ids').mapped('user_ids')
        author_partner_id = self.env.context.get('portal_author_partner_id')
        if author_partner_id:
            users = users.filtered(lambda u: u.partner_id.id != author_partner_id)
        users = users.filtered(lambda u: u.active)
        for user in users:
            user._bus_send("portal_expedition.portal_expedition_details_page", {'action': 'reload'})
            user.send_portal_user_notification(
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

    def notify_portal_followers(self, author_partner_id=None):
        if 'portal.user.notification' not in self.env:
            return
        follower_partners = self.message_follower_ids.mapped('partner_id')
        users = follower_partners.mapped('user_ids') | follower_partners.mapped('portal_user_ids').mapped('user_ids')
        if author_partner_id:
            users = users.filtered(lambda u: u.partner_id.id != author_partner_id)
        users = users.filtered(lambda u: u.active)
        for user in users:
            user._bus_send("portal_expedition.portal_expedition_details_page", {'action': 'reload'})
            user.send_portal_user_notification(
                _("New message in expedition"),
                _("New message in expedition"),
                "fas fa-bell",
                "info",
            )
