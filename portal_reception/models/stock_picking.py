##############################################################################
#
# Copyright 2025-Today DaFe Solutions
#
##############################################################################

from odoo import models, api


class StockPicking(models.Model):
    _name = 'stock.picking'
    _inherit = ['stock.picking', 'portal.mixin']

    def get_details_url(self):
        portal_url = self.get_portal_url()
        return portal_url.replace('#', f'/account/reception/details/{self.id}')


    @api.returns('mail.message', lambda value: value.id)
    def message_post(self, **kwargs):
        res = super().message_post(**kwargs)
        user = self.env['res.users'].sudo().search([('partner_id', '=', self.user_id.partner_id.id)],limit=1)
        partner_ids = []
        partner_ids.extend(self.partner_id.ids)
        partner_ids.extend(self.user_id.partner_id.ids)
        if user and user.partner_id.id in partner_ids:
            user._bus_send( "portal_reception.reception_details_reload_request", { 'action': 'reload' } )
            user.send_portal_user_recent_activity( "New message in reception", "New message in reception", "fas fa-bell", "info" )

        if user and user.partner_id.id == self.partner_id.id:
            user.send_portal_user_notification( "New message in reception", "New message in reception", "fas fa-bell", "info" )

        return res

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
