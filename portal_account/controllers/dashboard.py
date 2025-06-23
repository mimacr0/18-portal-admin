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
        values = self._get_admin_layout_values()
        values['page_url'] = '/account'
        values['apexcharts'] = True
        return request.render("portal_account.portal_dashboard_page", values)

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
