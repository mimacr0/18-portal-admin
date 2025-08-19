##############################################################################
#
# Copyright 2025-Today DaFe Solutions
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


class PortalReceptionController(PortalAdminController):
    # Constantes de configuración
    RECEPTION_FIELDS_MAPPING = {
        'name': 'name',
        'origin': 'origin',
        'partner': 'partner_id',
        'date': 'scheduled_date',
        'scheduled_date': 'scheduled_date',
        'state': 'state',
        # Intentionally omit direct mapping for weight fields because
        # picking.shipping_weight is computed (non-stored) and not searchable.
        # We handle advanced filters for weight via stock.move.line package weights.
        'package': 'package_name_virtual',
        'package_type': 'package_type_virtual',
    }

    DEFAULT_LIMIT_PARAM = 'portal_reception.page_list_default_limit'
    DEFAULT_LIMIT_VALUE = '100'

    def _get_portal_list_limit(self):
        """Get portal list limit from user settings"""
        user = request.env.user
        SysParams = request.env['ir.config_parameter'].sudo()
        default_limit = int(SysParams.get_param(self.DEFAULT_LIMIT_PARAM, self.DEFAULT_LIMIT_VALUE))
        limit = (user.portal_user_configuration or {}).get('list_limit', default_limit)

        if not str(limit).isdigit():
            limit = default_limit

        return int(limit)

    def _get_admin_layout_menus(self):
        menus = super()._get_admin_layout_menus()
        menus.append({
            'name': _('Receptions'),
            'url': '/account/reception',
            'icon': 'fas fa-warehouse'
        })
        return menus

    @lru_cache(maxsize=1)
    def _get_reception_advanced_search_fields(self):
        """Devuelve la configuración de campos para búsqueda avanzada"""
        PackageType = request.env['stock.package.type'].sudo()
        package_type_options = [
            {'id': pt.id, 'label': pt.name}
            for pt in PackageType.search([], limit=10)
        ]

        return [
            {'id': 'name', 'label': _('Name'), 'type': 'text'},
            {'id': 'package', 'label': _('Package'), 'type': 'text'},
            {'id': 'weight', 'label': _('Weight'), 'type': 'number'},
            {'id': 'shipping_weight', 'label': _('Shipping Weight'), 'type': 'number'},
            {'id': 'package_type', 'label': _('Package Type'), 'type': 'select', 'options': package_type_options},
            {'id': 'scheduled_date', 'label': _('Scheduled Date'), 'type': 'date'},
            {'id': 'state', 'label': _('Status'), 'type': 'select', 'options': [
                {'id': 'pending', 'label': _('Pending')},
                {'id': 'done', 'label': _('Done')},
                {'id': 'cancel', 'label': _('Cancel')}
            ]}
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
            'select2': True,
            'list_filters': [
                {'id': 'all', 'label': _('All'), 'icon': 'fas fa-check-circle', 'active': True},
                {'id': 'pending', 'label': _('Pending'), 'icon': 'fas fa-clock'},
                {'id': 'done', 'label': _('Done'), 'icon': 'fas fa-check'}
            ],
            'list_columns': [
                {'id': 'name', 'label': _('Name'), 'sortable': True},
                {'id': 'weight', 'label': _('Weight'), 'sortable': True, 'lg': True},
                {'id': 'type', 'label': _('Package Type'), 'sortable': True, 'lg': True},
                {'id': 'date', 'label': _('Date'), 'sortable': True, 'md': True},
                {'id': 'state', 'label': _('Status'), 'sortable': True, 'md': True},
                {'id': 'actions', 'label': _('Actions'), 'sortable': False, 'right': True}
            ],
            'batch_actions': [
                {'name': 'delete', 'label': _('Delete'), 'icon': 'fas fa-trash-alt'}
            ],
            'advanced_search': json.dumps(self._get_reception_advanced_search_fields())
        })

        return request.render("portal_reception.portal_reception_page_main", values)


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
            'filters': json.dumps(self._get_reception_advanced_search_fields())
        }

    def _build_reception_domain(self, search='', domain=None, match_type='all', quick_filter=None):
        """Construye el dominio de búsqueda para recepciones"""
        StockPicking = request.env['stock.picking'].sudo()
        StockMoveLine = request.env['stock.move.line'].sudo()
        reception_type = request.env.ref('stock.picking_type_in')
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

        base_domain = [
            ('picking_type_id', '=', reception_type.id),
            ('partner_id', 'in', partner_ids),
            ('state', '!=', 'draft')
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
            adv_conditions = []              # list of tuple conditions for AND
            adv_condition_domains = []       # list of domains (list[tuple]) for OR

            # Helpers to coerce values by logical field
            def _coerce_value(field_key, value_str):
                try:
                    if field_key in ['weight', 'shipping_weight']:
                        return float(value_str)
                    if field_key == 'package_type':
                        return int(value_str)
                    return value_str
                except Exception:
                    return value_str

            def _date_bounds_utc(date_str):
                # Expecting YYYY-MM-DD
                try:
                    user_tz = pytz.timezone(request.env.user.tz or 'UTC')
                    day_local_start = user_tz.localize(datetime.strptime(date_str + ' 00:00:00', '%Y-%m-%d %H:%M:%S'))
                    day_local_end = user_tz.localize(datetime.strptime(date_str + ' 23:59:59', '%Y-%m-%d %H:%M:%S'))
                    return (
                        day_local_start.astimezone(pytz.UTC).strftime('%Y-%m-%d %H:%M:%S'),
                        day_local_end.astimezone(pytz.UTC).strftime('%Y-%m-%d %H:%M:%S'),
                    )
                except Exception:
                    return (date_str, date_str)

            for condition in domain:
                if not isinstance(condition, (list, tuple)) or len(condition) != 3:
                    continue

                field_key, operator, raw_value = condition

                # Special handling for weight on picking (computed, non-stored)
                if field_key in ['weight', 'shipping_weight']:
                    # Normalize operator for numeric comparison
                    operator = operator or '='
                    if operator == 'ilike':
                        operator = '='
                    try:
                        target_value = float(raw_value)
                    except Exception:
                        # Invalid numeric value, skip condition
                        continue

                    # Fetch candidate pickings using the current base domain only
                    candidates = StockPicking.search(base_domain)

                    def _matches_weight(picking):
                        try:
                            w = float(picking.shipping_weight or 0.0)
                        except Exception:
                            w = 0.0
                        if operator == '=':
                            return abs(w - target_value) < 1e-6
                        if operator == '!=':
                            return abs(w - target_value) >= 1e-6
                        if operator == '>=':
                            return w >= target_value
                        if operator == '<=':
                            return w <= target_value
                        if operator == '>':
                            return w > target_value
                        if operator == '<':
                            return w < target_value
                        # Fallback treat as equality
                        return abs(w - target_value) < 1e-6

                    matched_ids = [p.id for p in candidates if _matches_weight(p)]

                    # Build a domain condition based on matched ids
                    if operator == '!=':
                        cond = ('id', 'not in', matched_ids or [0])
                    else:
                        # For other operators, if no matches, force empty domain
                        cond = ('id', 'in', matched_ids or [0])

                    adv_conditions.append(cond)
                    adv_condition_domains.append([cond])
                    continue

                if field_key not in self.RECEPTION_FIELDS_MAPPING:
                    continue

                model_field = self.RECEPTION_FIELDS_MAPPING[field_key]

                # Manejo especial para filtros por paquete y tipo de paquete
                # Se usan sub-búsquedas para obtener los pickings que cumplan
                if field_key in ['package', 'package_type']:
                    ml_domain = [('picking_id', '!=', False)]
                    # Construir dominio sobre stock.move.line -> result_package_id
                    if field_key == 'package':
                        # Normalizar operador: solo soportamos 'ilike' y '='
                        if operator not in ('ilike', '='):
                            operator = 'ilike'
                        ml_domain.append(('result_package_id.name', operator, str(raw_value)))
                    else:  # package_type
                        try:
                            value_int = int(raw_value)
                        except Exception:
                            # Valor inválido, saltar condición
                            continue
                        if operator not in ('=', '!='):
                            operator = '='
                        if operator == '=':
                            ml_domain.append(('result_package_id.package_type_id', '=', value_int))
                        else:  # '!='
                            ml_domain.append(('result_package_id.package_type_id', '!=', value_int))

                    # Buscar todas las líneas que cumplan (sin límite)
                    picking_ids = StockMoveLine.search(ml_domain).mapped('picking_id').ids
                    # Si no hay coincidencias y el operador es positivo, devolver dominio vacío que nunca coincide
                    if operator in ('ilike', '=') and not picking_ids:
                        cond = ('id', '=', 0)
                    else:
                        # Para '!=' usamos 'not in'
                        if operator == '!=':
                            cond = ('id', 'not in', picking_ids or [0])
                        else:
                            cond = ('id', 'in', picking_ids)

                    adv_conditions.append(cond)
                    adv_condition_domains.append([cond])
                    continue

                # Manejo especial para el campo de estado
                if field_key == 'state':
                    val = (raw_value or '').lower()
                    if val in ['pending', 'draft', 'waiting']:
                        cond = ('state', 'not in', ['done', 'cancel'])
                        adv_conditions.append(cond)
                        adv_condition_domains.append([cond])
                        continue
                    elif val in ['done', 'completed', 'finished']:
                        cond = ('state', '=', 'done')
                        adv_conditions.append(cond)
                        adv_condition_domains.append([cond])
                        continue
                    elif val in ['cancel', 'cancelled']:
                        cond = ('state', '=', 'cancel')
                        adv_conditions.append(cond)
                        adv_condition_domains.append([cond])
                        continue
                    # fallback to raw comparison

                # Manejo especial para fechas
                if field_key in ['scheduled_date', 'date']:
                    if operator == '=':
                        start_utc, end_utc = _date_bounds_utc(str(raw_value))
                        conds = [
                            (model_field, '>=', start_utc),
                            (model_field, '<=', end_utc),
                        ]
                        adv_conditions.extend(conds)
                        adv_condition_domains.append(conds)
                        continue
                    elif operator in ('>=', '<='):
                        bound_utc = _date_bounds_utc(str(raw_value))[0 if operator == '>=' else 1]
                        cond = (model_field, operator, bound_utc)
                        adv_conditions.append(cond)
                        adv_condition_domains.append([cond])
                        continue

                # Coerción por tipo para peso y tipo de paquete
                coerced_value = _coerce_value(field_key, raw_value)

                # Si el campo lógico es numérico pero operador es ilike, degradar a '='
                if field_key in ['weight', 'shipping_weight', 'package_type'] and operator == 'ilike':
                    operator = '='

                cond = (model_field, operator, coerced_value)
                adv_conditions.append(cond)
                adv_condition_domains.append([cond])

            # Combinar condiciones de búsqueda avanzada según el tipo de coincidencia
            if adv_conditions:
                if match_type == 'any':
                    # AND con base_domain de un OR de todas las condiciones avanzadas
                    base_domain = expression.AND([
                        base_domain,
                        expression.OR(adv_condition_domains)
                    ])
                else:  # 'all' es el predeterminado
                    base_domain.extend(adv_conditions)

        return base_domain

    @http.route('/account/reception/list/reload', type='json', auth='user')
    def account_reception_list_reload(self, page=1, search='', domain=None, match_type='all', sort=None, order='asc', quick_filter=None, **kw):
        SysParams = request.env['ir.config_parameter'].sudo()
        limit = self._get_portal_list_limit()
        offset = (page - 1) * limit

        # Construir dominio de búsqueda
        base_domain = self._build_reception_domain(search, domain, match_type, quick_filter)

        if quick_filter and quick_filter == 'pending':
            base_domain.append(('state', '=', 'assigned'))

        if quick_filter and quick_filter == 'done':
            base_domain.append(('state', '=', 'done'))

        # Configurar ordenamiento
        order_by = 'id desc'
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

        # Get current user's partner
        partner = request.env.user.partner_id

        # Create package
        StockPickingType = request.env['stock.picking.type'].sudo()
        StockPicking = request.env['stock.picking'].sudo()
        ProductProduct = request.env['product.product'].sudo()
        AccountPartner = request.env['account.partner'].sudo()
        StockPackageType = request.env['stock.package.type'].sudo()
        StockQuantPackage = request.env['stock.quant.package'].sudo()

        # Get reception type
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
        weight = post.get('weight')
        products = json.loads(post.get('products') or '[]')

        if len(products) == 0:
            return { 'status': 'error', 'message': _('No products selected'), 'errors': [['products', [_('No products selected')]]] }

        account_partner = AccountPartner.search([('partner_id', '=', partner.commercial_partner_id.id)], limit=1)
        scheduled_date_dt = datetime.strptime(scheduled_date_value, '%d-%m-%Y %H:%M')

        # Assume the input datetime is in user's timezone, make it timezone-aware
        user_tz = pytz.timezone(request.env.user.tz or 'UTC')
        local_dt = user_tz.localize(scheduled_date_dt)

        # Convert to UTC for storing in database
        utc_dt = local_dt.astimezone(pytz.UTC)
        scheduled_date = utc_dt.strftime('%Y-%m-%d %H:%M:%S')

        def get_date_diff(date1, date2):
            d1 = datetime.strptime(date1.strftime('%Y-%m-%d %H:%M:%S'), '%Y-%m-%d %H:%M:%S')
            d2 = datetime.strptime(date2.strftime('%Y-%m-%d %H:%M:%S'), '%Y-%m-%d %H:%M:%S')
            return d2 - d1

        # Group products by package number
        packages = {}
        for product in products:
            pid = product.get('product_id')
            qty = product.get('quantity')
            package_num = product.get('package') or '1'

            if not pid:
                return { 'status': 'error', 'message': _('Product not found') }

            if not pid.isdigit():
                return { 'status': 'error', 'message': _('Invalid product ID') }

            product_obj = ProductProduct.browse(int(pid))

            if not product_obj:
                return { 'status': 'error', 'message': _('Product not found') }

            if '.' in qty and not qty.replace('.', '').isdigit():
                return { 'status': 'error', 'message': _('Invalid quantity') }

            if '.' not in qty and not qty.isdigit():
                return { 'status': 'error', 'message': _('Invalid quantity') }

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
                    'shipping_weight': float(weight) if weight else package_type.base_weight,
                }

                package = StockQuantPackage.create(package_values)
                package_map[package_num] = package

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
        })

        # Create moves with detailed move lines for each package
        total_weight = 0

        for package_num, products_in_package in packages.items():
            package = package_map.get(package_num)

            for product_data in products_in_package:
                product = product_data['product']
                qty = product_data['qty']

                # Create stock move
                move_vals = {
                    'name': product.display_name,
                    'product_id': product.id,
                    'product_uom_qty': qty,
                    'product_uom': product.uom_id.id,
                    'picking_id': picking.id,
                    'location_id': picking.location_id.id,
                    'location_dest_id': picking.location_dest_id.id,
                    'state': 'draft',
                }
                move = request.env['stock.move'].sudo().create(move_vals)

                # Create move line with package reference if package exists
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

        # Update origin and weight
        picking.write({
            'shipping_weight': total_weight,
            'origin': ', '.join(package_names) if package_names else f'Portal: {tracking_number}'
        })

        # Confirm the picking without trying to put in pack (already done manually)
        picking.action_confirm()

        # If we want to mark as assigned
        picking.action_assign()

        return { 'status': 'success', 'message': _('Reception created successfully') }


    @http.route('/account/reception/product-catalog', type='json', auth='user')
    def account_reception_product_catalog(self, page=1, search='', **post):
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

    @http.route('/account/reception/product-search', type='json', auth='user')
    def account_reception_product_search(self, term='', **kw):
        """Search products based on term for select2 with product attributes"""
        ProductProduct = request.env['product.product'].sudo()
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

        return {
            'items': result_items
        }

    @http.route('/account/reception/details/<int:reception_id>', type='http', auth="user", website=True)
    def account_reception_details_action(self, reception_id, access_token=None, **post):
        StockPicking = request.env['stock.picking'].sudo()
        reception_type = request.env.ref('stock.picking_type_in')
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

        # Get the reception
        picking = StockPicking.search([
            ('id', '=', reception_id),
            ('picking_type_id', '=', reception_type.id),
            ('partner_id', 'in', partner_ids)
        ], limit=1)

        if not picking:
            return request.redirect('/account/reception')

        values = self._get_admin_layout_values()
        values.update({
            'page_name': 'reception_details',
            'picking': picking,
            'page_title': _('Reception Details'),
            'page_url': '/account/reception/details/%s' % reception_id,
        })

        return request.render("portal_reception.portal_reception_details_page", values)

    def _setup_portal_message_fetch_extra_domain(self, data):
        return []

    @http.route('/portal_reception/reception/details/chatter/fetch', type='json', auth='public', website=True)
    def portal_reception_details_chatter_fetch(self, reception_id=None, limit=10, after=None, before=None, **kw):
        """Add compatible route matching the JS client call pattern"""
        if not reception_id:
            return {
                'data': {'mail.message': []},
                'status': 'success'
            }

        # Only search into website_message_ids, so apply the same domain to perform only one search
        # extract domain from the 'website_message_ids' field
        model = request.env['stock.picking']
        field = model._fields['website_message_ids']
        domain = [
            ('res_id', '=', int(reception_id)),
            ('model', '=', 'stock.picking'),
            ('subtype_id', '=', request.env.ref('mail.mt_comment').id),
            '|',
            ('body', '!=', ''),
            ('attachment_ids', '!=', False)
        ]

        # Check access
        Message = request.env['mail.message']
        StockPicking = request.env['stock.picking'].sudo()
        reception_type = request.env.ref('stock.picking_type_in')
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

        # Verify user has access to this reception
        picking = StockPicking.search([
            ('id', '=', int(reception_id)),
            ('picking_type_id', '=', reception_type.id),
            ('partner_id', 'in', partner_ids)
        ], limit=1)

        if not picking:
            return {
                'data': {'mail.message': []},
                'status': 'error',
                'message': 'Access denied'
            }

        # Non-employee see only messages with not internal subtype
        if not request.env.user._is_internal():
            domain = expression.AND([Message._get_search_domain_share(), domain])

        messages = Message.sudo().search(domain, limit=limit, order='date ASC, id ASC')
        formatted_messages = messages.portal_message_format() if messages else []

        return {
            'data': {
                'mail.message': formatted_messages
            },
            'status': 'success'
        }

    @http.route('/portal_reception/reception/details/chatter/post', type='http', auth="user", methods=['POST'])
    def portal_reception_details_chatter_post(self, reception_id, access_token=None, **post):
        """Add compatible route for posting messages from JS client"""
        if not str(reception_id).isdigit():
            return json.dumps({'status': 'error', 'message': 'Invalid reception ID'})

        StockPicking = request.env['stock.picking'].sudo()
        reception_type = request.env.ref('stock.picking_type_in')
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

        # Get the reception
        picking = StockPicking.search([
            ('id', '=', int(reception_id)),
            ('picking_type_id', '=', reception_type.id),
            ('partner_id', 'in', partner_ids)
        ], limit=1)

        if not picking:
            return json.dumps({'status': 'error', 'message': 'Access denied'})

        # Process attachment if provided
        attachment_id = False
        attachment_data = post.get('attachment')
        if attachment_data and hasattr(attachment_data, 'filename'):
            ufile = attachment_data
            if ufile:
                # Create attachment
                vals = {
                    "name": ufile.filename,
                    "raw": ufile.read(),
                    "res_id": int(reception_id),
                    "res_model": 'stock.picking',
                }

                if request.env.user.share:
                    # Generate access token for shared users
                    vals["access_token"] = request.env["ir.attachment"]._generate_access_token()

                try:
                    attachment = request.env["ir.attachment"].sudo().create(vals)
                    attachment_id = attachment.id
                except AccessError:
                    return json.dumps({"status": "error", "message": _("You are not allowed to upload an attachment here.")})

        # Post message
        message_content = post.get('message', '')
        attachment_ids = [attachment_id] if attachment_id else []

        try:
            message = picking.sudo().with_user(request.env.user).message_post(
                body=message_content,
                message_type='comment',
                subtype_xmlid='mail.mt_comment',
                attachment_ids=attachment_ids,
                author_id=request.env.user.partner_id.id
            )

            return json.dumps({
                'status': 'success',
                'message_id': message.id
            })
        except Exception as e:
            return json.dumps({
                'status': 'error',
                'message': str(e)
            })

    @http.route('/account/reception/package-type-search', type='json', auth='user')
    def account_reception_package_type_search(self, term='', **kw):
        """Search package types based on term for select2"""
        PackageType = request.env['stock.package.type'].sudo()
        domain = []

        if term:
            domain = expression.OR([
                [('name', 'ilike', term)],
                [('package_carrier_type', 'ilike', term)]
            ])

        package_types = PackageType.search(domain, limit=10)

        # Prepare package type data
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
