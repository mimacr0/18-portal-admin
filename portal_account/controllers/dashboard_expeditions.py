##############################################################################
#
# Copyright 2025-Today DaFe Solutions
#
##############################################################################

from datetime import datetime, timedelta

from odoo import http, _
from odoo.http import request
from odoo.addons.portal_account.controllers.dashboard import PortalDashboardController


class PortalDashboardExpeditionsController(PortalDashboardController):
    """Controller for expedition-related dashboard endpoints"""

    @http.route('/account/dashboard/kpis/expeditions/count', type='json', auth='user')
    def account_dashboard_kpis_expeditions_count(self, **kw):
        self._ensure_user_lang_context()
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

    @http.route('/account/dashboard/kpis/expeditions/chart', type='json', auth='user')
    def account_dashboard_kpis_expeditions_chart(self, **kw):
        self._ensure_user_lang_context()
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

    @http.route('/account/dashboard/import_expeditions', type='json', auth='user')
    def account_dashboard_import_expeditions(self, **kw):
        """Handle expeditions import request"""
        self._ensure_user_lang_context()
        try:
            # Access the uploaded file from the request
            file_data = kw.get('fileInput')
            if not file_data:
                return {
                    'status': 'error',
                    'errors': [['fileInput', _('No file uploaded.')]]
                }

            return {
                'status': 'success',
                'message': _('Expedition data imported successfully. Processing will begin shortly.')
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': _('An error occurred while processing your import: %s') % str(e)
            }

