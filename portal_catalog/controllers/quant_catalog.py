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


class StockCatalogController(http.Controller):
    """Controller for stock catalog functionality - shows quants (with or without lots)"""

    @http.route('/catalog/lot-catalog', type='json', auth='user')
    def catalog_stock_catalog(self, page=1, search='', location_id=None, product_id=None, **post):
        """
        Get the stock catalog with pagination.
        Shows all stock (quants) - both products with lots and without lots.
        
        Args:
            page: Page number (default 1)
            search: Search term for lot name, product name or code
            location_id: Optional - filter by location
            product_id: Optional - filter by product
        
        Returns:
            dict with items_html and pagination_html
        """
        StockQuant = request.env['stock.quant'].sudo()

        # Set limit to 20 items per page
        limit = 20
        page = int(page)
        offset = (page - 1) * limit

        # Get user's commercial partner account_partner_id
        user_partner = request.env.user.partner_id
        commercial_partner = user_partner.commercial_partner_id
        account_partner_id = commercial_partner.account_id.id if hasattr(commercial_partner, 'account_id') and commercial_partner.account_id else False

        # Get stock location and repairs location to exclude
        StockLocation = request.env['stock.location'].sudo()
        stock_location = request.env.ref('stock.stock_location_stock')
        repairs_location = request.env.ref('repair_module.stock_location_repairs', raise_if_not_found=False)

        # Build quant domain: stock children excluding repairs, with positive quantity
        domain = [
            ('quantity', '>', 0),
            ('location_id', 'child_of', stock_location.id),
        ]
        
        if repairs_location:
            # Get all repair location children to exclude
            repair_location_ids = StockLocation.search([('id', 'child_of', repairs_location.id)]).ids
            domain.append(('location_id', 'not in', repair_location_ids))

        # Filter by account_partner_id if exists (on the product)
        if account_partner_id:
            domain = expression.AND([
                domain,
                [('product_id.account_partner_id', '=', account_partner_id)]
            ])

        # Filter by specific location if provided
        if location_id:
            domain = expression.AND([
                domain,
                [('location_id', 'child_of', int(location_id))]
            ])

        # Filter by product if provided
        if product_id:
            domain = expression.AND([
                domain,
                [('product_id', '=', int(product_id))]
            ])

        # Search filter - search in product name, code, and lot name (if exists)
        if search:
            domain = expression.AND([
                domain,
                expression.OR([
                    [('lot_id.name', 'ilike', search)],
                    [('product_id.name', 'ilike', search)],
                    [('product_id.default_code', 'ilike', search)],
                ])
            ])

        # Get user language, default to Spanish
        user_lang = request.env.user.sudo().lang or 'es_ES'

        # Get quants with pagination, ordered by product name then lot name
        quants = StockQuant.with_context(lang=user_lang).search(
            domain, 
            limit=limit, 
            offset=offset, 
            order='product_id, lot_id'
        )
        total_count = StockQuant.search_count(domain)
        total_pages = math.ceil(total_count / limit) if total_count > 0 else 1

        # Create pages for pagination template
        pages = []
        for i in range(max(1, page - 2), min(total_pages + 1, page + 3)):
            pages.append({
                'page': i,
                'active': i == page
            })

        # Return both quants and pagination data rendered with templates
        qweb = request.env['ir.qweb'].with_context(lang=user_lang)
        return {
            'status': 'success',
            'lots_html': qweb._render('portal_catalog.portal_stock_catalog_items', {
                'quants': quants
            }),
            'pagination_html': qweb._render('portal_catalog.portal_lot_catalog_pagination', {
                'page': page,
                'pages': pages,
                'total_pages': total_pages,
                'total_count': total_count,
                'has_next': page < total_pages,
                'has_previous': page > 1
            })
        }

