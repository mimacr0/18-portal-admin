##############################################################################
#
# Copyright 2025 DaFe Solutions
#
##############################################################################

import math
import json
from functools import lru_cache

from odoo import http, _
from odoo.addons.portal_admin_theme.controllers.admin import PortalAdminController
from odoo.http import request
from odoo.osv import expression
from datetime import datetime
##############################################################################

class PortalExpeditionController(PortalAdminController):

    @http.route('/account/expedition/carrier-search', type='json', auth='user')
    def account_expedition_carrier_search(self, term='', **kw):
        """Search carriers based on term for select2"""
        DeliveryCarrier = request.env['delivery.carrier'].sudo()
        domain = []

        if term:
            domain = expression.OR([
                [('name', 'ilike', term)],
                [('delivery_type', 'ilike', term)]
            ])

        carriers = DeliveryCarrier.search(domain, limit=10)

        # Prepare carrier data
        result_items = []
        for carrier in carriers:
            result_items.append({
                'id': carrier.id,
                'text': carrier.name,
                'delivery_type': carrier.delivery_type
            })
        return {
            'items': result_items
        }

    @http.route('/account/expedition/create', type='json', auth='user')
    def account_expedition_create(self, **post):
        partner = request.env.user.partner_id

        ResPartner = request.env['res.partner'].sudo()
        ProductProduct = request.env['product.product'].sudo()
        SaleOrder = request.env['sale.order'].sudo()
        AccountPartner = request.env['account.partner'].sudo()

        partner_name = post.get('name')
        street = post.get('street')
        street2 = post.get('street2')
        zip_id = post.get('zip_id')
        zip = post.get('zip')
        city_id = post.get('city_id')
        city = post.get('city')
        state_id = post.get('state_id')
        country_id = post.get('country_id')
        phone = post.get('phone')
        mobile = post.get('mobile') or ''
        email = post.get('email')
        carrier_id = post.get('carrier_id')
        client_order_ref = post.get('client_ref')
        products = json.loads(post.get('products', '[]'))
        account_partner = AccountPartner.search([('partner_id', '=', partner.commercial_partner_id.id)], limit=1)

        # Create shipping partner
        partner_shipping = ResPartner.create({
            'name': partner_name,
            'street': street,
            'street2': street2,
            # 'zip_id': zip_id,
            'zip': zip,
            'city_id': city_id,
            'city': city,
            'state_id': state_id,
            'country_id': country_id,
            'phone': phone,
            'mobile': mobile,
            'email': email,
            'type': 'delivery',
        })


        moves = []
        for product in products:
            pid = product.get('product_id')
            qty = product.get('quantity')

            if not pid:
                return { 'status': 'error', 'message': _('Product not found') }

            if not pid.isdigit():
                return { 'status': 'error', 'message': _('Invalid product ID') }

            product = ProductProduct.browse(int(pid))

            if not product:
                return { 'status': 'error', 'message': _('Product not found') }

            if '.' in qty and not qty.replace('.', '').isdigit():
                return { 'status': 'error', 'message': _('Invalid quantity') }

            if '.' not in qty and not qty.isdigit():
                return { 'status': 'error', 'message': _('Invalid quantity') }

            moves.append([0, 0, {
                'name': product.display_name,
                'product_id': product.id,
                'product_uom_qty': float(qty)
            }])

        order = SaleOrder.create({
            'account_partner_id': account_partner.id,
            'partner_id': partner.commercial_partner_id.id,
            'partner_invoice_id':  partner.commercial_partner_id.id,
            'partner_shipping_id': partner_shipping.id,
            'order_line': moves,
            'carrier_id': carrier_id,
            'client_order_ref': client_order_ref,
        })

        # Send recent activity notification
        user = request.env.user
        user.send_portal_user_recent_activity(
            "Expedition '%s' created",
            "New expedition",
            "fas fa-plus-circle",
            "success",
            message_args=[order.name]
        )

        return { 'status': 'success', 'message': _('Expedition created successfully') }

    @http.route('/account/expedition/product-search', type='json', auth='user')
    def account_expedition_product_search(self, term='', **kw):
        """Search products - delegates to centralized catalog endpoint"""
        from odoo.addons.portal_catalog.controllers.product_catalog import ProductCatalogController
        return ProductCatalogController().catalog_product_search(term, **kw)

    @http.route('/account/expedition/address-search', type='json', auth='user')
    def address_search(self, term='', **kwargs):
        ResZip = request.env['res.city.zip'].sudo()
        ResCity = request.env['res.city'].sudo()
        ResState = request.env['res.country.state'].sudo()
        ResCountry = request.env['res.country'].sudo()

        term = term.strip()
        fragments = [f.strip() for f in term.split(',') if f.strip()]
        results = []

        def format_result(zip_rec=None, city=None, state=None, country=None):
            zip_val = zip_rec.name if zip_rec else ''
            city_obj = city or (zip_rec.city_id if zip_rec else None)
            city_val = city_obj.name if city_obj else ''

            state_obj = state or (
                zip_rec.city_id.state_id if zip_rec and zip_rec.city_id else
                city_obj.state_id if city_obj else None
            )
            state_val = state_obj.name if state_obj else ''

            country_obj = country or (
                zip_rec.city_id.country_id if zip_rec and zip_rec.city_id else
                city_obj.country_id if city_obj else
                state_obj.country_id if state_obj else None
            )
            country_val = country_obj.name if country_obj else ''

            full_text = ', '.join(filter(None, [zip_val, city_val, state_val, country_val]))

            return {
                'id': f"{zip_rec.id if zip_rec else city_obj.id if city_obj else state_obj.id if state_obj else country_obj.id if country_obj else ''}",
                'text': full_text,
                'zip': zip_val,
                'zip_id': zip_rec.id if zip_rec else None,
                'city_name': city_val,
                'city_id': city_obj.id if city_obj else None,
                'state_name': state_val,
                'state_id': state_obj.id if state_obj else None,
                'country_name': country_val,
                'country_id': country_obj.id if country_obj else None
            }


        MAX_RESULTS = 10
        results = []

        for fragment in fragments:
            # Buscar por ZIP
            zip_matches = ResZip.search([('name', 'ilike', fragment)], limit=MAX_RESULTS)
            results += [format_result(zip_rec=z) for z in zip_matches]
            if len(results) >= MAX_RESULTS:
                break

            # Buscar por ciudad
            city_matches = ResCity.search([('name', 'ilike', fragment)], limit=5)
            for city in city_matches:
                zips = ResZip.search([('city_id', '=', city.id)], limit=3)
                if zips:
                    results += [format_result(zip_rec=z) for z in zips]
                else:
                    results.append(format_result(city=city, state=city.state_id, country=city.country_id))
                if len(results) >= MAX_RESULTS:
                    break
            if len(results) >= MAX_RESULTS:
                break

            # Buscar ZIPs relacionados al estado directamente
            state_zip_matches = ResZip.search([
                ('city_id.state_id.name', 'ilike', fragment)
            ], limit=MAX_RESULTS - len(results))
            results += [format_result(zip_rec=z) for z in state_zip_matches]
            if len(results) >= MAX_RESULTS:
                break

            # Buscar ZIPs relacionados al país directamente
            country_zip_matches = ResZip.search([
                ('city_id.country_id.name', 'ilike', fragment)
            ], limit=MAX_RESULTS - len(results))
            results += [format_result(zip_rec=z) for z in country_zip_matches]
            if len(results) >= MAX_RESULTS:
                break

        return {'items': results[:MAX_RESULTS]}

    @http.route('/account/expedition/product-catalog', type='json', auth='user')
    def account_expedition_product_catalog(self, page=1, search='', **post):
        """Get the product catalog - delegates to centralized catalog (with stock filter)"""
        from odoo.addons.portal_catalog.controllers.product_catalog import ProductCatalogController
        controller = ProductCatalogController()
        stock_domain = controller.get_stock_filter_domain()
        return controller.catalog_product_catalog(page, search, extra_domain=stock_domain, **post)
