##############################################################################
#
# Copyright 2025-Today DaFe Solutions
#
##############################################################################

from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

from odoo import http, _
from odoo.http import request
from odoo.addons.portal_admin_theme.controllers.admin import PortalAdminController


class PortalDashboardController(PortalAdminController):

    def _get_admin_layout_menus(self):
        menus = super()._get_admin_layout_menus()
        menus.extend([
            {
                'name': _('Home'),
                'url': '/my',
                'icon': 'fas fa-home', 
                'order': 10
            }
        ])
        return menus

    def _get_partner_ids(self):
        """Get partner IDs for the current user (user + commercial partner)"""
        partner_id = request.env.user.partner_id
        return list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

    def _get_expedition_domain(self, partner_ids=None):
        """Get domain for expeditions (stock.picking out)"""
        if partner_ids is None:
            partner_ids = self._get_partner_ids()
        
        expedition_type = request.env.ref('stock.picking_type_out', raise_if_not_found=False)
        domain = [('partner_id', 'in', partner_ids)]
        if expedition_type:
            domain.append(('picking_type_id', '=', expedition_type.id))
        return domain

    def _get_reception_domain(self, partner_ids=None):
        """Get domain for receptions (stock.picking in)"""
        if partner_ids is None:
            partner_ids = self._get_partner_ids()
        
        reception_type = request.env.ref('stock.picking_type_in', raise_if_not_found=False)
        domain = [('partner_id', 'in', partner_ids)]
        if reception_type:
            domain.append(('picking_type_id', '=', reception_type.id))
        return domain

    def _get_sales_domain(self, partner_ids=None):
        """Get domain for sales (sale.order)"""
        if partner_ids is None:
            partner_ids = self._get_partner_ids()
        
        return [('partner_id', 'in', partner_ids)]

    @http.route('/account', type='http', auth="user", website=True)
    def account_redirect(self, **post):
        """Redirige /account a /my"""
        return request.redirect('/my')

    @http.route(['/my', '/my/home'], type='http', auth="user", website=True)
    def account_dashboard_action_main(self, **post):
        # Ensure translations use user's language before rendering
        self._ensure_user_lang_context()
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
        self._ensure_user_lang_context()
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

    @http.route('/account/dashboard/kpis/credit', type='json', auth='user')
    def account_dashboard_kpis_credit(self, **kw):
        self._ensure_user_lang_context()
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

    @http.route('/account/dashboard/kpis/recent_activity', type='json', auth='user')
    def account_dashboard_kpis_recent_activity(self, **kw):
        """Fetch recent activities for the current user"""
        self._ensure_user_lang_context()
        UserActivity = request.env['portal.user.activity'].sudo()

        # Get most recent activities for the current user
        activities = UserActivity.search([
            ('user_id', '=', request.env.user.id)
        ], limit=3, order='create_date desc')

        # Render the recent activity template
        html_content = request.env['ir.ui.view']._render_template(
            'portal_account.portal_dashboard_recent_activity_content',
            { 'recent_activity': activities }
        )

        return {
            'status': 'success',
            'html': html_content,
            'count': len(activities)
        }

    @http.route('/account/dashboard/kpis/stats', type='json', auth='user')
    def account_dashboard_kpis_stats(self, **kw):
        """Calculate dashboard KPIs: receptions, expeditions, products, stock"""
        self._ensure_user_lang_context()
        
        partner_ids = self._get_partner_ids()
        
        # Date ranges
        today = datetime.now().date()
        first_day_current_month = today.replace(day=1)
        first_day_last_month = first_day_current_month - relativedelta(months=1)
        last_day_last_month = first_day_current_month - timedelta(days=1)
        
        def calculate_change(current, previous):
            """Calculate percentage change between two values"""
            if previous == 0:
                return 100.0 if current > 0 else 0.0
            return round(((current - previous) / previous) * 100, 1)
        
        # === RECEPTIONS ===
        StockPicking = request.env['stock.picking'].sudo()
        reception_domain = self._get_reception_domain(partner_ids)
        
        receptions_total = StockPicking.search_count(reception_domain)
        receptions_current_month = StockPicking.search_count(reception_domain + [
            ('scheduled_date', '>=', first_day_current_month)
        ])
        receptions_last_month = StockPicking.search_count(reception_domain + [
            ('scheduled_date', '>=', first_day_last_month),
            ('scheduled_date', '<=', last_day_last_month)
        ])
        receptions_change = calculate_change(receptions_current_month, receptions_last_month)
        
        # === EXPEDITIONS (stock.picking salida) ===
        expedition_domain = self._get_expedition_domain(partner_ids)
        
        expeditions_total = StockPicking.search_count(expedition_domain)
        expeditions_current_month = StockPicking.search_count(expedition_domain + [
            ('scheduled_date', '>=', first_day_current_month)
        ])
        expeditions_last_month = StockPicking.search_count(expedition_domain + [
            ('scheduled_date', '>=', first_day_last_month),
            ('scheduled_date', '<=', last_day_last_month)
        ])
        expeditions_change = calculate_change(expeditions_current_month, expeditions_last_month)
        
        # === SALES (sale.order) ===
        SaleOrder = request.env['sale.order'].sudo()
        sales_domain = self._get_sales_domain(partner_ids)
        
        sales_total = SaleOrder.search_count(sales_domain)
        sales_current_month = SaleOrder.search_count(sales_domain + [
            ('date_order', '>=', first_day_current_month)
        ])
        sales_last_month = SaleOrder.search_count(sales_domain + [
            ('date_order', '>=', first_day_last_month),
            ('date_order', '<=', last_day_last_month)
        ])
        sales_change = calculate_change(sales_current_month, sales_last_month)
        
        # === PRODUCTS ===
        ProductProduct = request.env['product.product'].sudo()
        # Products that have been involved in receptions or sales for this partner
        products_total = ProductProduct.search_count([('qty_available', '>', 0)])
        # For change, we compare products with stock movements this month vs last month
        StockMove = request.env['stock.move'].sudo()
        products_moved_current = len(StockMove.search([
            ('partner_id', 'in', partner_ids),
            ('date', '>=', first_day_current_month),
            ('state', '=', 'done')
        ]).mapped('product_id'))
        products_moved_last = len(StockMove.search([
            ('partner_id', 'in', partner_ids),
            ('date', '>=', first_day_last_month),
            ('date', '<=', last_day_last_month),
            ('state', '=', 'done')
        ]).mapped('product_id'))
        products_change = calculate_change(products_moved_current, products_moved_last)
        
        # === STOCK ===
        StockQuant = request.env['stock.quant'].sudo()
        # Total stock quantity
        quants = StockQuant.search([('quantity', '>', 0)])
        stock_total = int(sum(quants.mapped('quantity')))
        # For stock change, compare with a snapshot approach (simplified)
        # This is an approximation - for accurate historical stock you'd need stock valuation history
        stock_change = 0.0  # Stock change is complex to calculate accurately without history
        
        # DEBUG
        
        return {
            'status': 'success',
            'translations': {
                'since_last_month': _('since last month'),
                'error_loading': _('Error loading data'),
            },
            'receptions': {
                'total': receptions_total,
                'change': receptions_change,
                'direction': 'up' if receptions_change >= 0 else 'down'
            },
            'expeditions': {
                'total': expeditions_total,
                'change': expeditions_change,
                'direction': 'up' if expeditions_change >= 0 else 'down'
            },
            'sales': {
                'total': sales_total,
                'change': sales_change,
                'direction': 'up' if sales_change >= 0 else 'down'
            },
            'products': {
                'total': products_total,
                'change': products_change,
                'direction': 'up' if products_change >= 0 else 'down'
            },
            'stock': {
                'total': stock_total,
                'change': stock_change,
                'direction': 'up' if stock_change >= 0 else 'down'
            }
        }
