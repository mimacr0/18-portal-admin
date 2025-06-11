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
        values = self._get_admin_layout_values()

        # Configuración de la interfaz
        values.update({
            'page_name': 'stock',
            'stock': stock,
            'page_title': _('Stock'),
            'page_url': '/account/stock',
            'list_filters': [
                {
                    'id': 'all',
                    'label': _('All'),
                    'icon': 'fas fa-check-circle',
                    'active': True
                },
                {
                    'id': 'in_stock',
                    'label': _('In Stock'),
                    'icon': 'fas fa-check-circle'
                },
                {
                    'id': 'out_of_stock',
                    'label': _('Out of Stock'),
                    'icon': 'fas fa-pause-circle'
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
    def account_stock_list_reload(self, page=1, search='', domain=None, match_type='all', sort=None, order='asc', **kw):
        SysParams = request.env['ir.config_parameter'].sudo()
        limit = int(SysParams.get_param(self.DEFAULT_LIMIT_PARAM, self.DEFAULT_LIMIT_VALUE))
        offset = (page - 1) * limit

        # Construir dominio de búsqueda
        base_domain = self._build_product_domain(search, domain, match_type)

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