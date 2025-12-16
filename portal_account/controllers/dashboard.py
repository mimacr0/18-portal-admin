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

    @http.route('/account/dashboard/kpis/credit_history', type='json', auth='user')
    def account_dashboard_kpis_credit_history(self, **kw):
        """Fetch credit request history for the current user"""
        self._ensure_user_lang_context()
        AccountPartner = request.env['account.partner'].sudo()
        partner_id = request.env.user.partner_id
        commercial_partner = partner_id.commercial_partner_id
        account_partner = AccountPartner.search([('partner_id', '=', commercial_partner.id)], limit=1)

        if not account_partner:
            return {'status': 'success', 'history': []}

        # Get credit requests history
        CreditAccount = request.env['credit.account'].sudo()
        credit_requests = CreditAccount.search([
            ('account_id', '=', account_partner.id)
        ], order='create_date desc', limit=10)

        # Get currency for formatting
        currency = commercial_partner.currency_id

        history = []
        for req in credit_requests:
            state_labels = {
                'draft': _('Pending'),
                'approved': _('Approved'),
                'rejected': _('Rejected'),
                'cancelled': _('Cancelled'),
            }
            state_colors = {
                'draft': 'amber',
                'approved': 'green',
                'rejected': 'red',
                'cancelled': 'gray',
            }
            history.append({
                'id': req.id,
                'amount': req.amount,
                'amount_formatted': f"{currency.symbol} {req.amount:,.2f}",
                'state': req.state,
                'state_label': state_labels.get(req.state, req.state),
                'state_color': state_colors.get(req.state, 'gray'),
                'date': req.create_date.strftime('%d/%m/%Y') if req.create_date else '',
            })

        return {
            'status': 'success',
            'history': history
        }

    @http.route('/account/dashboard/kpis/recent_activity', type='json', auth='user')
    def account_dashboard_kpis_recent_activity(self, **kw):
        """Fetch recent activities for the current user"""
        self._ensure_user_lang_context()
        UserActivity = request.env['portal.user.activity'].sudo()

        # Get most recent activities for the current user
        activities = UserActivity.search([
            ('user_id', '=', request.env.user.id)
        ], limit=10, order='create_date desc')

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
        
        # Arrived this month (completed receptions)
        receptions_arrived = StockPicking.search_count(reception_domain + [
            ('state', '=', 'done'),
            ('scheduled_date', '>=', first_day_current_month)
        ])
        
        # Pending (not completed, not cancelled)
        receptions_pending = StockPicking.search_count(reception_domain + [
            ('state', 'not in', ['done', 'cancel'])
        ])
        
        # Total historical (all completed receptions)
        receptions_total = StockPicking.search_count(reception_domain + [
            ('state', '=', 'done')
        ])
        
        # Change calculation (arrived this month vs last month)
        receptions_arrived_last = StockPicking.search_count(reception_domain + [
            ('state', '=', 'done'),
            ('scheduled_date', '>=', first_day_last_month),
            ('scheduled_date', '<=', last_day_last_month)
        ])
        receptions_change = calculate_change(receptions_arrived, receptions_arrived_last)
        
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
        
        # === QUOTES (sale.order draft) ===
        SaleOrder = request.env['sale.order'].sudo()
        sales_domain = self._get_sales_domain(partner_ids)
        quotes_domain = sales_domain + [('state', '=', 'draft')]
        
        quotes_total = SaleOrder.search_count(quotes_domain)
        quotes_current_month = SaleOrder.search_count(quotes_domain + [
            ('date_order', '>=', first_day_current_month)
        ])
        quotes_last_month = SaleOrder.search_count(quotes_domain + [
            ('date_order', '>=', first_day_last_month),
            ('date_order', '<=', last_day_last_month)
        ])
        quotes_change = calculate_change(quotes_current_month, quotes_last_month)
        
        # === SALES (sale.order confirmed) ===
        confirmed_domain = sales_domain + [('state', 'in', ['sale', 'done'])]
        
        sales_total = SaleOrder.search_count(confirmed_domain)
        sales_current_month = SaleOrder.search_count(confirmed_domain + [
            ('date_order', '>=', first_day_current_month)
        ])
        sales_last_month = SaleOrder.search_count(confirmed_domain + [
            ('date_order', '>=', first_day_last_month),
            ('date_order', '<=', last_day_last_month)
        ])
        sales_change = calculate_change(sales_current_month, sales_last_month)
        
        # === PRODUCTS (filtered by customer's account_partner) ===
        ProductProduct = request.env['product.product'].sudo()
        
        # Get the customer's account_partner
        partner = request.env.user.partner_id
        account_partner = request.env['account.partner'].sudo().search([
            ('partner_id', '=', partner.commercial_partner_id.id)
        ], limit=1)
        
        # Base domain for customer's products
        products_domain = [('account_partner_id', '=', account_partner.id)] if account_partner else [('id', '=', False)]
        
        # Total products of this customer
        products_total = ProductProduct.search_count(products_domain)

        # Products created this month (new)
        products_new_current = ProductProduct.search_count(products_domain + [
            ('create_date', '>=', first_day_current_month)
        ])
        products_new_last = ProductProduct.search_count(products_domain + [
            ('create_date', '>=', first_day_last_month),
            ('create_date', '<=', last_day_last_month)
        ])
        products_change = calculate_change(products_new_current, products_new_last)
        
        # Products with stock (qty_available > 0)
        products_in_stock = ProductProduct.search_count(products_domain + [('qty_available', '>', 0)])
        
        # Products without stock (qty_available <= 0)
        products_out_stock = ProductProduct.search_count(products_domain + [('qty_available', '<=', 0)])
        
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
                'arrived': receptions_arrived,
                'pending': receptions_pending,
                'total': receptions_total,
                'change': receptions_change,
                'direction': 'up' if receptions_change >= 0 else 'down'
            },
            'expeditions': {
                'total': expeditions_total,
                'change': expeditions_change,
                'direction': 'up' if expeditions_change >= 0 else 'down'
            },
            'quotes': {
                'total': quotes_total,
                'change': quotes_change,
                'direction': 'up' if quotes_change >= 0 else 'down'
            },
            'sales': {
                'total': sales_total,
                'change': sales_change,
                'direction': 'up' if sales_change >= 0 else 'down'
            },
            'products': {
                'total': products_total,
                'new': products_new_current,
                'in_stock': products_in_stock,
                'out_stock': products_out_stock,
                'change': products_change,
                'direction': 'up' if products_change >= 0 else 'down'
            },
            'stock': {
                'total': stock_total,
                'change': stock_change,
                'direction': 'up' if stock_change >= 0 else 'down'
            }
        }
