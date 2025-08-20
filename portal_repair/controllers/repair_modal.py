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

        domain = [('is_storable', '=', True), ('tracking', '=', 'lot')]  # Only storable products
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

    @http.route('/account/repair-alert/product-lots', type='json', auth='user')
    def account_repair_alert_product_lots(self, **kw):
        product_id = kw.get('product_id')
        term = kw.get('term', '')  # Obtener término de búsqueda

        if not product_id:
            return {'status': 'error', 'message': 'product_id is required.'}

        StockLot = request.env['stock.lot'].sudo()
        ProductProduct = request.env['product.product'].sudo()

        product = ProductProduct.browse(int(product_id))
        if not product.exists():
            return {'status': 'error', 'message': _('Product not found.')}

        # Buscar lotes que coincidan con el producto y contengan el término
        domain = [('product_id', '=', product.id), ('product_qty', '>', 0)]
        if term:
            domain.append(('name', 'ilike', term))

        lots = StockLot.search(domain, limit=20)  # Puedes limitar resultados
        items = [{'id': lot.id, 'text': lot.name} for lot in lots]
        return {'status': 'success', 'items': items}

    @http.route('/account/repair-alert/create', type='json', auth='user')
    def account_repair_alert_create(self, **post):
        partner = request.env.user.partner_id
        QualityAlert = request.env['quality.alert'].sudo()
        ProductProduct = request.env['product.product'].sudo()
        AccountPartner = request.env['account.partner'].sudo()

        # Convertir productos
        products_raw = post.get("products", "[]")
        if isinstance(products_raw, str):
            try:
                products = json.loads(products_raw)
            except json.JSONDecodeError:
                _logger.error("❌ Error decodificando JSON en products: %s", products_raw)
                products = []
        else:
            products = products_raw

        if not products:
            return {'status': 'error', 'message': _('No products selected for the repair alert.')}

        account_partner = AccountPartner.search([('partner_id', '=', partner.id)], limit=1)

        alerts_to_create = []
        for product in products:
            product_id = int(product.get("product_id", 0))
            if not product_id:
                continue  # skip si no hay producto válido

            product_record = ProductProduct.browse(product_id)
            if not product_record.exists():
                continue  # skip si el producto no existe

            lot_ids = product.get("lots", [])
            if not lot_ids:
                continue  # skip si no hay lotes

            for lot_id in lot_ids:
                alerts_to_create.append({
                    'account_partner_id': account_partner.id if account_partner else False,
                    'partner_id': partner.id,
                    'title': post.get('name', ''),
                    'description': post.get('problem', ''),
                    'product_tmpl_id': product_record.product_tmpl_id.id,
                    'product_id': product_id,
                    'lot_id': int(lot_id),
                    'maintenance_type': post.get('maintenance_op'),
                    'quantity': 1,
                    'is_repair': True,
                })

        if not alerts_to_create:
            return {'status': 'error', 'message': _('No valid lots or products to create alerts.')}

        alerts = QualityAlert.create(alerts_to_create)

        return {
            'status': 'success',
            'alert_ids': alerts.ids,
            'count': len(alerts),
            'message': _('Repair alert(s) created successfully.')
        }