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

        StockPicking = request.env['stock.picking'].sudo()
        ProductProduct = request.env['product.product'].sudo()
        AccountPartner = request.env['account.partner'].sudo()
        StockPackageType = request.env['stock.package.type'].sudo()
        StockQuantPackage = request.env['stock.quant.package'].sudo()

        reception_type = request.env.ref('stock.picking_type_in').sudo()
        tracking_number = post.get('tracking_number')
        optional_tracking_ref = post.get('tracking_number_optional')
        scheduled_date_value = post.get('scheduled_date')
        carrier_id = post.get('carrier_id')
        carrier_name = post.get('carrier_name')
        package_type_id = post.get('package_type_id')
        width = post.get('width')
        height = post.get('height')
        length = post.get('length')
        weight = post.get('weight')  # Product weight
        package_weight = post.get('package_weight')  # Package/container weight
        products = json.loads(post.get('products') or '[]')

        if len(products) == 0:
            return {'status': 'error', 'message': _('No products selected'), 'errors': [['products', [_('No products selected')]]]}

        account_partner = AccountPartner.search([('partner_id', '=', partner.commercial_partner_id.id)], limit=1)
        scheduled_date_dt = datetime.strptime(scheduled_date_value, '%d-%m-%Y %H:%M')

        user_tz = pytz.timezone(request.env.user.tz or 'UTC')
        local_dt = user_tz.localize(scheduled_date_dt)
        utc_dt = local_dt.astimezone(pytz.UTC)
        scheduled_date = utc_dt.strftime('%Y-%m-%d %H:%M:%S')

        # Group products by package number
        packages = {}
        for product in products:
            pid = product.get('product_id')
            qty = product.get('quantity')
            package_num = product.get('package') or '1'

            if not pid:
                return {'status': 'error', 'message': _('Product not found')}

            if not pid.isdigit():
                return {'status': 'error', 'message': _('Invalid product ID')}

            product_obj = ProductProduct.browse(int(pid))

            if not product_obj:
                return {'status': 'error', 'message': _('Product not found')}

            if '.' in qty and not qty.replace('.', '').isdigit():
                return {'status': 'error', 'message': _('Invalid quantity')}

            if '.' not in qty and not qty.isdigit():
                return {'status': 'error', 'message': _('Invalid quantity')}

            if package_num not in packages:
                packages[package_num] = []

            packages[package_num].append({
                'product': product_obj,
                'qty': float(qty)
            })

        # Create packages first
        package_names = []
        package_map = {}
        package_type = StockPackageType.browse(int(package_type_id)) if package_type_id else False

        if package_type:
            for package_num in packages.keys():
                package_name = StockQuantPackage.set_name_based_on_account(account_partner)
                package_names.append(package_name)

                package_values = {
                    'name': package_name,
                    'package_type_id': package_type.id,
                    'account_partner_id': account_partner.id,
                    'owner_id': partner.commercial_partner_id.id,
                    'location_id': reception_type.default_location_dest_id.id,
                    'pack_date': fields.Date.today(),
                    'global_tracking_ref': tracking_number,
                    'carrier_name': carrier_name or '',
                    'carrier_id': carrier_id or False,
                    'optional_tracking_ref': optional_tracking_ref or '',
                    'shipping_weight': (float(weight) if weight else 0) + (float(package_weight) if package_weight else package_type.base_weight),
                }

                package = StockQuantPackage.create(package_values)
                package_map[package_num] = package

        # Create unique procurement group for this reception (prevents merging with other receptions)
        procurement_group = request.env['procurement.group'].sudo().create({
            'name': tracking_number,
            'partner_id': partner.commercial_partner_id.id,
        })

        # Create the reception
        picking = StockPicking.create({
            'picking_type_id': reception_type.id,
            'account_partner_id': account_partner.id,
            'owner_id': partner.commercial_partner_id.id,
            'partner_id': partner.commercial_partner_id.id,
            'carrier_id': carrier_id,
            'carrier_tracking_ref': tracking_number,
            'origin': f'Portal: {tracking_number}',
            'location_id': reception_type.default_location_src_id.id,
            'location_dest_id': reception_type.default_location_dest_id.id,
            'move_type': 'direct',
            'scheduled_date': scheduled_date,
            'group_id': procurement_group.id,
        })

        # Create moves with detailed move lines for each package
        total_weight = 0

        for package_num, products_in_package in packages.items():
            package = package_map.get(package_num)

            for product_data in products_in_package:
                product = product_data['product']
                qty = product_data['qty']

                move_vals = {
                    'name': product.display_name,
                    'product_id': product.id,
                    'product_uom_qty': qty,
                    'product_uom': product.uom_id.id,
                    'picking_id': picking.id,
                    'location_id': picking.location_id.id,
                    'location_dest_id': picking.location_dest_id.id,
                    'group_id': procurement_group.id,
                    'state': 'draft',
                }
                move = request.env['stock.move'].sudo().create(move_vals)

                if package:
                    move_line_vals = {
                        'move_id': move.id,
                        'product_id': product.id,
                        'product_uom_id': product.uom_id.id,
                        'location_id': picking.location_id.id,
                        'location_dest_id': picking.location_dest_id.id,
                        'qty_done': qty,
                        'result_package_id': package.id,
                        'owner_id': partner.commercial_partner_id.id,
                        'picking_id': picking.id,
                    }
                    request.env['stock.move.line'].sudo().create(move_line_vals)

                total_weight += product.weight * qty

        picking.write({
            'shipping_weight': total_weight,
            'origin': ', '.join(package_names) if package_names else f'Portal: {tracking_number}'
        })

        picking.action_confirm()
        picking.action_assign()

        # Send recent activity notification
        user = request.env.user
        user.send_portal_user_recent_activity(
            "Reception '%s' created",
            "New reception",
            "fas fa-plus-circle",
            "success",
            message_args=[picking.name]
        )

        return {'status': 'success', 'message': _('Reception created successfully')}

    @http.route('/account/reception/product-catalog', type='json', auth='user')
    def account_reception_product_catalog(self, page=1, search='', **post):
        """Get the product catalog - delegates to centralized catalog (no stock filter)"""
        from odoo.addons.portal_catalog.controllers.product_catalog import ProductCatalogController
        return ProductCatalogController().catalog_product_catalog(page, search, **post)

    @http.route('/account/reception/product-search', type='json', auth='user')
    def account_reception_product_search(self, term='', **kw):
        """Search products - delegates to centralized catalog endpoint"""
        from odoo.addons.portal_catalog.controllers.product_catalog import ProductCatalogController
        return ProductCatalogController().catalog_product_search(term, **kw)

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

