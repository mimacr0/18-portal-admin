##############################################################################
#
# Copyright 2025-Today DaFe Solutions
#
##############################################################################

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
