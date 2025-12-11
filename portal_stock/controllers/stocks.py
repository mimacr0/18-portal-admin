import io
import math
import json
from functools import lru_cache
from datetime import datetime

try:
    import xlsxwriter
except ImportError:
    xlsxwriter = None

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
        'stock': 'qty_available',
        'status': 'qty_available',
    }

    DEFAULT_LIMIT_PARAM = 'portal_stock.page_list_default_limit'
    DEFAULT_LIMIT_VALUE = '100'
    
    def _get_lots_domain_for_product(self, product_id):
        """Obtiene el dominio para verificar si un producto tiene lotes accesibles"""
        partner_id = request.env.user.partner_id
        account_partner = request.env['account.partner'].sudo().search([
            ('partner_id', '=', partner_id.commercial_partner_id.id)
        ], limit=1)
        
        if not account_partner:
            return expression.FALSE_DOMAIN
        
        # Verificar que el producto pertenece al account_partner
        products = request.env['product.product'].sudo().search([
            ('is_storable', '=', True),
            ('account_partner_id', '=', account_partner.id),
            ('id', '=', product_id)
        ])
        
        if not products:
            return expression.FALSE_DOMAIN
        
        return [('product_id', '=', product_id)]

    def _get_admin_layout_menus(self):
        menus = super()._get_admin_layout_menus()
        menus.append({
            'name': _('Stock'),
            'url': '/account/stock',
            'icon': 'fas fa-cubes',
            'order': 30
        })
        return menus

    @lru_cache(maxsize=1)
    def _get_advanced_search_fields(self):
        """Devuelve la configuración de campos para búsqueda avanzada"""
        return [
            {'id': 'name', 'label': _('Name'), 'type': 'text'},
            {'id': 'sku', 'label': _('SKU'), 'type': 'text'},
            {'id': 'barcode', 'label': _('Barcode'), 'type': 'text'},
            {'id': 'stock', 'label': _('Stock'), 'type': 'number'},
            {
                'id': 'status',
                'label': _('Status'),
                'type': 'select',
                'options': [
                    {'id': 'in_stock', 'label': _('In Stock')},
                    {'id': 'out_stock', 'label': _('Out of Stock')}
                ]
            }
        ]

    @http.route('/account/stock', type='http', auth="user", website=True)
    def account_stock_action(self, **post):
        ProductProducts = request.env['product.product'].sudo()
        partner_id = request.env.user.partner_id
        account_partner = request.env['account.partner'].sudo().search([('id', '=', partner_id.commercial_partner_id.id)], limit=1)
        stock = ProductProducts.search([('is_storable', '=', True), ('account_partner_id', '=', account_partner.id)])

        attributes = request.env['product.attribute'].sudo().search([])
        attributes_data = []
        for attr in attributes:
            values = [{'id': v.id, 'name': v.name} for v in attr.value_ids]
            attributes_data.append({'id': attr.id, 'name': attr.name, 'values': values})

        values = self._get_admin_layout_values()

        # Definimos la lista de filtros
        list_filters = [
            {
                'id': 'all',
                'label': _('All'),
                'icon': 'fas fa-check-circle',
                'active': True,
            },
            {
                'id': 'in_stock',
                'label': _('In Stock'),
                'icon': 'fas fa-boxes',
            },
            {
                'id': 'out_stock',
                'label': _('Out of Stock'),
                'icon': 'fas fa-cubes'
            }
        ]

        # Se obtiene el filtro activo
        active_filter = next((filter['id'] for filter in list_filters if filter.get('active')), 'all')

        # Definir las columnas de la lista basadas en PRODUCT_FIELDS_MAPPING
        list_columns = [
            {'id': 'name', 'label': _('Name'), 'sortable': True, 'responsive': ['sm', 'md', 'lg']},
            {'id': 'sku', 'label': _('SKU'), 'sortable': True, 'lg': True, 'responsive': ['lg']},
            {'id': 'barcode', 'label': _('Barcode'), 'sortable': True, 'lg': True, 'responsive': ['lg']},
            {'id': 'stock', 'label': _('Stock'), 'sortable': True, 'md': True, 'responsive': ['lg']},
            {'id': 'status', 'label': _('Status'), 'sortable': True, 'responsive': ['md', 'lg']},
            {'id': 'actions', 'label': _('Actions'), 'sortable': False, 'right': True, 'responsive': ['sm', 'md', 'lg']}
        ]
        
        # Procesar columnas para añadir flags de visibilidad según responsive
        for column in list_columns:
            responsive = column.get('responsive', [])
            column['show_in_sm'] = 'sm' in responsive
            column['show_in_md'] = 'md' in responsive
            column['show_in_lg'] = 'lg' in responsive

        # Cargar productos iniciales para mostrar en la página
        SysParams = request.env['ir.config_parameter'].sudo()
        limit = int(SysParams.get_param(self.DEFAULT_LIMIT_PARAM, self.DEFAULT_LIMIT_VALUE))
        base_domain = self._build_product_domain('', None, 'all')
        # El contexto ya tiene el idioma establecido por _get_admin_layout_values()
        user_lang = request.env.context.get('lang') or 'es_ES'
        products = ProductProducts.with_context(lang=user_lang).search(base_domain, limit=limit, order='id desc')
        
        # Pre-cargar información de lotes para productos con tracking serial
        StockLot = request.env['stock.lot'].sudo()
        products_has_lots = {}
        for product in products:
            if product.tracking == 'serial':
                # Verificar si el producto tiene lotes accesibles
                lot_domain = self._get_lots_domain_for_product(product.id)
                products_has_lots[product.id] = bool(StockLot.search_count(lot_domain) > 0)
            else:
                products_has_lots[product.id] = False
        
        # Renderizar la lista de productos (el contexto ya tiene el idioma establecido)
        qweb = request.env['ir.qweb']
        products_list_html = qweb._render('portal_stock.portal_products_list', {
            'products': products,
            'batch_actions': True,
            'products_has_lots': products_has_lots,
            'label_in_stock': _('In Stock'),
            'label_out_of_stock': _('Out of Stock')
        })
        
        # Preparar datos de paginación inicial
        items_total = ProductProducts.search_count(base_domain)
        items_count = len(products)
        pagination_data = self._get_pagination_data(1, items_total, limit)
        pagination_data.update({'items_total': items_total, 'items_count': items_count})
        
        products_pager_html = qweb._render('portal_stock.portal_stock_pager', {
            'products': products,
            'items_label': _('products'),
            **pagination_data
        })
        
        # Actualiza los valores con los filtros y el filtro activo
        values.update({
            'active_filter': active_filter,
            'page_name': 'stock',
            'stock': stock,
            'attributes': attributes_data,
            'page_title': _('Stock'),
            'page_url': '/account/stock',
            'select2': True,
            'list_filters': list_filters,
            'list_columns': list_columns,  # Añadimos las columnas a renderizar
            'advanced_search': json.dumps(self._get_advanced_search_fields()),
            'batch_actions': [
                {'name': 'export', 'label': _('Export Excel'), 'icon': 'fas fa-file-excel', 'color': 'bg-[#696900] hover:bg-[#8A8A00]'},
                {'name': 'delete', 'label': _('Delete'), 'icon': 'fas fa-trash-alt', 'color': 'bg-red-600 hover:bg-red-700'},
            ],
            'products_list_html': products_list_html,
            'products_pager_html': products_pager_html,
        })

        return request.render("portal_stock.portal_stock_page", values)

    def _build_product_domain(self, search='', domain=None, match_type='all'):
        """Construye el dominio de búsqueda para productos"""
        partner_id = request.env.user.partner_id
        account_partner = request.env['account.partner'].sudo().search([('partner_id', '=', partner_id.commercial_partner_id.id)], limit=1)
        base_domain = [('is_storable', '=', True), ('account_partner_id', '=', account_partner.id)]

        # Se aplica el filtro de búsqueda por nombre, SKU o código de barras
        if search:
            term = f"%{search}%"
            base_domain.extend(expression.OR([
                [('name', 'ilike', term)],
                [('default_code', 'ilike', term)],
                [('barcode', 'ilike', term)]
            ]))

        # Aplicar dominio de búsqueda avanzada
        if domain and isinstance(domain, list) and domain:
            adv_conditions = []        # lista de tuplas (AND)
            adv_condition_domains = [] # lista de dominios para OR

            for condition in domain:
                if not isinstance(condition, (list, tuple)) or len(condition) != 3:
                    continue

                field_key, operator, raw_value = condition
                if field_key not in self.PRODUCT_FIELDS_MAPPING:
                    continue

                model_field = self.PRODUCT_FIELDS_MAPPING[field_key]

                # Campo STATUS como select
                if field_key == 'status':
                    val = str(raw_value or '').strip().lower()
                    # Permitimos '=' y '!='
                    operator = operator or '='
                    if val in ['in stock', 'instock', 'in_stock', 'in']:
                        cond = ('qty_available', '>', 0)
                        if operator == '!=':
                            cond = ('qty_available', '<=', 0)
                    elif val in ['out of stock', 'outofstock', 'out_stock', 'out']:
                        cond = ('qty_available', '<=', 0)
                        if operator == '!=':
                            cond = ('qty_available', '>', 0)
                    else:
                        # fallback sin condición válida
                        continue
                    adv_conditions.append(cond)
                    adv_condition_domains.append([cond])
                    continue

                # Campo STOCK numérico (qty_available)
                if field_key == 'stock':
                    # Normalizar operador: '=' por defecto si 'ilike'
                    if operator == 'ilike':
                        operator = '='
                    try:
                        numeric_value = float(raw_value)
                    except (ValueError, TypeError):
                        continue
                    cond = (model_field, operator or '=', numeric_value)
                    adv_conditions.append(cond)
                    adv_condition_domains.append([cond])
                    continue

                # Campos de texto: name, sku, barcode
                op = (operator or 'ilike').lower()
                val = str(raw_value or '').strip()
                if op in ('ilike', 'not ilike'):
                    # Asegurar búsqueda por coincidencia parcial
                    val = f"%{val}%"
                cond = (model_field, op, val)
                adv_conditions.append(cond)
                adv_condition_domains.append([cond])

            # Combinar condiciones de búsqueda avanzada según el tipo de coincidencia
            if adv_conditions:
                if match_type == 'any':
                    base_domain = expression.AND([
                        base_domain,
                        expression.OR(adv_condition_domains)
                    ])
                else:  # 'all' es el predeterminado
                    base_domain.extend(adv_conditions)

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
    def account_stock_list_reload(self, page=1, search='', domain=None, match_type='all', sort=None, order='desc', quick_filter=None, **kw):
        SysParams = request.env['ir.config_parameter'].sudo()
        limit = int(SysParams.get_param(self.DEFAULT_LIMIT_PARAM, self.DEFAULT_LIMIT_VALUE))
        offset = (page - 1) * limit

        # Obtener el filtro activo por defecto si no se especifica uno
        if not quick_filter:
            # Default to 'all' when not specified
            quick_filter = 'all'

        # Construir dominio de búsqueda
        base_domain = self._build_product_domain(search, domain, match_type)
        # Apply quick filters
        if quick_filter and quick_filter != 'all':
            if quick_filter == 'in_stock':
                base_domain.append(('qty_available', '>', 0))
            elif quick_filter == 'out_stock':
                base_domain.append(('qty_available', '<=', 0))

        # Configurar ordenamiento
        order_by = 'id desc'
        if sort and sort in self.PRODUCT_FIELDS_MAPPING:
            order_by = f"{self.PRODUCT_FIELDS_MAPPING[sort]} {order}"

        # Obtener productos y contar
        ProductProducts = request.env['product.product'].sudo()
        # Asegurar que el contexto tenga el idioma del usuario (endpoint JSON, no pasa por _get_admin_layout_values)
        self._ensure_user_lang_context()
        user_lang = request.env.context.get('lang') or 'es_ES'
        products = ProductProducts.with_context(lang=user_lang).search(base_domain, limit=limit, offset=offset, order=order_by)
        items_total = ProductProducts.search_count(base_domain)
        items_count = len(products)

        # Pre-cargar información de lotes para productos con tracking serial
        StockLot = request.env['stock.lot'].sudo()
        products_has_lots = {}
        for product in products:
            if product.tracking == 'serial':
                # Verificar si el producto tiene lotes accesibles
                lot_domain = self._get_lots_domain_for_product(product.id)
                products_has_lots[product.id] = bool(StockLot.search_count(lot_domain) > 0)
            else:
                products_has_lots[product.id] = False

        # Preparar datos de paginación
        pagination_data = self._get_pagination_data(page, items_total, limit)
        pagination_data.update({'items_total': items_total, 'items_count': items_count})

        # El contexto ya tiene el idioma establecido por _ensure_user_lang_context()
        qweb = request.env['ir.qweb']
        return {
            'status': 'success',
            'list': qweb._render('portal_stock.portal_products_list', {
                'products': products,
                'batch_actions': True,
                'products_has_lots': products_has_lots,
                'label_in_stock': _('In Stock'),
                'label_out_of_stock': _('Out of Stock')
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

    @http.route('/account/stock/delete/product', type='json', auth='user')
    def account_stock_delete_product(self, product_id=None, **kw):
        """Delete a single product variant owned by the current account partner.

        Uses sudo but enforces ownership by checking `account_partner_id`.
        """
        try:
            if not product_id:
                return {'status': 'error', 'message': _('Missing product identifier')}

            Product = request.env['product.product'].sudo()
            product = Product.browse(int(product_id))

            if not product.exists():
                return {'status': 'error', 'message': _('Product not found')}

            # Ensure product belongs to current account partner
            partner = request.env.user.partner_id
            account_partner = request.env['account.partner'].sudo().search([
                ('partner_id', '=', partner.commercial_partner_id.id)
            ], limit=1)
            print(account_partner, product.account_partner_id.id, account_partner.id)
            if account_partner and product.account_partner_id.id != account_partner.id:
                return {'status': 'error', 'message': _('You do not have access to this product')}

            # Attempt unlink
            product.unlink()
            return {'status': 'success', 'message': _('Product deleted successfully')}
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

    @http.route('/account/stock/delete/products', type='json', auth='user')
    def account_stock_delete_products(self, product_ids=None, **kw):
        """Batch delete multiple product variants owned by the current account partner."""
        try:
            ids_param = product_ids or kw.get('ids') or kw.get('products')
            if not ids_param:
                return {'status': 'error', 'message': _('No products selected')}

            # Allow both list and comma-separated string
            if isinstance(ids_param, str):
                ids = [int(x) for x in ids_param.split(',') if x.strip().isdigit()]
            elif isinstance(ids_param, (list, tuple)):
                ids = [int(x) for x in ids_param]
            else:
                return {'status': 'error', 'message': _('Invalid products payload')}

            if not ids:
                return {'status': 'error', 'message': _('No valid products to delete')}

            partner = request.env.user.partner_id
            account_partner = request.env['account.partner'].sudo().search([
                ('id', '=', partner.commercial_partner_id.id)
            ], limit=1)

            Product = request.env['product.product'].sudo()
            products = Product.search([
                ('id', 'in', ids),
                ('account_partner_id', '=', account_partner.id)
            ])

            if not products:
                return {'status': 'error', 'message': _('No permitted products found for deletion')}

            count = len(products)
            products.unlink()
            return {
                'status': 'success',
                'message': _(f'{count} product(s) deleted successfully'),
                'deleted_count': count,
            }
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

    @http.route('/account/stock/export', type='http', auth='user', methods=['GET', 'POST'])
    def account_stock_export(self, ids=None, **kw):
        """Export stock products to Excel (XLSX) file."""
        
        if not xlsxwriter:
            return request.make_response(
                _('Excel export not available. Please install xlsxwriter.'),
                headers=[('Content-Type', 'text/plain')]
            )
        
        ProductProduct = request.env['product.product'].sudo()
        partner_id = request.env.user.partner_id
        
        account_partner = request.env['account.partner'].sudo().search([
            ('partner_id', '=', partner_id.commercial_partner_id.id)
        ], limit=1)
        
        domain = [
            ('is_storable', '=', True),
            ('account_partner_id', '=', account_partner.id if account_partner else 0)
        ]
        
        if ids:
            try:
                id_list = [int(i) for i in ids.split(',') if i.strip()]
                if id_list:
                    domain.append(('id', 'in', id_list))
            except ValueError:
                pass
        
        products = ProductProduct.search(domain, order='name asc')

        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output, {'in_memory': True})
        worksheet = workbook.add_worksheet(_('Stock'))
        
        # Formats
        header_format = workbook.add_format({
            'bold': True,
            'bg_color': '#696900',
            'font_color': 'white',
            'border': 1,
            'align': 'center',
            'valign': 'vcenter'
        })
        cell_format = workbook.add_format({
            'border': 1,
            'valign': 'vcenter'
        })
        number_format = workbook.add_format({
            'border': 1,
            'valign': 'vcenter',
            'num_format': '#,##0.00'
        })
        
        # Column widths
        worksheet.set_column(0, 0, 35)  # Name
        worksheet.set_column(1, 1, 15)  # SKU
        worksheet.set_column(2, 2, 18)  # Barcode
        worksheet.set_column(3, 3, 12)  # Real Stock
        worksheet.set_column(4, 4, 12)  # Available
        worksheet.set_column(5, 5, 12)  # Incoming
        worksheet.set_column(6, 6, 12)  # Outgoing
        worksheet.set_column(7, 7, 12)  # Status
        
        # Headers
        headers = [
            _('Name'),
            _('SKU'),
            _('Barcode'),
            _('Real Stock'),
            _('Available'),
            _('Incoming'),
            _('Outgoing'),
            _('Status'),
        ]
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)
        
        # Data rows
        for row, product in enumerate(products, start=1):
            status = _('In Stock') if product.qty_available > 0 else _('Out of Stock')
            
            worksheet.write(row, 0, product.name or '', cell_format)
            worksheet.write(row, 1, product.default_code or '', cell_format)
            worksheet.write(row, 2, product.barcode or '', cell_format)
            worksheet.write(row, 3, product.qty_available or 0, number_format)
            worksheet.write(row, 4, product.free_qty or 0, number_format)
            worksheet.write(row, 5, product.incoming_qty or 0, number_format)
            worksheet.write(row, 6, product.outgoing_qty or 0, number_format)
            worksheet.write(row, 7, status, cell_format)
        
        workbook.close()
        
        output.seek(0)
        content = output.getvalue()
        
        filename = f"stock_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        
        return request.make_response(
            content,
            headers=[
                ('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
                ('Content-Disposition', f'attachment; filename="{filename}"'),
            ]
        )