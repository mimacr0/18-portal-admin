##############################################################################
#
# Copyright 2025-Today DaFe Solutions
#
##############################################################################

import math
import json
from functools import lru_cache

from odoo import http, _
from odoo.addons.portal_admin_theme.controllers.admin import PortalAdminController
from odoo.http import request
from odoo.osv import expression


class PortalReceptionController(PortalAdminController):
    # Constantes de configuración
    RECEPTION_FIELDS_MAPPING = {
        'name': 'name',
        'origin': 'origin',
        'partner': 'partner_id',
        'date': 'scheduled_date',
        'state': 'state'
    }

    DEFAULT_LIMIT_PARAM = 'portal_reception.page_list_default_limit'
    DEFAULT_LIMIT_VALUE = '100'

    def _get_admin_layout_menus(self):
        menus = super()._get_admin_layout_menus()
        menus.append({
            'name': _('Receptions'),
            'url': '/account/reception',
            'icon': 'fas fa-warehouse'
        })
        return menus

    @lru_cache(maxsize=1)
    def _get_advanced_search_fields(self):
        """Devuelve la configuración de campos para búsqueda avanzada"""
        return [
            {'id': 'name', 'label': _('Name')},
            {'id': 'origin', 'label': _('Origin')},
            {'id': 'partner', 'label': _('Partner')},
            {'id': 'date', 'label': _('Scheduled Date')},
            {'id': 'state', 'label': _('Status')}
        ]

    @http.route('/account/reception', type='http', auth="user", website=True)
    def account_reception_action(self, **post):
        StockPicking = request.env['stock.picking'].sudo()
        reception_type = request.env.ref('stock.picking_type_in')
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))
        packages = StockPicking.search([('picking_type_id', '=', reception_type.id), ('partner_id', 'in', partner_ids)])
        values = self._get_admin_layout_values()

        # Configuración de la interfaz
        values.update({
            'page_name': 'reception',
            'packages': packages,
            'page_title': _('Receptions'),
            'page_url': '/account/reception',
            'flatpickr': True,
            'list_filters': [
                {'id': 'all', 'label': _('All'), 'icon': 'fas fa-check-circle', 'active': True},
                {'id': 'pending', 'label': _('Pending'), 'icon': 'fas fa-clock'},
                {'id': 'done', 'label': _('Done'), 'icon': 'fas fa-check'}
            ],
            'list_columns': [
                {'id': 'name', 'label': _('Name'), 'sortable': True},
                {'id': 'package_type', 'label': _('Type'), 'sortable': True, 'lg': True},
                {'id': 'weight', 'label': _('Weight'), 'sortable': True, 'lg': True},
                {'id': 'date', 'label': _('Date'), 'sortable': True, 'md': True},
                {'id': 'actions', 'label': _('Actions'), 'sortable': False, 'right': True}
            ],
            'tools_actions': [
                {'name': 'import', 'label': _('Import'), 'icon': 'fas fa-file-import'}
            ],
            'batch_actions': [
                {'name': 'delete', 'label': _('Delete'), 'icon': 'fas fa-trash-alt'}
            ],
            'advanced_search': json.dumps(self._get_advanced_search_fields())
        })

        return request.render("portal_reception.portal_reception_page", values)


    def _get_pagination_data(self, page, items_total, limit):
        """Calcula datos de paginación"""
        first_page = 1
        last_page = math.ceil(items_total / limit) if items_total > 0 else 1
        pages = []

        for i in range(max(1, page - 1), min(last_page + 1, page + 3)):
            pages.append({
                'page': i,
                'active': i == page
            })
            if len(pages) >= 5:
                break

        return {
            'first_page': first_page,
            'last_page': last_page,
            'pages': pages
        }


    @http.route('/account/reception/list/advanced_filters', type='json', auth='user')
    def account_reception_list_advanced_filters(self, **kw):
        return {
            'status': 'success',
            'filters': json.dumps(self._get_advanced_search_fields())
        }

    def _build_reception_domain(self, search='', domain=None, match_type='all', quick_filter=None):
        """Construye el dominio de búsqueda para recepciones"""
        StockPicking = request.env['stock.picking'].sudo()
        reception_type = request.env.ref('stock.picking_type_in')
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

        base_domain = [
            ('picking_type_id', '=', reception_type.id),
            ('partner_id', 'in', partner_ids)
        ]

        # Apply quick filters
        if quick_filter and quick_filter != 'all':
            if quick_filter == 'pending':
                base_domain.append(('state', 'not in', ['done', 'cancel']))
            elif quick_filter == 'done':
                base_domain.append(('state', '=', 'done'))

        # Aplicar búsqueda de texto
        if search:
            base_domain.extend(expression.OR([
                [('name', 'ilike', search)],
                [('origin', 'ilike', search)],
                [('partner_id.name', 'ilike', search)]
            ]))

        # Aplicar dominio de búsqueda avanzada
        if domain and isinstance(domain, list) and domain:
            adv_domain = []
            for condition in domain:
                if len(condition) != 3:
                    continue

                field, operator, value = condition
                if field not in self.RECEPTION_FIELDS_MAPPING:
                    continue

                model_field = self.RECEPTION_FIELDS_MAPPING[field]

                # Manejo especial para el campo de estado
                if field == 'state':
                    if value.lower() in ['pending', 'draft', 'waiting']:
                        adv_domain.append(('state', 'not in', ['done', 'cancel']))
                    elif value.lower() in ['done', 'completed', 'finished']:
                        adv_domain.append(('state', '=', 'done'))
                    elif value.lower() in ['cancel', 'cancelled']:
                        adv_domain.append(('state', '=', 'cancel'))
                    else:
                        adv_domain.append((model_field, operator, value))
                else:
                    adv_domain.append((model_field, operator, value))

            # Combinar condiciones de búsqueda avanzada según el tipo de coincidencia
            if adv_domain:
                if match_type == 'any':
                    base_domain.append(expression.OR(adv_domain))
                else:  # 'all' es el predeterminado
                    base_domain.extend(adv_domain)

        return base_domain

    @http.route('/account/reception/list/reload', type='json', auth='user')
    def account_reception_list_reload(self, page=1, search='', domain=None, match_type='all', sort=None, order='asc', quick_filter=None, **kw):
        SysParams = request.env['ir.config_parameter'].sudo()
        limit = int(SysParams.get_param(self.DEFAULT_LIMIT_PARAM, self.DEFAULT_LIMIT_VALUE))
        offset = (page - 1) * limit

        # Construir dominio de búsqueda
        base_domain = self._build_reception_domain(search, domain, match_type, quick_filter)

        # Configurar ordenamiento
        order_by = 'id'
        if sort and sort in self.RECEPTION_FIELDS_MAPPING:
            order_by = f"{self.RECEPTION_FIELDS_MAPPING[sort]} {order}"

        # Obtener recepciones y contar
        StockPicking = request.env['stock.picking'].sudo()
        pickings = StockPicking.search(base_domain, limit=limit, offset=offset, order=order_by)
        items_total = StockPicking.search_count(base_domain)
        items_count = len(pickings)

        # Preparar datos de paginación
        pagination_data = self._get_pagination_data(page, items_total, limit)
        pagination_data.update({'items_total': items_total, 'items_count': items_count})

        qweb = request.env['ir.qweb']
        return {
            'status': 'success',
            'list': qweb._render('portal_reception.portal_reception_list', {
                'packages': pickings,
                'batch_actions': True
            }),
            'pager': qweb._render('portal_reception.portal_reception_pager', {
                'items_label': _('packages'),
                **pagination_data
            }),
            'last_page': pagination_data['last_page']
        }

    @http.route('/account/reception/batch/delete', type='json', auth='user')
    def account_reception_batch_delete(self, ids, **kw):
        """Delete selected packages"""
        if not ids:
            return {'status': 'error', 'message': _('No packages selected')}

        try:
            StockPicking = request.env['stock.picking'].sudo()
            reception_type = request.env.ref('stock.picking_type_in')
            partner_id = request.env.user.partner_id
            partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

            # Get packages that belong to the user and are in the selected IDs
            pickings = StockPicking.search([
                ('id', 'in', ids),
                ('picking_type_id', '=', reception_type.id),
                ('partner_id', 'in', partner_ids),
                ('state', 'not in', ['done', 'cancel'])
            ])

            if not pickings:
                return {'status': 'error', 'message': _('No valid packages to delete')}

            # Cancel the pickings - can't actually delete them in Odoo
            pickings.action_cancel()

            return {'status': 'success'}
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

    @http.route('/account/reception/create', type='json', auth='user')
    def account_reception_create(self, **post):
        """Create a new reception package"""
        try:
            # Extract package data
            name = post.get('name')
            tracking_number = post.get('tracking_number')  # New field
            width = float(post.get('width', 0) or 0)
            height = float(post.get('height', 0) or 0)
            length = float(post.get('length', 0) or 0)
            volume = float(post.get('volume', 0) or 0)
            weight = float(post.get('weight', 0) or 0)
            barcode = post.get('barcode')
            sku = post.get('sku')
            tracking = post.get('tracking', 'none')
            products = post.get('products', [])  # New products list

            # Get current user's partner
            partner = request.env.user.partner_id

            # Create package
            StockPickingType = request.env['stock.picking.type'].sudo()
            StockPicking = request.env['stock.picking'].sudo()
            StockMove = request.env['stock.move'].sudo()
            ProductTemplate = request.env['product.template'].sudo()

            # Get reception type
            reception_type = request.env.ref('stock.picking_type_in')

            # Create the reception
            picking = StockPicking.create({
                'picking_type_id': reception_type.id,
                'partner_id': partner.id,
                'origin': f'Portal: {name}',
                'location_id': reception_type.default_location_src_id.id,
                'location_dest_id': reception_type.default_location_dest_id.id,
                'move_type': 'direct',
                'carrier_tracking_ref': tracking_number,  # Add tracking number
            })

            # Process each product in the list
            if products:
                for product_data in products:
                    product_name = product_data.get('name')
                    product_sku = product_data.get('sku')
                    product_qty = product_data.get('quantity', 1)

                    if not product_name:
                        continue

                    # Find or create product
                    product = ProductTemplate.search([('default_code', '=', product_sku)], limit=1)
                    if not product:
                        product = ProductTemplate.create({
                            'name': product_name,
                            'type': 'product',
                            'default_code': product_sku or f"{sku}-{product_name}",
                            'barcode': barcode,
                            'tracking': tracking,
                            'weight': weight,
                            'volume': volume,
                        })

                    # Create move line for this product
                    StockMove.create({
                        'name': product_name,
                        'picking_id': picking.id,
                        'product_id': product.product_variant_id.id,
                        'product_uom_qty': product_qty,
                        'product_uom': product.uom_id.id,
                        'location_id': reception_type.default_location_src_id.id,
                        'location_dest_id': reception_type.default_location_dest_id.id,
                    })
            else:
                # Original code for single product if no products list
                product = ProductTemplate.search([('default_code', '=', sku)], limit=1)
                if not product:
                    product = ProductTemplate.create({
                        'name': name,
                        'type': 'product',
                        'default_code': sku,
                        'barcode': barcode,
                        'tracking': tracking,
                        'weight': weight,
                        'volume': volume,
                    })

                # Create the move line
                move = StockMove.create({
                    'name': name,
                    'picking_id': picking.id,
                    'product_id': product.product_variant_id.id,
                    'product_uom_qty': 1,
                    'product_uom': product.uom_id.id,
                    'location_id': reception_type.default_location_src_id.id,
                    'location_dest_id': reception_type.default_location_dest_id.id,
                })

            return {
                'status': 'success',
                'message': _('Reception created successfully'),
                'picking_id': picking.id
            }
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

    @http.route('/account/reception/product-catalog', type='json', auth='user')
    def account_reception_product_catalog(self, **post):
        """Get the product catalog"""
        ProductProduct = request.env['product.product'].sudo()
        products = ProductProduct.search([('is_storable', '=', True)])
        qweb = request.env['ir.qweb']
        return {
            'status': 'success',
            'products': qweb._render('portal_catalog.portal_products_catalog_kanban', {
                'products': products
            })
        }
