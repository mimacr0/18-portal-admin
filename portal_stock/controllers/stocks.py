import math
import json
from functools import lru_cache

from odoo import http, _
from odoo.addons.portal_admin_theme.controllers.admin import PortalAdminController
from odoo.http import request
from odoo.osv import expression


class PortalStockController(PortalAdminController):
    # Constantes de configuración
    PRODUCT_FIELDS_MAPPING = {
        'name': 'name',
        'sku': 'default_code',
        'barcode': 'barcode',
        'status': 'qty_available'
    }

    DEFAULT_LIMIT_PARAM = 'portal_stock.page_list_default_limit'
    DEFAULT_LIMIT_VALUE = '100'

    def _get_admin_layout_menus(self):
        menus = super()._get_admin_layout_menus()
        menus.append({
            'name': _('Stock'),
            'url': '/account/stock',
            'icon': 'fas fa-cubes'
        })
        return menus

    @lru_cache(maxsize=1)
    def _get_advanced_search_fields(self):
        """Devuelve la configuración de campos para búsqueda avanzada"""
        return [
            {'id': 'name', 'label': _('Name')},
            {'id': 'sku', 'label': _('SKU')},
            {'id': 'barcode', 'label': _('Barcode')},
            {'id': 'status', 'label': _('Status')}
        ]

    @http.route('/account/stock', type='http', auth="user", website=True)
    def account_stock_action(self, **post):
        ProductProducts = request.env['product.product'].sudo()
        stock = ProductProducts.search([('is_storable', '=', True)])

        attributes = request.env['product.attribute'].sudo().search([])
        attributes_data = []
        for attr in attributes:
            values = [{'id': v.id, 'name': v.name} for v in attr.value_ids]
            attributes_data.append({'id': attr.id, 'name': attr.name, 'values': values})

        values = self._get_admin_layout_values()

        # Configuración de la interfaz
        values.update({
            'page_name': 'stock',
            'stock': stock,
            'attributes': attributes_data,
            'page_title': _('Stock'),
            'page_url': '/account/stock',
            'select2': True,
            'list_filters': [
                {
                    'id': 'all',
                    'label': _('All'),
                    'icon': 'fas fa-check-circle',
                    'active': True
                },
                {
                    'id': 'stock_reference',
                    'label': _('Reference'),
                    'icon': 'fas fa-boxes'
                },
                {
                    'id': 'stock_qty',
                    'label': _('Quantity'),
                    'icon': 'fas fa-cubes'
                }
            ],
            'list_columns': [
                {'id': 'name', 'label': _('Name'), 'sortable': True},
                {'id': 'sku', 'label': _('SKU'), 'sortable': True, 'lg': True},
                {'id': 'barcode', 'label': _('Barcode'), 'sortable': True, 'lg': True},
                {'id': 'status', 'label': _('Status'), 'sortable': True, 'md': True},
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

        return request.render("portal_stock.portal_stock_page", values)

    def _build_product_domain(self, search='', domain=None, match_type='all'):
        """Construye el dominio de búsqueda para productos"""
        base_domain = [('is_storable', '=', True)]

        # Aplicar búsqueda de texto
        if search:
            base_domain.extend(expression.OR([
                [('name', 'ilike', search)],
                [('default_code', 'ilike', search)],
                [('barcode', 'ilike', search)]
            ]))

        # Aplicar dominio de búsqueda avanzada
        if domain and isinstance(domain, list) and domain:
            adv_domain = []
            for condition in domain:
                if len(condition) != 3:
                    continue

                field, operator, value = condition
                if field not in self.PRODUCT_FIELDS_MAPPING:
                    continue

                model_field = self.PRODUCT_FIELDS_MAPPING[field]

                # Manejo especial para el campo de estado
                if field == 'status':
                    if value.lower() in ['in stock', 'instock']:
                        adv_domain.append(('qty_available', '>', 0))
                    elif value.lower() in ['out of stock', 'outofstock']:
                        adv_domain.append(('qty_available', '<=', 0))
                    else:
                        try:
                            numeric_value = float(value)
                            adv_domain.append((model_field, operator, numeric_value))
                        except (ValueError, TypeError):
                            pass
                else:
                    adv_domain.append((model_field, operator, value))

            # Combinar condiciones de búsqueda avanzada según el tipo de coincidencia
            if adv_domain:
                if match_type == 'any':
                    base_domain.append(expression.OR(adv_domain))
                else:  # 'all' es el predeterminado
                    base_domain.extend(adv_domain)

        return base_domain

    def _get_pagination_data(self, page, items_total, limit):
        """Calcula datos de paginación"""
        first_page = 1
        last_page = math.ceil(items_total / limit)
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

    @http.route('/account/stock/list/reload', type='json', auth='user')
    def account_stock_list_reload(self, page=1, search='', domain=None, match_type='all', sort=None, order='asc', quick_filter=None, **kw):
        SysParams = request.env['ir.config_parameter'].sudo()
        limit = int(SysParams.get_param(self.DEFAULT_LIMIT_PARAM, self.DEFAULT_LIMIT_VALUE))
        offset = (page - 1) * limit

        # Construir dominio de búsqueda
        base_domain = self._build_product_domain(search, domain, match_type)

        # Apply quick filters
        if quick_filter and quick_filter != 'all':
            if quick_filter == 'stock_reference':
                base_domain.append(('tracking', '=', 'lot'))
            elif quick_filter == 'stock_qty':
                base_domain.append(('tracking', '=', 'none'))

        # Configurar ordenamiento
        order_by = 'id'
        if sort and sort in self.PRODUCT_FIELDS_MAPPING:
            order_by = f"{self.PRODUCT_FIELDS_MAPPING[sort]} {order}"

        # Obtener productos y contar
        ProductProducts = request.env['product.product'].sudo()
        products = ProductProducts.search(base_domain, limit=limit, offset=offset, order=order_by)
        items_total = ProductProducts.search_count(base_domain)
        items_count = len(products)

        # Preparar datos de paginación
        pagination_data = self._get_pagination_data(page, items_total, limit)
        pagination_data.update({'items_total': items_total, 'items_count': items_count})

        qweb = request.env['ir.qweb']
        return {
            'status': 'success',
            'list': qweb._render('portal_stock.portal_products_list', {
                'products': products,
                'batch_actions': True
            }),
            'pager': qweb._render('portal_stock.portal_stock_pager', {
                'products': products,
                'items_label': _('products'),
                **pagination_data
            }),
            'last_page': pagination_data['last_page']
        }

    @http.route('/account/stock/list/advanced_filters', type='json', auth='user')
    def account_stock_list_advanced_filters(self, **kw):
        return {
            'status': 'success',
            'filters': json.dumps(self._get_advanced_search_fields())
        }

    @http.route('/account/stock/image/<int:pid>/<int:width>x<int:height>', type='http', auth='user')
    def account_stock_image_action(self, pid, width, height, **kw):
        field = 'image_128'
        crop = True
        download = False
        unique = True
        nocache = False

        try:
            ProductProducts = request.env['product.product'].sudo()
            product = ProductProducts.browse(pid)
            stream = request.env['ir.binary']._get_image_stream_from(
                product, field, width=int(width), height=int(height), crop=crop
            )
            if request.httprequest.args.get('access_token'):
                stream.public = True
        except Exception as exc:
            if download:
                raise request.not_found() from exc
            # Fallback to placeholder
            record = request.env.ref('web.image_placeholder').sudo()
            stream = request.env['ir.binary']._get_image_stream_from(
                record, 'raw', width=int(width), height=int(height), crop=crop
            )
            stream.public = False

        send_file_kwargs = {'as_attachment': download}
        if unique:
            send_file_kwargs['immutable'] = True
            send_file_kwargs['max_age'] = http.STATIC_CACHE_LONG
        if nocache:
            send_file_kwargs['max_age'] = None

        return stream.get_response(**send_file_kwargs)

    @http.route('/account/stock/get/attributes', type='json', auth='user')
    def account_stock_get_attributes(self, **kw):
        """Return all product attributes for the product creation form"""
        attributes = request.env['product.attribute'].sudo().search([])
        return {
            'status': 'success',
            'attributes': [{'id': attr.id, 'name': attr.name} for attr in attributes]
        }

    @http.route('/account/stock/get/attribute/values', type='json', auth='user')
    def account_stock_get_attribute_values(self, attribute_id, **kw):
        """Return values for a specific attribute"""
        try:
            attribute_id = int(attribute_id)
            attribute = request.env['product.attribute'].sudo().browse(attribute_id)
            values = attribute.value_ids
            return {
                'status': 'success',
                'values': [{'id': value.id, 'name': value.name} for value in values]
            }
        except (ValueError, Exception) as e:
            return {'status': 'error', 'message': str(e)}

    @http.route('/account/stock/create/product', type='json', auth='user')
    def account_stock_create_product(self, **post):
        try:
            # Extract basic product data
            name = post.get('name')
            width = float(post.get('width', 0) or 0)
            height = float(post.get('height', 0) or 0)
            length = float(post.get('length', 0) or 0)
            volume = float(post.get('volume', 0) or 0)
            weight = float(post.get('weight', 0) or 0)
            barcode = post.get('barcode')
            sku = post.get('sku')
            tracking = post.get('tracking', 'none')
            image_base64 = post.get('image_base64')

            # Get current user's account partner
            partner = request.env.user.partner_id
            account_partner = request.env['account.partner'].sudo().search([('partner_id', '=', partner.id)], limit=1)

            # Create product template
            ProductTemplate = request.env['product.template'].sudo()
            values = {
                'account_partner_id': account_partner.id if account_partner else False,
                'name': name,
                'sale_ok': False,
                'purchase_ok': False,
                'type': 'consu',
                'list_price': 0.0,
                'standard_price': 0.0,
                'volume': volume,
                'weight': weight,
                'barcode': barcode,
                'default_code': sku,
                'is_storable': True,
                'tracking': tracking,
                'image_1920': image_base64,
            }

            template = ProductTemplate.create(values)

            # Handle attributes if provided
            if post.get('attributes'):
                attributes_data = json.loads(post.get('attributes') or '[]')

                # Create attribute lines
                for attr_data in attributes_data:
                    attribute_id = attr_data.get('attribute_id')
                    value_ids = attr_data.get('attribute_value_id')

                    if attribute_id and value_ids:
                        # Convert single value to list if needed
                        if not isinstance(value_ids, list):
                            value_ids = [value_ids]

                        # Create attribute line
                        template.write({
                            'attribute_line_ids': [(0, 0, {
                                'attribute_id': int(attribute_id),
                                'value_ids': [(6, 0, [int(v) for v in value_ids if v])]
                            })]
                        })

            return {
                'status': 'success',
                'message': _('Product created successfully'),
                'product_id': template.id
            }
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

    @http.route('/your/upload/route', type='json', auth='user')
    def upload_image(self, image_data, record_id):
        record = request.env['product.template'].sudo().browse(int(record_id))
        record.image_1920 = image_data  # Campo binary estándar para imágenes
        return {'status': 'ok'}