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

    def get_related_pickings(self):
        """Return reception, QC, and storage pickings for the same group."""
        self.ensure_one()
        if not self.group_id:
            return self
        return self.env['stock.picking'].search(
            [('group_id', '=', self.group_id.id)],
            order='picking_type_id, id'
        )

    def get_quality_status(self):
        """Return 'passed', 'failed', or 'pending' for QC checks on this picking."""
        self.ensure_one()
        if 'quality.check' not in self.env:
            return False
        QualityCheck = self.env['quality.check'].sudo()
        if 'picking_id' not in QualityCheck._fields:
            return False
        checks = QualityCheck.search([('picking_id', '=', self.id)])
        if not checks:
            return False
        if 'quality_state' in QualityCheck._fields:
            field_name = 'quality_state'
        elif 'state' in QualityCheck._fields:
            field_name = 'state'
        elif 'result' in QualityCheck._fields:
            field_name = 'result'
        else:
            return False
        states = set(checks.mapped(field_name))
        failed_states = {'fail', 'failed', 'ko', 'rejected'}
        passed_states = {'pass', 'passed', 'ok', 'success', 'done'}
        if states & failed_states:
            return 'failed'
        if states and states.issubset(passed_states):
            return 'passed'
        return 'pending'

    def get_quality_status_by_move_line(self):
        """Return {move_line_id: status} for QC checks on this picking."""
        self.ensure_one()
        if 'quality.check' not in self.env:
            return {}
        QualityCheck = self.env['quality.check'].sudo()
        if 'move_line_id' not in QualityCheck._fields:
            return {}
        move_line_ids = self.move_line_ids.ids
        if not move_line_ids:
            return {}
        checks = QualityCheck.search([('move_line_id', 'in', move_line_ids)])
        if not checks:
            return {}
        if 'quality_state' in QualityCheck._fields:
            field_name = 'quality_state'
        elif 'state' in QualityCheck._fields:
            field_name = 'state'
        elif 'result' in QualityCheck._fields:
            field_name = 'result'
        else:
            return {}
        failed_states = {'fail', 'failed', 'ko', 'rejected'}
        passed_states = {'pass', 'passed', 'ok', 'success', 'done'}
        status_by_line = {}
        for check in checks:
            line_id = check.move_line_id.id
            state = check[field_name]
            current = status_by_line.get(line_id)
            if state in failed_states:
                status_by_line[line_id] = 'failed'
            elif state in passed_states:
                if current != 'failed':
                    status_by_line[line_id] = 'passed'
            else:
                if current not in ('failed', 'passed'):
                    status_by_line[line_id] = 'pending'
        return status_by_line

    def get_movement_summary(self):
        """Build a summary per reception move line."""
        self.ensure_one()
        pickings = self.get_related_pickings()
        reception = pickings.filtered(lambda p: p.picking_type_id.code == 'incoming')
        reception = reception[:1] if reception else self

        qc_picking = pickings.filtered(lambda p: p.picking_type_id.barcode == 'NV1QC')
        qc_picking = qc_picking[:1] if qc_picking else pickings.filtered(
            lambda p: p.picking_type_id.code == 'internal'
        )[:1]

        storage_picking = pickings.filtered(lambda p: p.picking_type_id.barcode == 'NV1STOR')
        storage_picking = storage_picking[:1] if storage_picking else pickings.filtered(
            lambda p: p.picking_type_id.code == 'internal' and p != qc_picking
        )[:1]

        def _index_move_lines(picking):
            index = {'lot_id': {}, 'lot_name': {}, 'product_id': {}}
            if not picking:
                return index
            for line in picking.move_line_ids:
                if line.lot_id:
                    index['lot_id'][line.lot_id.id] = line
                if line.lot_name:
                    index['lot_name'][line.lot_name] = line
                index['product_id'].setdefault(line.product_id.id, line)
            return index

        qc_index = _index_move_lines(qc_picking)
        stor_index = _index_move_lines(storage_picking)
        qc_status_map = qc_picking.get_quality_status_by_move_line() if qc_picking else {}

        summary = []
        for line in reception.move_line_ids:
            qc_line = False
            stor_line = False
            if line.lot_id and line.lot_id.id in qc_index['lot_id']:
                qc_line = qc_index['lot_id'][line.lot_id.id]
            elif line.lot_name and line.lot_name in qc_index['lot_name']:
                qc_line = qc_index['lot_name'][line.lot_name]
            else:
                qc_line = qc_index['product_id'].get(line.product_id.id)

            if line.lot_id and line.lot_id.id in stor_index['lot_id']:
                stor_line = stor_index['lot_id'][line.lot_id.id]
            elif line.lot_name and line.lot_name in stor_index['lot_name']:
                stor_line = stor_index['lot_name'][line.lot_name]
            else:
                stor_line = stor_index['product_id'].get(line.product_id.id)

            qc_status = qc_status_map.get(qc_line.id) if qc_line else False
            if not qc_status and qc_picking:
                qc_status = qc_picking.get_quality_status()

            summary.append({
                'reception_line': line,
                'product': line.product_id,
                'quantity': line.quantity or line.qty_done,
                'lot_name': line.lot_id.name or line.lot_name or '',
                'from_location': line.location_id,
                'reception_location': line.location_dest_id,
                'qc_location': qc_line.location_dest_id if qc_line else False,
                'qc_status': qc_status,
                'final_location': stor_line.location_dest_id if stor_line else False,
            })
        return summary

    def get_failed_quality_checks(self):
        """Return failed quality checks and their reasons."""
        self.ensure_one()
        if 'quality.check' not in self.env:
            return []
        QualityCheck = self.env['quality.check'].sudo()
        if 'quality_state' not in QualityCheck._fields:
            return []
        pickings = self.get_related_pickings()
        domain = [('quality_state', '=', 'fail')]
        if 'picking_id' in QualityCheck._fields:
            domain.append(('picking_id', 'in', pickings.ids))
        elif 'move_line_id' in QualityCheck._fields:
            domain.append(('move_line_id.picking_id', 'in', pickings.ids))
        else:
            return []
        checks = QualityCheck.search(domain)
        results = []
        for check in checks:
            reason = ''
            if 'additional_note' in QualityCheck._fields and check.additional_note:
                reason = check.additional_note
            results.append({
                'check': check,
                'product': check.product_id,
                'lot_name': check.lot_id.name if check.lot_id else check.lot_name,
                'picking': check.picking_id if 'picking_id' in QualityCheck._fields else check.move_line_id.picking_id,
                'reason': reason or _('Failed'),
            })
        return results

    def get_note_text(self):
        """Returns the note field as plain text without HTML tags."""
        self.ensure_one()
        return html2plaintext(self.note or '')
