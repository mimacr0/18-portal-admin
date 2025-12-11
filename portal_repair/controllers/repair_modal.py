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
        
    @http.route('/account/repair-alert/product-search', type='json', auth='user')
    def account_report_product_search(self, term='', **kw):
        ProductProduct = request.env['product.product'].sudo()

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
        items = []
        for lot in lots:
            total_available = 0.0
            # Buscar todos los stock.quant del lote
            quants = request.env['stock.quant'].sudo().search([
                ('lot_id', '=', lot.id),
                ('product_id', '=', lot.product_id.id),
            ])

            print(f'[DEBUG] Lot {lot.name}: {len(quants)} quants found')
            for q in quants:
                loc_name = q.location_id.display_name if q.location_id else 'N/A'
                print(f'  - Quant id={q.id}: qty={q.quantity}, reserved={q.reserved_quantity}, available={q.quantity - q.reserved_quantity}, location={loc_name}')

            # Filtramos los quants que tengan quantity - reserved_quantity > 0
            positive_quants = quants.filtered(lambda q: (q.quantity - q.reserved_quantity) > 0)

            # Sumamos la cantidad disponible de los quants positivos
            total_available = sum(q.quantity - q.reserved_quantity for q in positive_quants)

            # Guardamos la info del lote
            items.append({
                'id': lot.id,
                'text': lot.name,
                'product_qty': total_available,  # usamos el total del lote
            })       
        print(f'items: {items}')
        return {'status': 'success', 'items': items}


    @http.route('/account/repair-alert/product-locations', type='json', auth='user')
    def account_repair_alert_product_locations(self, **kw):
        product_id = kw.get('product_id')
        term = kw.get('term', '')  # Término de búsqueda opcional

        if not product_id:
            return {'status': 'error', 'message': 'product_id is required.'}

        ProductProduct = request.env['product.product'].sudo()
        product = ProductProduct.browse(int(product_id))
        if not product.exists():
            return {'status': 'error', 'message': _('Product not found.')}

        # Buscar quants del producto con cantidad disponible
        quants = request.env['stock.quant'].sudo().search([
            ('product_id', '=', product.id),
            ('quantity', '>', 0),
            ("location_id.usage", "=", "internal"),
        ])

        # Filtrar por término de búsqueda en el nombre de la ubicación
        if term:
            quants = quants.filtered(lambda q: term.lower() in q.location_id.name.lower())

        # Agrupar por ubicación
        location_dict = {}
        for quant in quants:
            loc = quant.location_id
            available_qty = quant.quantity - quant.reserved_quantity
            if available_qty <= 0:
                continue
            if loc.id not in location_dict:
                location_dict[loc.id] = {
                    'id': loc.id,
                    'text': loc.name,
                    'product_qty': 0.0
                }
            location_dict[loc.id]['product_qty'] += available_qty

        items = list(location_dict.values())
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

        return {
            'status': 'success',
            'alert_ids': [a.id for a in alerts_created],
            'count': len(alerts_created),
            'message': _('Repair alert(s) created successfully.')
        }