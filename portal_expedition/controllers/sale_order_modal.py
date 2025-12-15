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

        # si al final lo metemos en una raíz o algo esto se debvería cambiar por el método en la raíz,
        # si no se va a hacer, a lo mejor deberíamos dejar el código
        return self.account_reception_product_search(term, **kw)

        ## Este return sustituye al código siguiente
        # """Search products based on term for select2 with product attributes"""
        # ProductProduct = request.env['product.product'].sudo()
        # domain = [('is_storable', '=', True)]  # Only storable products

        # if term:
        #     # Search in product name, code, barcode AND product attributes
        #     domain = expression.AND([
        #         domain,
        #         expression.OR([
        #             [('name', 'ilike', term)],
        #             [('default_code', 'ilike', term)],
        #             [('barcode', 'ilike', term)],
        #             # Search in attributes
        #             [('product_template_attribute_value_ids.name', 'ilike', term)],
        #             [('product_template_attribute_value_ids.attribute_id.name', 'ilike', term)]
        #         ])
        #     ])

        # products = ProductProduct.search(domain, limit=10)

        # # Prepare product data with attributes
        # result_items = []
        # for product in products:
        #     # Get product attribute values
        #     attributes = []
        #     for attr_value in product.product_template_attribute_value_ids:
        #         attributes.append({
        #             'id': attr_value.id,
        #             'name': attr_value.name,
        #             'attribute_name': attr_value.attribute_id.name,
        #             'value': attr_value.name,
        #             'display_name': f"{attr_value.attribute_id.name}: {attr_value.name}"
        #         })

        #     result_items.append({
        #         'id': product.id,
        #         'text': product.name,
        #         'default_code': product.default_code or '',
        #         'barcode': product.barcode or '',
        #         'price': product.list_price,
        #         'currency': product.currency_id.symbol,
        #         'attributes': attributes,
        #         'image': product.image_128 and f"data:image/png;base64,{product.image_128.decode('utf-8')}" or False
        #     })

        # return {
        #     'status': 'success',
        #     'items': result_items
        # }


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
        """Get the product catalog with pagination"""
        ProductProduct = request.env['product.product'].sudo()

        # Set limit to 20 items per page
        limit = 20
        page = int(page)
        offset = (page - 1) * limit

        # Get user's commercial partner account_partner_id
        user_partner = request.env.user.partner_id
        commercial_partner = user_partner.commercial_partner_id
        account_partner_id = commercial_partner.account_id.id if commercial_partner.account_id else False

        # Build domain with optional search
        domain = [('is_storable', '=', True)]  # Only storable products
        
        # Filter by account_partner_id if it exists
        if account_partner_id:
            domain = expression.AND([
                domain,
                [('account_partner_id', '=', account_partner_id)]
            ])
        
        if search:
            domain = expression.AND([
                domain,
                expression.OR([
                    [('name', 'ilike', search)],
                    [('default_code', 'ilike', search)],
                    [('barcode', 'ilike', search)]
                ])
            ])

        # Obtener el idioma del usuario, por defecto español
        user_lang = request.env.user.sudo().lang or 'es_ES'
        
        # Get products with pagination (con contexto de idioma)
        products = ProductProduct.with_context(lang=user_lang).search(domain, limit=limit, offset=offset)
        total_count = ProductProduct.search_count(domain)
        total_pages = math.ceil(total_count / limit)

        # Create pages for pagination template
        pages = []
        for i in range(max(1, page - 2), min(total_pages + 1, page + 3)):
            pages.append({
                'page': i,
                'active': i == page
            })

        # Return both products and pagination data rendered with templates (con contexto de idioma)
        qweb = request.env['ir.qweb'].with_context(lang=user_lang)
        return {
            'status': 'success',
            'products_html': qweb._render('portal_expedition.portal_product_catalog_items', {
                'products': products
            }),
            'pagination_html': qweb._render('portal_expedition.portal_product_catalog_pagination', {
                'page': page,
                'pages': pages,
                'total_pages': total_pages,
                'total_count': total_count,
                'has_next': page < total_pages,
                'has_previous': page > 1
            })
        }
