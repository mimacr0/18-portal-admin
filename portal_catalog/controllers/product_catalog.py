# -*- coding: utf-8 -*-
##############################################################################
#
# Copyright 2024 DaFe Solutions
#
##############################################################################

import math
from odoo import http
from odoo.http import request
from odoo.osv import expression


class ProductCatalogController(http.Controller):
    """Controller for product catalog functionality - reusable across modules"""

    def get_stock_filter_domain(self):
        """
        Returns a domain to filter products with stock in valid locations
        (stock children, excluding repairs location).
        
        Use this to build extra_domain for catalog_product_catalog.
        """
        StockQuant = request.env['stock.quant'].sudo()
        stock_location = request.env.ref('stock.stock_location_stock')
        repairs_location = request.env.ref('repair_module.stock_location_repairs', raise_if_not_found=False)

        quant_domain = [
            ('quantity', '>', 0),
            ('location_id', 'child_of', stock_location.id),
        ]
        if repairs_location:
            quant_domain.append(('location_id', '!=', repairs_location.id))

        product_ids_with_stock = StockQuant.search(quant_domain).mapped('product_id').ids
        return [('id', 'in', product_ids_with_stock)]

    @http.route('/catalog/product-search', type='json', auth='user')
    def catalog_product_search(self, term='', **kw):
        """
        Search products based on term for select2 with product attributes.
        Reusable endpoint for expedition, reception, repair, etc.
        """
        # Ensure user language context
        user_lang = request.env.user.sudo().lang or 'es_ES'
        ProductProduct = request.env['product.product'].sudo().with_context(lang=user_lang)
        
        domain = [('is_storable', '=', True)]

        # Get user's commercial partner account_partner_id
        user_partner = request.env.user.partner_id
        commercial_partner = user_partner.commercial_partner_id
        account_partner_id = commercial_partner.account_id.id if hasattr(commercial_partner, 'account_id') and commercial_partner.account_id else False

        if account_partner_id:
            domain = expression.AND([
                domain,
                [('account_partner_id', '=', account_partner_id)]
            ])

        if term:
            domain = expression.AND([
                domain,
                expression.OR([
                    [('name', 'ilike', term)],
                    [('default_code', 'ilike', term)],
                    [('barcode', 'ilike', term)],
                    [('product_template_attribute_value_ids.name', 'ilike', term)],
                    [('product_template_attribute_value_ids.attribute_id.name', 'ilike', term)]
                ])
            ])

        products = ProductProduct.search(domain, limit=10)

        result_items = []
        for product in products:
            attributes = []
            for attr_value in product.product_template_attribute_value_ids:
                attributes.append({
                    'id': attr_value.id,
                    'name': attr_value.name,
                    'attribute_name': attr_value.attribute_id.name,
                    'value': attr_value.name,
                    'display_name': f"{attr_value.attribute_id.name}: {attr_value.name}"
                })

            result_items.append({
                'id': product.id,
                'text': product.name,
                'default_code': product.default_code or '',
                'barcode': product.barcode or '',
                'price': product.list_price,
                'currency': product.currency_id.symbol,
                'attributes': attributes,
                'image': product.image_128 and f"data:image/png;base64,{product.image_128.decode('utf-8')}" or False
            })

        return {
            'status': 'success',
            'items': result_items
        }

    @http.route('/catalog/product-catalog', type='json', auth='user')
    def catalog_product_catalog(self, page=1, search='', extra_domain=None, **post):
        """
        Get the product catalog with pagination.
        
        Args:
            page: Page number (default 1)
            search: Search term
            extra_domain: Additional domain to filter products (list of tuples).
                          Use get_stock_filter_domain() to filter by stock.
        """
        ProductProduct = request.env['product.product'].sudo()

        # Set limit to 20 items per page
        limit = 20
        page = int(page)
        offset = (page - 1) * limit

        # Get user's commercial partner account_partner_id
        user_partner = request.env.user.partner_id
        commercial_partner = user_partner.commercial_partner_id
        account_partner_id = commercial_partner.account_id.id if hasattr(commercial_partner, 'account_id') and commercial_partner.account_id else False

        domain = [('is_storable', '=', True)]

        # Apply extra domain if provided
        if extra_domain:
            domain = expression.AND([domain, extra_domain])

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

        # Get user language, default to Spanish
        user_lang = request.env.user.sudo().lang or 'es_ES'

        # Get products with pagination
        products = ProductProduct.with_context(lang=user_lang).search(domain, limit=limit, offset=offset)
        total_count = ProductProduct.search_count(domain)
        total_pages = math.ceil(total_count / limit) if total_count > 0 else 1

        # Create pages for pagination template
        pages = []
        for i in range(max(1, page - 2), min(total_pages + 1, page + 3)):
            pages.append({
                'page': i,
                'active': i == page
            })

        # Return both products and pagination data rendered with templates
        qweb = request.env['ir.qweb'].with_context(lang=user_lang)
        return {
            'status': 'success',
            'products_html': qweb._render('portal_catalog.portal_product_catalog_items', {
                'products': products
            }),
            'pagination_html': qweb._render('portal_catalog.portal_product_catalog_pagination', {
                'page': page,
                'pages': pages,
                'total_pages': total_pages,
                'total_count': total_count,
                'has_next': page < total_pages,
                'has_previous': page > 1
            })
        }

