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
        print(f"Carriers found: {len(result_items)}")
        return {
            'items': result_items
        }

    @http.route('/account/expedition/create', type='json', auth='user')
    def account_expedition_create(self, term='', **kw):
        return { 'status': 'success', 'message': _('Reception created successfully') }

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
            city_val = city.name if city else (zip_rec.city_id.name if zip_rec and zip_rec.city_id else '')
            state_val = state.name if state else (
                zip_rec.city_id.state_id.name if zip_rec and zip_rec.city_id and zip_rec.city_id.state_id else
                city.state_id.name if city and city.state_id else ''
            )
            country_val = country.name if country else (
                zip_rec.city_id.country_id.name if zip_rec and zip_rec.city_id and zip_rec.city_id.country_id else
                city.country_id.name if city and city.country_id else
                state.country_id.name if state and state.country_id else ''
            )

            full_text = ', '.join(filter(None, [zip_val, city_val, state_val, country_val]))

            return {
                'id': f"{zip_rec.id if zip_rec else city.id if city else state.id if state else country.id}",
                'text': full_text,
                'zip': zip_val,
                'city_name': city_val,
                'state_name': state_val,
                'country_name': country_val
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

        # Build domain with optional search
        domain = [('is_storable', '=', True)]  # Only storable products
        if search:
            domain = expression.AND([
                domain,
                expression.OR([
                    [('name', 'ilike', search)],
                    [('default_code', 'ilike', search)],
                    [('barcode', 'ilike', search)]
                ])
            ])

        # Get products with pagination
        products = ProductProduct.search(domain, limit=limit, offset=offset)
        total_count = ProductProduct.search_count(domain)
        total_pages = math.ceil(total_count / limit)

        # Create pages for pagination template
        pages = []
        for i in range(max(1, page - 2), min(total_pages + 1, page + 3)):
            pages.append({
                'page': i,
                'active': i == page
            })

        # Return both products and pagination data rendered with templates
        qweb = request.env['ir.qweb']
        print("HOLA MUNDO", products)
        return {
            'status': 'success',
            'products_html': qweb._render('portal_reception.portal_product_catalog_items', {
                'products': products
            }),
            'pagination_html': qweb._render('portal_reception.portal_product_catalog_pagination', {
                'page': page,
                'pages': pages,
                'total_pages': total_pages,
                'total_count': total_count,
                'has_next': page < total_pages,
                'has_previous': page > 1
            })
        }
