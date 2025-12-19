##############################################################################
#
# Copyright 2025 DaFe Solutions
#
##############################################################################

import math
import json
import pytz
import logging
from datetime import datetime
from functools import lru_cache

from odoo import fields, http, _
from odoo.addons.portal_admin_theme.controllers.admin import PortalAdminController
from odoo.http import request
from odoo.osv import expression

_logger = logging.getLogger(__name__)


class PortalRepairController(PortalAdminController):
    def _get_account_partner_domain(self, domain=None):
        """Construye el dominio base según el account.partner del usuario actual o su partner padre.
        Devuelve un dominio vacío si no hay account.partner.
        Se puede combinar con un dominio adicional opcional.
        """
        AccountPartner = request.env['account.partner'].sudo()
        partner_ids = list({request.env.user.partner_id.id, request.env.user.partner_id.commercial_partner_id.id})
        account_partner = AccountPartner.search([('partner_id', 'in', partner_ids)], limit=1)
        base_domain = [('account_partner_id', '=', account_partner.id)] if account_partner else [('id', '=', 0)]
        if domain:
            base_domain = expression.AND([base_domain, domain])
        return base_domain
        
    @http.route('/account/repair-alert/product-catalog', type='json', auth='user')
    def account_repair_alert_product_catalog(self, page=1, search='', **post):
        """Get the product catalog - delegates to centralized catalog with repair-specific domain"""
        from odoo.addons.portal_catalog.controllers.product_catalog import ProductCatalogController
        
        # Build repair-specific domain: account partner + tracking filter
        base_domain = self._get_account_partner_domain()
        extra_domain = expression.AND([
            base_domain,
            [('tracking', 'in', ('serial', 'none'))]
        ])
        
        return ProductCatalogController().catalog_product_catalog(
            page, search, extra_domain=extra_domain, **post
        )

    @http.route('/account/repair-alert/product-search', type='json', auth='user')
    def account_report_product_search(self, term='', **kw):
        ProductProduct = self._sudo_with_lang('product.product')

        # Obtener dominio base según account.partner del usuario actual
        base_domain = self._get_account_partner_domain()

        # Dominio adicional para productos storable y tracking
        product_domain = [
            ('is_storable', '=', True),
            ('tracking', 'in', ('serial', 'none')),
        ]
        domain = expression.AND([base_domain, product_domain])
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
                'image': product.image_128 and f"data:image/png;base64,{product.image_128.decode('utf-8')}" or False,
                'tracking': product.tracking,
            })
        return {
            'status': 'success',
            'items': result_items
        }

    @http.route('/account/repair-alert/product-lots', type='json', auth='user')
    def account_repair_alert_product_lots(self, **kw):
        """Obtiene lotes disponibles para un producto (optimizado con read_group)."""
        product_id = kw.get('product_id')
        term = kw.get('term', '')

        if not product_id:
            return {'status': 'error', 'message': 'product_id is required.'}

        StockQuant = request.env['stock.quant'].sudo()

        # Dominio base: quants con lote, ubicación interna
        domain = [
            ('product_id', '=', int(product_id)),
            ('lot_id', '!=', False),
            ('location_id.usage', '=', 'internal'),
        ]
        if term:
            domain.append(('lot_id.name', 'ilike', term))

        # read_group: 1 query SQL agrupando por lote
        groups = StockQuant.read_group(
            domain=domain,
            fields=['lot_id', 'quantity:sum', 'reserved_quantity:sum'],
            groupby=['lot_id'],
            limit=20
        )

        items = []
        for g in groups:
            available = g['quantity'] - g['reserved_quantity']
            if available > 0:
                lot = g['lot_id']  # (id, name) tuple
                items.append({
                    'id': lot[0],
                    'text': lot[1],
                    'product_qty': available,
                })

        return {'status': 'success', 'items': items}


    @http.route('/account/repair-alert/product-locations', type='json', auth='user')
    def account_repair_alert_product_locations(self, **kw):
        """Obtiene ubicaciones con stock disponible para un producto (optimizado con read_group)."""
        product_id = kw.get('product_id')
        term = kw.get('term', '')

        if not product_id:
            return {'status': 'error', 'message': 'product_id is required.'}

        StockQuant = request.env['stock.quant'].sudo()

        # Dominio base: quants con cantidad, ubicación interna
        domain = [
            ('product_id', '=', int(product_id)),
            ('quantity', '>', 0),
            ('location_id', 'child_of', request.env.ref('stock.stock_location_stock').id),
            ('location_id', '!=', request.env.ref('repair_module.stock_location_repairs').id),
        ]
        if term:
            domain.append(('location_id.name', 'ilike', term))

        # read_group: 1 query SQL agrupando por ubicación
        groups = StockQuant.read_group(
            domain=domain,
            fields=['location_id', 'quantity:sum', 'reserved_quantity:sum'],
            groupby=['location_id'],
        )

        items = []
        for g in groups:
            available = g['quantity'] - g['reserved_quantity']
            if available > 0:
                loc = g['location_id']  # (id, name) tuple
                items.append({
                    'id': loc[0],
                    'text': loc[1],
                    'product_qty': available,
                })

        return {'status': 'success', 'items': items}

    @http.route('/account/repair-alert/create', type='json', auth='user')
    def account_repair_alert_create(self, **post):
        """
            Crea un quality.alert por cada línea que se haya introducido en el modal. Por lo tanto, todas
            las líneas seleccionadas en el modal compartirán los valores comunas.
            Asimismo, se crea el stock.picking correspondiente a la petición. Se crean tanto stock.picking como
            quality.alert se hayan creado.

            Parámetros:
                **post: diccionario con los datos enviados desde el formulario (product_id, quantity, descripción, etc.)

            Return:
        """
        # 1º. Las comprobaciones
        products_raw = post.get('products', '[]')
        if isinstance(products_raw, str):
            try:
                products = json.loads(products_raw)
            except json.JSONDecodeError:
                _logger.error('❌ Error decodificando JSON en products: %s', products_raw)
                products = []
        else:
            products = products_raw

        if not products:
            return {'status': 'error', 'message': _('No products selected for the repair alert.')}

        # 2º. Asignación de datos genéricos

        partner_id = request.env.user.partner_id
        QualityAlert = request.env['quality.alert'].sudo()
        ProductProduct = request.env['product.product'].sudo()
        AccountPartner = request.env['account.partner'].sudo()
        StockLocation = request.env['stock.location'].sudo()

        partner_ids = list({request.env.user.partner_id.id, request.env.user.partner_id.commercial_partner_id.id})

        account_partner = AccountPartner.search([('partner_id', 'in', partner_ids)], limit=1)

        alerts_created = []
        for product in products:
            product_id = int(product.get('product_id', 0))
            if not product_id:
                continue

            product_record = ProductProduct.browse(product_id)
            if not product_record.exists():
                continue

            quantity = product.get('quantity')
            tracking = product.get('tracking', 'none')

            # Crear la alerta
            alert_vals = {
                'account_partner_id': account_partner.id if account_partner else False,
                'partner_id': partner_id.id,
                'title': post.get('name', ''),
                'description': post.get('problem', ''),
                'product_tmpl_id': product_record.product_tmpl_id.id,
                'product_id': product_id,
                'maintenance_type': post.get('maintenance_op'),
                'quantity': quantity,
                'is_repair': True,
            }

            if tracking in ['serial', 'lot']:
                lot_id = product.get('lot')
                if not lot_id:
                    continue
                alert_vals['lot_id'] = int(lot_id)

            alert = QualityAlert.sudo().create(alert_vals)

            # Crear el stock.picking usando la ubicación si no hay tracking
            if tracking == 'none':
                location_id = product.get('location')
                alert.action_create_move_to_repair(location_id=location_id)
            else:
                alert.action_create_move_to_repair()

            alerts_created.append(alert)

        if not alerts_created:
            return {'status': 'error', 'message': _('No valid lots or locations to create alerts.')}

        # Send recent activity notification
        try:
            user = request.env.user
            user.send_portal_user_recent_activity(
                "%d repair alert(s) created",
                "New repair alert",
                "fas fa-tools",
                "success",
                message_args=[len(alerts_created)]
            )
        except Exception:
            pass  # Don't break if notification fails

        return {
            'status': 'success',
            'alert_ids': [a.id for a in alerts_created],
            'count': len(alerts_created),
            'message': _('Repair alert(s) created successfully.')
        }