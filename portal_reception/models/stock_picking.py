##############################################################################
#
# Copyright 2025-Today DaFe Solutions
#
##############################################################################

from odoo import models, api, _
from odoo.tools import html2plaintext


class StockPicking(models.Model):
    _name = 'stock.picking'
    _inherit = ['stock.picking', 'portal.mixin']

    def get_details_url(self):
        portal_url = self.get_portal_url()
        return portal_url.replace('#', f'/account/reception/details/{self.id}')


    @api.returns('mail.message', lambda value: value.id)
    def message_post(self, **kwargs):
        """
        Override message_post to send notifications when someone writes in the chatter.
        
        Logic to implement:
        - If the PORTAL USER writes → notify the responsible/backend user
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
            customer_user._bus_send("portal_reception.reception_details_reload_request", {'action': 'reload'})
            # TODO: Implement send_portal_user_recent_activity
            # When a backend user writes in the chatter, the portal user should
            # receive a recent activity notification in their dashboard.
            # customer_user.send_portal_user_recent_activity(
            #     _("New message in reception"),
            #     _("New message in reception"),
            #     "fas fa-bell",
            #     "info"
            # )
            customer_user.send_portal_user_notification(
                _("New message in reception"),
                _("New message in reception"),
                "fas fa-bell",
                "info"
            )

        # Notify all followers
        follower_partners = self.message_follower_ids.mapped('partner_id')
        users = follower_partners.mapped('user_ids') | follower_partners.mapped('portal_user_ids').mapped('user_ids')
        author_partner_id = self.env.context.get('portal_author_partner_id')
        if author_partner_id:
            users = users.filtered(lambda u: u.partner_id.id != author_partner_id)
        users = users.filtered(lambda u: u.active)
        for user in users:
            user._bus_send("portal_reception.reception_details_reload_request", {'action': 'reload'})
            user.send_portal_user_notification(
                _("New message in reception"),
                _("New message in reception"),
                "fas fa-bell",
                "info"
            )
        
        # TODO: Implement notification to responsible/backend
        # If author IS the customer (portal user) → notify the responsible (self.user_id)
        # This way the responsible knows the customer has replied.
        # if author.id == self.partner_id.id and self.user_id:
        #     # Notify responsible that customer wrote a message
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
            user._bus_send("portal_reception.reception_details_reload_request", {'action': 'reload'})
            user.send_portal_user_notification(
                _("New message in reception"),
                _("New message in reception"),
                "fas fa-bell",
                "info"
            )

    def get_packages(self):
        self.ensure_one()
        packages = self.move_line_ids.mapped('result_package_id')
        return packages

    def get_products_by_package(self):
        """
        Returns a dictionary with packages as keys and their corresponding moves as values.
        Also includes a 'no_package' key for products without a package.
        """
        self.ensure_one()
        result = {}

        # Get all packages
        packages = self.get_packages()

        # Initialize result dictionary with all packages and an entry for products without a package
        for package in packages:
            result[package] = []

        # Add a key for products without a package
        result['no_package'] = []

        # Group moves by package
        for move_line in self.move_line_ids:
            if move_line.result_package_id:
                result[move_line.result_package_id].append(move_line)
            else:
                result['no_package'].append(move_line)


        if not result['no_package']:
            del result['no_package']

        return result

    def get_note_text(self):
        """Returns the note field as plain text without HTML tags."""
        self.ensure_one()
        return html2plaintext(self.note or '')
