##############################################################################
#
# Copyright 2025-Today DaFe Solutions
#
##############################################################################

import math
import json
import pytz
from datetime import datetime

from odoo import fields, http, _
from odoo.http import request
from odoo.osv import expression
from odoo.addons.portal_reception.controllers.reception_details import PortalReceptionDetailsController


class PortalReceptionModalController(PortalReceptionDetailsController):
    """Controller for reception creation modal and search endpoints"""

    @http.route('/account/reception/create', type='json', auth='user')
    def account_reception_create(self, **post):
        """Create a new reception package"""
        self._ensure_user_lang_context()
        partner = request.env.user.partner_id

        StockQuantPackage = request.env['stock.quant.package'].sudo()
        AccountPartner = request.env['account.partner'].sudo()

        sender_id = post.get('sender_id')
        shipping_address_id = post.get('shipping_address_id')
        carrier_id = post.get('carrier_id')
        customer_reference = post.get('customer_reference')
        number_of_packages = post.get('number_of_packages')
        package_type_id = post.get('package_type_id')
        weight = post.get('weight')
        notes = post.get('notes')
        products = json.loads(post.get('products') or '[]')

        if len(products) == 0:
            return {'status': 'error', 'message': _('No products selected')}

        account_partner = AccountPartner.search([('partner_id', '=', partner.commercial_partner_id.id)], limit=1)
        
        # Determine carrier if needed, or just use weight
        package_vals = {
            'package_type_id': int(package_type_id) if package_type_id else False,
            'carrier_id': int(carrier_id) if carrier_id else False,
            'owner_id': partner.commercial_partner_id.id,
            'sender_id': int(sender_id) if sender_id else False,
            'shipping_address_id': int(shipping_address_id) if shipping_address_id else False,
            'customer_reference': customer_reference or False,
            'number_of_packages': int(number_of_packages) if number_of_packages else 1,
            'type': 'return',
            'notes': notes,
            'shipping_weight': float(weight) if weight else 0.0,
            'pack_date': fields.Date.today(),
        }

        # Use set_name_based_on_account if it exists and we want specific sequence
        if hasattr(StockQuantPackage, 'set_name_based_on_account'):
            package_vals['name'] = StockQuantPackage.set_name_based_on_account(account_partner)

        try:
            package = StockQuantPackage.create(package_vals)

            # Add products to rma.package.line
            for product in products:
                request.env['rma.package.line'].sudo().create({
                    'package_id': package.id,
                    'product_map_id': int(product['product_id']),
                    'quantity': int(product['quantity']),
                })

            # Send recent activity notification
            user = request.env.user
            if hasattr(user, 'send_portal_user_recent_activity'):
                user.send_portal_user_recent_activity(
                    "Package '%s' created",
                    "New RMA package",
                    "fas fa-box",
                    "success",
                    message_args=[package.name]
                )

            return {'status': 'success', 'message': _('Package created successfully'), 'id': package.id}
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

    @http.route('/account/reception/address/create', type='json', auth='user')
    def account_reception_partner_create(self, **post):
        """Create a new res.partner as child of the user's commercial partner"""
        self._ensure_user_lang_context()
        partner = request.env.user.partner_id
        name = post.get('name', '').strip()
        if not name:
            return {'status': 'error', 'message': _('Name is required')}

        vals = {
            'name': name,
            'parent_id': partner.commercial_partner_id.id,
            'type': post.get('type', 'contact'),
        }

        if post.get('email'):
            vals['email'] = post['email']
        if post.get('phone'):
            vals['phone'] = post['phone']
        if post.get('street'):
            vals['street'] = post['street']
        if post.get('city'):
            vals['city'] = post['city']
        if post.get('zip'):
            vals['zip'] = post['zip']
        if post.get('country_id'):
            vals['country_id'] = int(post['country_id'])

        try:
            new_partner = request.env['res.partner'].sudo().create(vals)
            return {
                'status': 'success',
                'id': new_partner.id,
                'name': new_partner.name,
                'display_name': new_partner.display_name,
            }
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

    @http.route('/account/reception/product-catalog', type='json', auth='user')
    def account_reception_product_catalog(self, page=1, search='', **post):
        """Get the product catalog - locally implemented to avoid portal_catalog dependency"""
        self._ensure_user_lang_context()
        ProductProduct = request.env['product.product'].sudo()

        # Set limit to 20 items per page
        limit = 20
        page = int(page)
        offset = (page - 1) * limit

        domain = []

        if search:
            domain = expression.AND([
                domain,
                expression.OR([
                    [('name', 'ilike', search)],
                    [('default_code', 'ilike', search)],
                    [('barcode', 'ilike', search)]
                ])
            ])

        # Get user language
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

    @http.route('/account/reception/product-search', type='json', auth='user')
    def account_reception_product_search(self, term='', **kw):
        """Search products - locally implemented to avoid portal_catalog dependency"""
        self._ensure_user_lang_context()
        user_lang = request.env.user.sudo().lang or 'es_ES'
        ProductProduct = request.env['product.product'].sudo().with_context(lang=user_lang)
        
        domain = []

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

    @http.route('/account/reception/carrier-search', type='json', auth='user')
    def account_reception_carrier_search(self, term='', **kw):
        """Search carriers based on term for select2"""
        self._ensure_user_lang_context()
        DeliveryCarrier = request.env['delivery.carrier'].sudo()
        domain = []

        if term:
            domain = expression.OR([
                [('name', 'ilike', term)],
                [('delivery_type', 'ilike', term)]
            ])

        carriers = DeliveryCarrier.search(domain, limit=10)

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

    @http.route('/account/reception/package-type-search', type='json', auth='user')
    def account_reception_package_type_search(self, term='', **kw):
        """Search package types based on term for select2"""
        self._ensure_user_lang_context()
        PackageType = request.env['stock.package.type'].sudo()
        domain = []

        if term:
            domain = expression.OR([
                [('name', 'ilike', term)],
                [('package_carrier_type', 'ilike', term)]
            ])

        package_types = PackageType.search(domain, limit=10)

        result_items = []
        for package_type in package_types:
            dimensions = []
            if package_type.width:
                dimensions.append(f"W: {package_type.width}")
            if package_type.height:
                dimensions.append(f"H: {package_type.height}")
            if package_type.packaging_length:
                dimensions.append(f"L: {package_type.packaging_length}")

            dimensions_text = ' x '.join(dimensions) + ' cm' if dimensions else ''

            result_items.append({
                'id': package_type.id,
                'text': package_type.name,
                'dimensions': dimensions_text,
                'packaging_length': package_type.packaging_length or 0,
                'width': package_type.width or 0,
                'height': package_type.height or 0,
                'base_weight': package_type.base_weight or 0,
            })

        return {
            'items': result_items
        }

    @http.route('/account/reception/unmapped_products', type='json', auth='user')
    def account_reception_unmapped_products(self, search='', **kw):
        """Fetch all products not yet mapped for the current client"""
        self._ensure_user_lang_context()
        partner_id = request.env.user.partner_id
        
        # Get user's account partner
        AccountPartner = request.env['account.partner'].sudo()
        account_partner = AccountPartner.search([('partner_id', '=', partner_id.commercial_partner_id.id)], limit=1)
        if not account_partner:
            return {'status': 'success', 'quants': []}

        # Search products instead of quants to show everything
        ProductProduct = request.env['product.product'].sudo()

        # OPTIMIZATION: Get only IDs from account.product.map to exclude them
        mapped_product_ids = request.env['account.product.map'].sudo().search([
            ('account_id', '=', account_partner.id),
            ('active', '=', True)
        ]).product_id.ids

        domain = [('id', 'not in', mapped_product_ids)]
        if search:
            domain = expression.AND([
                domain,
                expression.OR([
                    [('name', 'ilike', search)],
                    [('default_code', 'ilike', search)]
                ])
            ])

        # Use 18.0 search to get products excluding those already mapped
        products = ProductProduct.search(domain, limit=500)
        if not products:
            return {'status': 'success', 'quants': []}
        
        # Removed stock calculation logic (quants and aggregation)
        # It is not needed for the mapping process.

        result = []
        for p in products:
            result.append({
                'id': p.id,
                'name': p.name,
                'code': p.default_code,
                'image_url': f'/account/reception/product_image/{p.id}'
            })

        return {'status': 'success', 'quants': result}

    @http.route('/account/reception/product_image/<int:product_id>', type='http', auth='user')
    def account_reception_product_image(self, product_id, **kw):
        """Securely serve product images to portal users using sudo()"""
        product = request.env['product.product'].sudo().browse(product_id)
        if not product.exists() or not product.image_128:
            return request.redirect('/web/static/img/placeholder.png')
        
        return request.env['ir.binary']._get_image_stream_from(
            product, 'image_128',
        ).get_response()

    @http.route('/account/reception/product/map/quick_create', type='json', auth='user')
    def account_reception_product_map_quick_create(self, **post):
        """Quickly create an account.product.map for a product"""
        self._ensure_user_lang_context()
        partner_id = request.env.user.partner_id
        product_id = int(post.get('product_id') or 0)
        if not product_id:
            return {'status': 'error', 'message': _('Product ID is required')}
        name = post.get('name')
        account_sku = post.get('account_sku')

        AccountPartner = request.env['account.partner'].sudo()
        account_partner = AccountPartner.search([('partner_id', '=', partner_id.commercial_partner_id.id)], limit=1)
        
        if not account_partner:
            return {'status': 'error', 'message': _('Account partner not found')}

        try:
            mapping = request.env['account.product.map'].sudo().create({
                'product_id': int(product_id),
                'name': name,
                'account_sku': account_sku,
                'account_id': account_partner.id,
                'active': True
            })
            return {
                'status': 'success',
                'id': mapping.id,
                'name': mapping.name,
                'account_sku': mapping.account_sku,
                'product_name': mapping.product_id.name
            }
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

