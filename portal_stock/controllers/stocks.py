import io
import math
import json
import base64
import os
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
        'name': 'product_id.name',
        'sku': 'product_id.default_code',
        'barcode': 'product_id.barcode',
        'stock': 'quantity',
        'location': 'location_id.name',
        'status': 'quantity',
        'product_id': 'product_id',
    }

    DEFAULT_LIMIT_PARAM = 'portal_stock.page_list_default_limit'
    DEFAULT_LIMIT_VALUE = '100'
    


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
    def _get_stock_advanced_search_fields(self):
        """Devuelve la configuración de campos para búsqueda avanzada"""
        return [
            {'id': 'name', 'label': _('Name'), 'type': 'text'},
            {'id': 'sku', 'label': _('SKU'), 'type': 'text'},
            {'id': 'stock', 'label': _('Stock'), 'type': 'number'},
            {
                'id': 'status',
                'label': _('Status'),
                'type': 'select',
                'options': [
                    {'id': 'in_stock', 'label': _('In Stock')},
                    {'id': 'out_stock', 'label': _('Out of Stock')}
                ]
            },
            {'id': 'location', 'label': _('Location'), 'type': 'text'}
        ]
    @http.route('/account/stock', type='http', auth="user", website=True)
    def account_stock_action(self, **post):
        StockQuant = request.env['stock.quant'].sudo()
        # Find stock location
        stock_location = request.env.ref('stock.stock_location_stock')
        base_domain = [('location_id', 'child_of', stock_location.id), ('quantity', '>', 0)]
        stock = StockQuant.search(base_domain)

        attributes = request.env['product.attribute'].sudo().search([])
        attributes_data = []
        for attr in attributes:
            values = [{'id': v.id, 'name': v.name} for v in attr.value_ids]
            attributes_data.append({'id': attr.id, 'name': attr.name, 'values': values})

        values = self._get_admin_layout_values()

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
            # {'id': 'sku', 'label': _('SKU'), 'sortable': True, 'lg': True, 'responsive': ['lg']},
            # {'id': 'barcode', 'label': _('Barcode'), 'sortable': True, 'lg': True, 'responsive': ['lg']},
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
        
        search = post.get('search', '')
        domain = post.get('domain')
        if domain and isinstance(domain, str):
            try:
                domain = json.loads(domain)
            except Exception:
                domain = None
        
        # Support for direct product_id filtering
        product_id = post.get('product_id')
        if product_id:
            try:
                p_id = int(product_id)
                if not domain:
                    domain = []
                if not any(isinstance(c, (list, tuple)) and c[0] == 'product_id' for c in domain):
                    domain.append(['product_id', '=', p_id])
            except (ValueError, TypeError):
                pass

        base_domain = self._build_product_domain(search, domain, 'all')
        
        # Aplicar filtros rápidos (como quantity > 0 si está activo)
        active_filter = post.get('quick_filter') or next((f['id'] for f in list_filters if f.get('active')), 'all')
        base_domain = self._apply_quick_filter(base_domain, active_filter)

        # El contexto ya tiene el idioma establecido por _get_admin_layout_values()
        user_lang = request.env.context.get('lang') or 'es_ES'
        
        StockQuant = request.env['stock.quant'].sudo()
        quants = StockQuant.with_context(lang=user_lang).search(base_domain, limit=limit, order='id desc')
        
        
        # Obtener imágenes de productos directamente
        # Cargar placeholder una vez
        placeholder_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            'static', 'img', 'placeholder.png'
        )
        placeholder_base64 = None
        if os.path.exists(placeholder_path):
            with open(placeholder_path, 'rb') as f:
                placeholder_base64 = base64.b64encode(f.read()).decode('utf-8')
        
        product_images = {}
        for quant in quants:
            product = quant.product_id
            # Obtener la imagen del producto (image_1920 hace fallback al template)
            if product.image_1920:
                product_images[quant.id] = product.image_1920
            elif product.product_tmpl_id and product.product_tmpl_id.image_1920:
                product_images[quant.id] = product.product_tmpl_id.image_1920
            elif placeholder_base64:
                # Usar placeholder si no hay imagen
                product_images[quant.id] = placeholder_base64
        
        
        # Renderizar la lista de productos (el contexto ya tiene el idioma establecido)
        qweb = request.env['ir.qweb']
        products_list_html = qweb._render('portal_stock.portal_products_list', {
            'quants': quants,
            'batch_actions': True,
            'product_images': product_images,
            'label_in_stock': _('In Stock'),
            'label_out_of_stock': _('Out of Stock'),
        })
        
        # Preparar datos de paginación inicial
        items_total = StockQuant.search_count(base_domain)
        items_count = len(quants)
        pagination_data = self._get_pagination_data(1, items_total, limit)
        pagination_data.update({'items_total': items_total, 'items_count': items_count})
        
        products_pager_html = qweb._render('portal_stock.portal_stock_pager', {
            'quants': quants,
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
            'search': search,
            'domain_json': json.dumps(domain) if domain else '[]',
            'select2': True,
            'list_filters': list_filters,
            'list_columns': list_columns,  # Añadimos las columnas a renderizar
            'advanced_search': json.dumps(self._get_stock_advanced_search_fields()),
            'tools_actions': [
                {'name': 'import', 'label': _('Import Excel'), 'icon': 'fas fa-file-import', 'color': 'btn-primary', 'modal_id': 'page-stock-import-products-modal'},
            ],
            'batch_actions': [
                {'name': 'export', 'label': _('Export Excel'), 'icon': 'fas fa-file-excel', 'color': 'btn-primary'},
                {'name': 'delete', 'label': _('Delete'), 'icon': 'fas fa-trash-alt', 'color': 'bg-red-600 hover:bg-red-700'},
            ],
            'products_list_html': products_list_html,
            'products_pager_html': products_pager_html,
        })

        return request.render("portal_stock.portal_stock_page", values)

    def _build_product_domain(self, search='', domain=None, match_type='all'):
        """Construye el dominio de búsqueda para quants"""
        import logging
        _logger = logging.getLogger(__name__)
        
        stock_location = request.env.ref('stock.stock_location_stock')
        base_domain = [('location_id', 'child_of', stock_location.id)]
        
        # Check if is_storable is a valid field on product.product in this Odoo version
        Product = request.env['product.product'].sudo()
        if 'is_storable' in Product._fields:
            base_domain.append(('product_id.is_storable', '=', True))
        elif 'type' in Product._fields:
            # Fallback for older Odoo versions (Odoo < 17)
            base_domain.append(('product_id.type', '=', 'product'))
        
        _logger.info(f"Building domain: search='{search}', domain={domain}, match_type={match_type}")

        # Se aplica el filtro de búsqueda por nombre, SKU, código de barras, display_name o atributos
        if search:
            # ilike ya maneja los comodines automáticamente, no necesitamos agregar %
            term = search.strip()
            base_domain.extend(expression.OR([
                [('product_id.name', 'ilike', term)],
                [('product_id.default_code', 'ilike', term)],
                [('product_id.barcode', 'ilike', term)],
                [('product_id.display_name', 'ilike', term)],
                # Buscar en valores de atributos del producto
                [('product_id.product_template_attribute_value_ids.name', 'ilike', term)],
                # Buscar en nombres de atributos
                [('product_id.product_template_attribute_value_ids.attribute_id.name', 'ilike', term)]
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
                        cond = ('quantity', '>', 0)
                        if operator == '!=':
                            cond = ('quantity', '<=', 0)
                    elif val in ['out of stock', 'outofstock', 'out_stock', 'out']:
                        cond = ('quantity', '<=', 0)
                        if operator == '!=':
                            cond = ('quantity', '>', 0)
                    else:
                        # fallback sin condición válida
                        continue
                    adv_conditions.append(cond)
                    adv_condition_domains.append([cond])
                    continue

                # Campo STOCK numérico (quantity)
                if field_key == 'stock':
                    # Normalizar operador: '=' por defecto si 'ilike'
                    if operator == 'ilike':
                        operator = '='
                    try:
                        numeric_value = float(str(raw_value))
                    except (ValueError, TypeError):
                        continue
                    cond = (model_field, operator or '=', numeric_value)
                    adv_conditions.append(cond)
                    adv_condition_domains.append([cond])
                    continue

                # Campos de texto y otros: name, sku, barcode, product_id
                op = (operator or 'ilike').lower()
                
                # If it's an ID field, don't use ilike and keep as int if possible
                if field_key == 'product_id' or model_field.endswith('.id'):
                    try:
                        val = int(raw_value)
                        op = '=' if op == 'ilike' else op
                    except (ValueError, TypeError):
                        val = str(raw_value or '').strip()
                else:
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
        
        _logger.info(f"Final base_domain: {base_domain}")
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

    def _apply_quick_filter(self, base_domain, quick_filter):
        """Aplica filtros rápidos al dominio de búsqueda
        
        Args:
            base_domain: Dominio base de búsqueda
            quick_filter: ID del filtro rápido a aplicar
            
        Returns:
            Dominio modificado con las condiciones del filtro aplicadas
        """
        if not quick_filter or quick_filter == 'all':
            return base_domain
        
        if quick_filter == 'in_stock':
            base_domain.append(('quantity', '>', 0))
        elif quick_filter == 'out_stock':
            base_domain.append(('quantity', '<=', 0))
        
        return base_domain

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
        # Aplicar filtros rápidos
        base_domain = self._apply_quick_filter(base_domain, quick_filter)

        # Configurar ordenamiento
        order_by = 'id desc'
        if sort and sort in self.PRODUCT_FIELDS_MAPPING:
            order_by = f"{self.PRODUCT_FIELDS_MAPPING[sort]} {order}"

        # Obtener productos y contar
        StockQuant = request.env['stock.quant'].sudo()
        # Asegurar que el contexto tenga el idioma del usuario (endpoint JSON, no pasa por _get_admin_layout_values)
        self._ensure_user_lang_context()
        user_lang = request.env.context.get('lang') or 'es_ES'
        quants = StockQuant.with_context(lang=user_lang).search(base_domain, limit=limit, offset=offset, order=order_by)
        items_total = StockQuant.search_count(base_domain)
        items_count = len(quants)

        

        # Obtener imágenes de productos directamente
        # Cargar placeholder una vez
        placeholder_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            'static', 'img', 'placeholder.png'
        )
        placeholder_base64 = None
        if os.path.exists(placeholder_path):
            with open(placeholder_path, 'rb') as f:
                placeholder_base64 = base64.b64encode(f.read()).decode('utf-8')
        
        product_images = {}
        for quant in quants:
            product = quant.product_id
            # Obtener la imagen del producto (image_1920 hace fallback al template)
            if product.image_1920:
                product_images[quant.id] = product.image_1920
            elif product.product_tmpl_id and product.product_tmpl_id.image_1920:
                product_images[quant.id] = product.product_tmpl_id.image_1920
            elif placeholder_base64:
                # Usar placeholder si no hay imagen
                product_images[quant.id] = placeholder_base64

        # Preparar datos de paginación
        pagination_data = self._get_pagination_data(page, items_total, limit)
        pagination_data.update({'items_total': items_total, 'items_count': items_count})


        # El contexto ya tiene el idioma establecido por _ensure_user_lang_context()
        qweb = request.env['ir.qweb']
        return {
            'status': 'success',
            'list': qweb._render('portal_stock.portal_products_list', {
                'quants': quants,
                'batch_actions': True,
                'product_images': product_images,
                'label_in_stock': _('In Stock'),
                'label_out_of_stock': _('Out of Stock'),
            }),
            'pager': qweb._render('portal_stock.portal_stock_pager', {
                'quants': quants,
                'items_label': _('products'),
                **pagination_data
            }),
            'last_page': pagination_data['last_page']
        }

    @http.route('/account/stock/list/advanced_filters', type='json', auth='user')
    def account_stock_list_advanced_filters(self, **kw):
        return {
            'status': 'success',
            'filters': json.dumps(self._get_stock_advanced_search_fields())
        }

    @http.route('/account/stock/image/<int:pid>/<int:width>x<int:height>', type='http', auth='user', methods=['GET'], csrf=False)
    def account_stock_image_action(self, pid, width, height, **kw):
        """Obtiene y sirve la imagen del producto con el tamaño especificado.
        
        Usa image_1920 (imagen de mayor resolución) y la redimensiona según width/height.
        Si el producto no tiene imagen, muestra un placeholder.
        """
        import logging
        _logger = logging.getLogger(__name__)
        
        # Forzar que se ejecute el logging
        print("=" * 50)
        print(f"[DEBUG] account_stock_image_action CALLED!")
        print(f"[DEBUG] pid={pid}, width={width}, height={height}")
        print(f"[DEBUG] Request URL: {request.httprequest.url if request else 'NO REQUEST'}")
        print(f"[DEBUG] Request path: {request.httprequest.path if request else 'NO REQUEST'}")
        print("=" * 50)
        
        _logger.info(f"account_stock_image_action called: pid={pid}, width={width}, height={height}")
        
        field = 'image_1920'  # Usar la imagen de mayor resolución
        crop = True
        download = False
        unique = True
        nocache = False

        try:
            ProductProducts = request.env['product.product'].sudo()
            product = ProductProducts.browse(pid)
            
            _logger.info(f"Product browsed: {product.id if product.exists() else 'NOT FOUND'}")
            print(f"[DEBUG] Product browsed: {product.id if product.exists() else 'NOT FOUND'}")
            
            # Verificar que el producto existe
            if not product.exists():
                raise ValueError("Product not found")
            
            # Verificar si el producto tiene imagen (verificar tanto en variante como en template)
            has_image = False
            if product.image_variant_1920:
                has_image = True
                print(f"[DEBUG] Product has variant image")
            elif product.product_tmpl_id and product.product_tmpl_id.image_1920:
                has_image = True
                print(f"[DEBUG] Product has template image")
            else:
                print(f"[DEBUG] Product has NO image (variant: {bool(product.image_variant_1920)}, template: {bool(product.product_tmpl_id.image_1920 if product.product_tmpl_id else False)})")
            
            # Obtener la imagen del producto (usa image_1920 que hace fallback al template si no hay variante)
            print(f"[DEBUG] Getting image stream for product {pid}, field={field}, size={width}x{height}")
            stream = request.env['ir.binary']._get_image_stream_from(
                product, field, width=int(width), height=int(height), crop=crop
            )
            print(f"[DEBUG] Image stream obtained: type={stream.type if stream else 'None'}, size={stream.size if stream else 'None'}")
            
            # Si el stream está vacío o no tiene datos, usar placeholder
            if not stream or stream.size == 0:
                print(f"[DEBUG] Stream is empty, using placeholder")
                raise ValueError("Image stream is empty")
            
            if request.httprequest.args.get('access_token'):
                stream.public = True
        except Exception as exc:
            _logger.error(f"Error getting product image: {exc}", exc_info=True)
            print(f"[DEBUG] Error getting product image: {exc}")
            import traceback
            print(f"[DEBUG] Traceback: {traceback.format_exc()}")
            if download:
                raise request.not_found() from exc
            # Fallback to placeholder
            print(f"[DEBUG] Using placeholder image")
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

        print(f"[DEBUG] Returning stream response: {stream}")
        return stream.get_response(**send_file_kwargs)

    @http.route('/account/stock/delete/product', type='json', auth='user')
    def account_stock_delete_product(self, product_id=None, **kw):
        """Archive a single product variant owned by the current account partner.

        Uses sudo.
        Archives the product instead of deleting it (sets active=False).
        """
        try:
            if not product_id:
                return {'status': 'error', 'message': _('Missing quant identifier')}

            Quant = request.env['stock.quant'].sudo()
            quant = Quant.browse(int(product_id))

            if not quant.exists():
                return {'status': 'error', 'message': _('Quant not found')}

            product = quant.product_id
            # Archive product instead of deleting (set active=False)
            product.write({'active': False})
            return {'status': 'success', 'message': _('Product archived successfully')}
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

    @http.route('/account/stock/delete/products', type='json', auth='user')
    def account_stock_delete_products(self, product_ids=None, **kw):
        """Batch archive multiple product variants owned by the current account partner.
        
        Archives the products instead of deleting them (sets active=False).
        """
        try:
            ids_param = product_ids or kw.get('ids') or kw.get('products')
            if not ids_param:
                return {'status': 'error', 'message': _('No items selected')}

            # Allow both list and comma-separated string
            if isinstance(ids_param, str):
                ids = [int(x) for x in ids_param.split(',') if x.strip().isdigit()]
            elif isinstance(ids_param, (list, tuple)):
                ids = [int(x) for x in ids_param]
            else:
                return {'status': 'error', 'message': _('Invalid items payload')}

            if not ids:
                return {'status': 'error', 'message': _('No valid items to delete')}

            Quant = request.env['stock.quant'].sudo()
            quants = Quant.search([
                ('id', 'in', ids),
            ])

            if not quants:
                return {'status': 'error', 'message': _('No permitted items found for archiving')}

            products = quants.mapped('product_id')
            count = len(products)
            # Archive products instead of deleting (set active=False)
            products.write({'active': False})
            return {
                'status': 'success',
                'message': _(f'{count} product(s) archived successfully'),
                'archived_count': count,
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
        
        StockQuant = request.env['stock.quant'].sudo()
        stock_location = request.env.ref('stock.stock_location_stock')
        domain = [('location_id', 'child_of', stock_location.id), ('quantity', '>', 0)]
        
        if ids:
            try:
                id_list = [int(i) for i in ids.split(',') if i.strip()]
                if id_list:
                    domain.append(('id', 'in', id_list))
            except ValueError:
                pass
        
        quants = StockQuant.search(domain, order='location_id, product_id')

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
        worksheet.set_column(3, 3, 20)  # Location
        worksheet.set_column(4, 4, 12)  # Quantity
        worksheet.set_column(5, 5, 12)  # Status
        
        # Headers
        headers = [
            _('Name'),
            _('SKU'),
            _('Barcode'),
            _('Location'),
            _('Quantity'),
            _('Status'),
        ]
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)
        
        # Data rows
        for row, quant in enumerate(quants, start=1):
            status = _('In Stock') if quant.quantity > 0 else _('Out of Stock')
            product = quant.product_id
            
            worksheet.write(row, 0, product.name or '', cell_format)
            worksheet.write(row, 1, product.default_code or '', cell_format)
            worksheet.write(row, 2, product.barcode or '', cell_format)
            worksheet.write(row, 3, quant.location_id.display_name or '', cell_format)
            worksheet.write(row, 4, quant.quantity or 0, number_format)
            worksheet.write(row, 5, status, cell_format)
        
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