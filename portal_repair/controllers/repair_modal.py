##############################################################################
#
# Copyright 2025 DaFe Solutions
#
##############################################################################

import math
import json
import pytz
from datetime import datetime
from functools import lru_cache

from odoo import fields, http, _
from odoo.addons.portal_admin_theme.controllers.admin import PortalAdminController
from odoo.http import request
from odoo.osv import expression


class PortalRepairController(PortalAdminController):
    @http.route('/account/repair-alert/product-search', type='json', auth='user')
    def account_report_product_search(self, term='', **kw):
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))
        
        ProductProduct = request.env['product.product'].sudo()
        StockLot = request.env['stock.lot'].sudo()

        domain = [('is_storable', '=', True)]  # Only storable products
        if term:
            # Search in product name, code, barcode AND product attributes
            domain = expression.AND([
                domain,
                expression.OR([
                    [('name', 'ilike', term)],
                    [('default_code', 'ilike', term)],
                    [('barcode', 'ilike', term)],
                    # Search in attributes
                    [('product_template_attribute_value_ids.name', 'ilike', term)],
                    [('product_template_attribute_value_ids.attribute_id.name', 'ilike', term)]
                ])
            ])

        products = ProductProduct.search(domain, limit=10)

        # Prepare product data with attributes
        result_items = []
        for product in products:
            # Get product attribute values
            attributes = []
            for attr_value in product.product_template_attribute_value_ids:
                attributes.append({
                    'id': attr_value.id,
                    'name': attr_value.name,
                    'attribute_name': attr_value.attribute_id.name,
                    'value': attr_value.name,
                    'display_name': f"{attr_value.attribute_id.name}: {attr_value.name}"
                })

            # 🔹 Obtener lotes disponibles del producto
            lots = []
            lots_records = StockLot.search([('product_id', '=', product.id)], limit=20)
            for lot in lots_records:
                lots.append({
                    'id': lot.id,
                    'name': lot.name,
                })

            result_items.append({
                'id': product.id,
                'text': product.name,
                'default_code': product.default_code or '',
                'barcode': product.barcode or '',
                'price': product.list_price,
                'currency': product.currency_id.symbol,
                'attributes': attributes,
                'lots': lots,  # 🔹 Añadimos los lotes aquí
                'image': product.image_128 and f"data:image/png;base64,{product.image_128.decode('utf-8')}" or False
            })
        return {
            'status': 'success',
            'items': result_items
        }

        
    @http.route('/account/repair-alert/create', type='json', auth='user')
    def account_repair_alert_create(self, **post):

        # Get current user's partner
        partner = request.env.user.partner_id

        # Create alert

        QualityAlert = request.env['quality.alert'].sudo()
        ProductProduct = request.env['product.product'].sudo()
        print("Creating repair alert with data:", post)

        products_raw = post.get("products", "[]")

        # Si viene como string, convertir
        if isinstance(products_raw, str):
            try:
                products = json.loads(products_raw)
            except json.JSONDecodeError:
                products = []
        else:
            products = products_raw  # ya es lista/dict

        for product in products:
            product_id = ProductProduct.browse(int(product["product_id"]))

            # print("Selected product ID:", int(product["product_id"]), ", quantity:", product["quantity"])     
            for i in range(int(product.get('quantity', 1))):
                alert = QualityAlert.create({
                    'partner_id': partner.id,
                    'title': post.get('name', ''),
                    'description': post.get('problem', ''),
                    'partner_id': partner.id,
                    'product_tmpl_id': product_id.product_tmpl_id.id,
                    'product_id': int(product["product_id"]),
                    'quantity': 1,
                })

        # Return the created alert ID
        return {
            'status': 'success',
            'alert_id': alert.id,
            'message': _('Repair alert created successfully.')
        }   