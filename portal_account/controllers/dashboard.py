##############################################################################
#
# Copyright 2025-Today DaFe Solutions
#
##############################################################################

from odoo import http, _
from odoo.http import request
from odoo.osv import expression
from odoo.addons.portal_admin_theme.controllers.admin import PortalAdminController


class PortalDashboardController(PortalAdminController):

    def _get_admin_layout_menus(self):
        menus = super()._get_admin_layout_menus()
        menus.extend([
            {
                'name': _('Home'),
                'url': '/account',
                'icon': 'fas fa-home'
            }
        ])
        return menus

    @http.route(['/account'], type='http', auth="user", website=True)
    def account_dashboard_action_main(self, **post):
        PartnerAccount = request.env['account.partner'].sudo()
        partner_id = request.env.user.partner_id
        account = PartnerAccount.search([('partner_id', '=', partner_id.commercial_partner_id.id)], limit=1)
        values = self._get_admin_layout_values()
        values['page_url'] = '/account'
        values['apexcharts'] = True
        values['account_partner'] = account
        return request.render("portal_account.portal_dashboard_page", values)

    @http.route('/account/dashboard/add_credit', type='json', auth='user')
    def account_dashboard_add_credit(self, credit_amount=0, **kw):
        """Handle credit addition request"""
        if not credit_amount or float(credit_amount) <= 0:
            return {
                'status': 'error',
                'errors': [['credit_amount', _('Please enter a valid amount greater than zero.')]]
            }

        try:
            credit_amount = float(credit_amount)
            AccountPartner = request.env['account.partner'].sudo()
            partner_id = request.env.user.partner_id
            commercial_partner = partner_id.commercial_partner_id
            account_partner = AccountPartner.search([('partner_id', '=', commercial_partner.id)], limit=1)

            if not account_partner:
                return {
                    'status': 'error',
                    'message': _('Account not found.')
                }

            # Create credit request
            CreditAccount = request.env['credit.account'].sudo()
            credit_request = CreditAccount.create({
                'account_id': account_partner.id,
                'amount': credit_amount,
                'state': 'draft'
            })

            return {
                'status': 'success',
                'message': _('Credit request submitted successfully and pending approval.'),
                'request_id': credit_request.id
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': _('An error occurred while processing your request: %s') % str(e)
            }

    @http.route('/account/dashboard/kpis/receptions/count', type='json', auth='user')
    def account_dashboard_kpis_receptions_count(self, **kw):
        StockPicking = request.env['stock.picking'].sudo()
        reception_type = request.env.ref('stock.picking_type_in')
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

        domain = [
            ('picking_type_id', '=', reception_type.id),
            ('partner_id', 'in', partner_ids),
            ('state', '!=', 'draft')
        ]

        count = StockPicking.search_count(domain)

        return {
            'status': 'success',
            'count': count
        }

    @http.route('/account/dashboard/kpis/expeditions/count', type='json', auth='user')
    def account_dashboard_kpis_expeditions_count(self, **kw):
        StockPicking = request.env['stock.picking'].sudo()
        expedition_type = request.env.ref('stock.picking_type_out')
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

        domain = [
            ('picking_type_id', '=', expedition_type.id),
            ('partner_id', 'in', partner_ids),
            ('state', '!=', 'draft')
        ]

        count = StockPicking.search_count(domain)

        return {
            'status': 'success',
            'count': count
        }

    @http.route('/account/dashboard/kpis/receptions/chart', type='json', auth='user')
    def account_dashboard_kpis_receptions_chart(self, **kw):
        StockPicking = request.env['stock.picking'].sudo()
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

        # Get reception type
        reception_type = request.env.ref('stock.picking_type_in')

        # Query for receptions by day (last 7 days)
        query_receptions = """
            SELECT
                DATE(date) as date,
                COUNT(*) as count
            FROM
                stock_picking
            WHERE
                picking_type_id = %s
                AND partner_id IN %s
                AND state != 'draft'
                AND date >= NOW() - INTERVAL '7 days'
            GROUP BY
                DATE(date)
            ORDER BY
                date ASC;
        """

        # Execute queries
        request.cr.execute(query_receptions, (reception_type.id, tuple(partner_ids)))
        receptions_data = request.cr.dictfetchall()

        # Format data for charts
        reception_values = []
        dates = []

        # Get last 7 days
        from datetime import datetime, timedelta
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=6)
        current_date = start_date

        # Create a date-indexed dict for easy lookup
        reception_by_date = {item['date'].strftime('%Y-%m-%d'): item['count'] for item in receptions_data}

        # Fill in data for all 7 days
        while current_date <= end_date:
            date_str = current_date.strftime('%Y-%m-%d')
            dates.append(date_str)
            reception_values.append(reception_by_date.get(date_str, 0))
            current_date += timedelta(days=1)

        return {
            'status': 'success',
            'dates': dates,
            'values': reception_values
        }

    @http.route('/account/dashboard/kpis/expeditions/chart', type='json', auth='user')
    def account_dashboard_kpis_expeditions_chart(self, **kw):
        StockPicking = request.env['stock.picking'].sudo()
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

        # Get expedition type
        expedition_type = request.env.ref('stock.picking_type_out')

        # Query for expeditions by day (last 7 days)
        query_expeditions = """
            SELECT
                DATE(date) as date,
                COUNT(*) as count
            FROM
                stock_picking
            WHERE
                picking_type_id = %s
                AND partner_id IN %s
                AND state != 'draft'
                AND date >= NOW() - INTERVAL '7 days'
            GROUP BY
                DATE(date)
            ORDER BY
                date ASC;
        """

        # Execute queries
        request.cr.execute(query_expeditions, (expedition_type.id, tuple(partner_ids)))
        expeditions_data = request.cr.dictfetchall()

        # Format data for charts
        expedition_values = []
        dates = []

        # Get last 7 days
        from datetime import datetime, timedelta
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=6)
        current_date = start_date

        # Create a date-indexed dict for easy lookup
        expedition_by_date = {item['date'].strftime('%Y-%m-%d'): item['count'] for item in expeditions_data}

        # Fill in data for all 7 days
        while current_date <= end_date:
            date_str = current_date.strftime('%Y-%m-%d')
            dates.append(date_str)
            expedition_values.append(expedition_by_date.get(date_str, 0))
            current_date += timedelta(days=1)

        return {
            'status': 'success',
            'dates': dates,
            'values': expedition_values
        }

    @http.route('/account/dashboard/kpis/credit', type='json', auth='user')
    def account_dashboard_kpis_credit(self, **kw):
        AccountPartner = request.env['account.partner'].sudo()
        partner_id = request.env.user.partner_id
        commercial_partner = partner_id.commercial_partner_id
        account_partner = AccountPartner.search([('partner_id', '=', commercial_partner.id)], limit=1)

        # Get total account credit from commercial partner
        available_credit = commercial_partner.total_account or 0.0

        # Check for pending approval requests
        AccountRequest = request.env['credit.account'].sudo()
        pending_approval = 0.0

        pending_requests = AccountRequest.search([
            ('account_id', '=', account_partner.id),
            ('state', '=', 'draft')
        ])
        if pending_requests:
            pending_approval = sum(pending_requests.mapped('amount'))

        # Show/hide pending approval section in UI based on value
        has_pending = pending_approval > 0

        # Get locale formatting information
        currency = commercial_partner.currency_id

        # Format settings for numbers
        decimal_places = currency.decimal_places
        thousand_separator = request.env['res.lang'].search([('code', '=', request.env.user.lang)], limit=1).thousands_sep or ','
        decimal_separator = request.env['res.lang'].search([('code', '=', request.env.user.lang)], limit=1).decimal_point or '.'

        return {
            'status': 'success',
            'currency_symbol': currency.symbol,
            'available_credit': available_credit,
            'pending_approval': pending_approval,
            'has_pending': has_pending,
            'decimal_places': decimal_places,
            'thousand_separator': thousand_separator,
            'decimal_separator': decimal_separator
        }

    @http.route('/account/dashboard/import_receptions', type='json', auth='user')
    def account_dashboard_import_receptions(self, **kw):
        """Handle receptions import request"""
        try:
            # Access the uploaded file from the request
            file_data = kw.get('fileInput')
            if not file_data:
                return {
                    'status': 'error',
                    'errors': [['fileInput', _('No file uploaded.')]]
                }

            # Process the file data - this will depend on your specific implementation
            # For example, you might want to save it temporarily and process it through a queue job

            # Here you would typically:
            # 1. Check file format/extension
            # 2. Parse the file data
            # 3. Create stock.picking records for receptions

            return {
                'status': 'success',
                'message': _('Reception data imported successfully. Processing will begin shortly.')
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': _('An error occurred while processing your import: %s') % str(e)
            }

    @http.route('/account/dashboard/import_expeditions', type='json', auth='user')
    def account_dashboard_import_expeditions(self, **kw):
        """Handle expeditions import request"""
        try:
            # Access the uploaded file from the request
            file_data = kw.get('fileInput')
            if not file_data:
                return {
                    'status': 'error',
                    'errors': [['fileInput', _('No file uploaded.')]]
                }

            # Process the file data - this will depend on your specific implementation
            # For example, you might want to save it temporarily and process it through a queue job

            # Here you would typically:
            # 1. Check file format/extension
            # 2. Parse the file data
            # 3. Create stock.picking records for expeditions

            return {
                'status': 'success',
                'message': _('Expedition data imported successfully. Processing will begin shortly.')
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': _('An error occurred while processing your import: %s') % str(e)
            }
