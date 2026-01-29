import math
import json
import base64
import os
from functools import lru_cache

from odoo import http, _
from odoo.addons.portal_admin_theme.controllers.admin import PortalAdminController
from odoo.http import request
from odoo.osv import expression


class PortalLotsController(PortalAdminController):
    # Constantes de configuración
    LOT_FIELDS_MAPPING = {
        'name': 'product_id.name',
        'lot_serial': 'name',
        'state': 'lifecycle_state',
        'location': 'location_id.complete_name',
        'image': 'product_id.image_128',  # No ordenable, solo para referencia
        'quantity': 'product_qty',
    }

    DEFAULT_LIMIT_PARAM = 'portal_stock.page_list_default_limit'
    DEFAULT_LIMIT_VALUE = '100'

    @lru_cache(maxsize=1)
    def _get_lots_advanced_search_fields(self):
        """Devuelve la configuración de campos para búsqueda avanzada de lotes"""
        return [
            {'id': 'name', 'label': _('Lot/Serial Number'), 'type': 'text'},
            {'id': 'ref', 'label': _('Internal Reference'), 'type': 'text'},
            {'id': 'product', 'label': _('Product'), 'type': 'text'},
            {'id': 'quantity', 'label': _('Quantity'), 'type': 'number'},
            {'id': 'location', 'label': _('Location'), 'type': 'text'},
            {
                'id': 'status',
                'label': _('Status'),
                'type': 'select',
                'options': [
                    {'id': 'available', 'label': _('Available')},
                    {'id': 'unavailable', 'label': _('Unavailable')}
                ]
            },
        ]

    def _get_lots_domain(self, product_id=None):
        """Obtiene el dominio base para lotes basado en el partner del usuario
        
        Args:
            product_id: ID del producto (puede ser string o int)
        """
        partner_id = request.env.user.partner_id
        account_partner = request.env['account.partner'].sudo().search([
            ('partner_id', '=', partner_id.commercial_partner_id.id)
        ], limit=1)
        
        if not account_partner:
            return expression.FALSE_DOMAIN
        
        # Obtener productos del account_partner
        products = request.env['product.product'].sudo().search([
            ('is_storable', '=', True),
            ('account_partner_id', '=', account_partner.id)
        ])
        
        if not products:
            return expression.FALSE_DOMAIN
        
        base_domain = [('product_id', 'in', products.ids)]
        
        # Filtrar por producto específico si se proporciona
        # Convertir a int para comparación correcta con products.ids
        if product_id:
            try:
                product_id_int = int(product_id)
                if product_id_int in products.ids:
                    base_domain = [('product_id', '=', product_id_int)]
            except (ValueError, TypeError):
                pass
        
        return base_domain

    def _build_lot_domain(self, search='', domain=None, match_type='all', product_id=None):
        """Construye el dominio de búsqueda para lotes"""
        base_domain = self._get_lots_domain(product_id)

        # Se aplica el filtro de búsqueda por nombre, referencia o producto
        if search:
            term = f"%{search}%"
            base_domain.extend(expression.OR([
                [('name', 'ilike', term)],
                [('ref', 'ilike', term)],
                [('product_id.name', 'ilike', term)],
                [('product_id.default_code', 'ilike', term)],
            ]))

        # Aplicar dominio de búsqueda avanzada
        if domain and isinstance(domain, list) and domain:
            adv_conditions = []
            adv_condition_domains = []

            for condition in domain:
                if not isinstance(condition, (list, tuple)) or len(condition) != 3:
                    continue

                field_key, operator, raw_value = condition
                if field_key not in self.LOT_FIELDS_MAPPING:
                    continue

                model_field = self.LOT_FIELDS_MAPPING[field_key]

                # Campo STATUS como select
                if field_key == 'status':
                    val = str(raw_value or '').strip().lower()
                    operator = operator or '='
                    if val in ['available', 'avail']:
                        cond = ('product_qty', '>', 0)
                        if operator == '!=':
                            cond = ('product_qty', '<=', 0)
                    elif val in ['unavailable', 'unavail']:
                        cond = ('product_qty', '<=', 0)
                        if operator == '!=':
                            cond = ('product_qty', '>', 0)
                    else:
                        continue
                    adv_conditions.append(cond)
                    adv_condition_domains.append([cond])
                    continue

                # Campo QUANTITY numérico
                if field_key == 'quantity':
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

                # Campos de texto: name, ref, product
                op = (operator or 'ilike').lower()
                val = str(raw_value or '').strip()
                if op in ('ilike', 'not ilike'):
                    val = f"%{val}%"
                
                # Para campos relacionados, usar el campo completo
                if field_key == 'product':
                    cond = expression.OR([
                        [('product_id.name', op, val)],
                        [('product_id.default_code', op, val)],
                    ])
                else:
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

    def _get_lots_repair_status(self, lots, account_partner):
        """
        Obtiene el estado de reparación de los lotes desde quality.alert.
        
        Args:
            lots: recordset de stock.lot
            account_partner: account.partner del usuario
            
        Returns:
            dict {lot_id: {'stage_name': str, 'maintenance_type': str} or None}
        """
        if not lots or not account_partner:
            return {lot.id: None for lot in lots}
        
        QualityAlert = request.env['quality.alert'].sudo()
        
        # Buscar alertas activas para estos lotes
        alerts = QualityAlert.search([
            ('lot_id', 'in', lots.ids),
            ('account_partner_id', '=', account_partner.id),
        ])
        
        # Crear diccionario con el estado más reciente de cada lote
        lots_repair_status = {lot.id: None for lot in lots}
        
        for alert in alerts:
            if alert.lot_id:
                # Si ya hay un estado, solo sobrescribir si este es más reciente
                current = lots_repair_status.get(alert.lot_id.id)
                if current is None or alert.id > current.get('alert_id', 0):
                    lots_repair_status[alert.lot_id.id] = {
                        'alert_id': alert.id,
                        'stage_name': alert.stage_id.name if alert.stage_id else '',
                        'maintenance_type': alert.maintenance_type or '',
                    }
        
        return lots_repair_status

    def _get_pagination_data(self, page, items_total, limit):
        """Calcula datos de paginación"""
        first_page = 1
        last_page = math.ceil(items_total / limit) if limit > 0 else 1
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

    @http.route('/account/stock/lots', type='http', auth="user", website=True)
    def account_lots_action(self, product_id=None, **post):
        """Página principal de lotes"""
        StockLot = request.env['stock.lot'].sudo()
        
        # Obtener account_partner del usuario
        partner_id = request.env.user.partner_id
        account_partner = request.env['account.partner'].sudo().search([
            ('partner_id', '=', partner_id.commercial_partner_id.id)
        ], limit=1)
        
        # Obtener producto si se especifica
        product = None
        if product_id:
            try:
                product_id = int(product_id)
                if account_partner:
                    products = request.env['product.product'].sudo().search([
                        ('is_storable', '=', True),
                        ('account_partner_id', '=', account_partner.id),
                        ('id', '=', product_id)
                    ], limit=1)
                    if products:
                        product = products[0]
            except (ValueError, TypeError):
                pass

        values = self._get_admin_layout_values()

        # Definimos la lista de filtros
        list_filters = [
            {
                'id': 'all',
                'label': _('All'),
                'icon': 'fas fa-check-circle',
                'active': True,
            },
            # {
            #     'id': 'available',
            #     'label': _('Available'),
            #     'icon': 'fas fa-check',
            # },
            # {
            #     'id': 'unavailable',
            #     'label': _('Unavailable'),
            #     'icon': 'fas fa-times'
            # }
        ]

        # Se obtiene el filtro activo
        active_filter = next((filter['id'] for filter in list_filters if filter.get('active')), 'all')

        # Definir las columnas de la lista
        list_columns = [
            {'id': 'image', 'label': _('Image'), 'sortable': False, 'responsive': ['sm', 'md', 'lg']},
            {'id': 'name', 'label': _('Name'), 'sortable': True, 'responsive': ['sm', 'md', 'lg']},
            {'id': 'lot_serial', 'label': _('Lot/Serial Number'), 'sortable': True, 'responsive': ['lg']},
            {'id': 'repair_status', 'label': _('Repair'), 'sortable': False, 'responsive': ['lg']},
            {'id': 'state', 'label': _('Estado'), 'sortable': True, 'responsive': ['lg']},
            {'id': 'location', 'label': _('Location'), 'sortable': True, 'responsive': ['md', 'lg']},
            {'id': 'quantity', 'label': _('Quantity'), 'sortable': True, 'responsive': ['md', 'lg']},
            {'id': 'actions', 'label': _('Actions'), 'sortable': False, 'right': True, 'responsive': ['sm', 'md', 'lg']}
        ]
        
        # Procesar columnas para añadir flags de visibilidad según responsive
        for column in list_columns:
            responsive = column.get('responsive', [])
            column['show_in_sm'] = 'sm' in responsive
            column['show_in_md'] = 'md' in responsive
            column['show_in_lg'] = 'lg' in responsive

        # Actualiza los valores con los filtros y el filtro activo
        values.update({
            'active_filter': active_filter,
            'page_name': 'lots',
            'product': product,
            'product_id': product_id,
            'page_title': _('Lots/Serials'),
            'page_url': '/account/stock/lots',
            'select2': True,
            'list_filters': list_filters,
            'list_columns': list_columns,
            'advanced_search': json.dumps(self._get_lots_advanced_search_fields()),
            'batch_actions': [
                {'name': 'delete', 'label': _('Delete'), 'icon': 'fas fa-trash-alt'}
            ]
        })

        # Cargar lotes iniciales para mostrar en la página
        base_domain = self._get_lots_domain(product_id)
        StockLot = request.env['stock.lot'].sudo()
        lots = StockLot.search(base_domain, limit=100, order='id desc')
        
        # Obtener estados de reparación de los lotes
        lots_repair_status = self._get_lots_repair_status(lots, account_partner)
        
        # Obtener imágenes de productos para cada lote
        # Cargar placeholder una vez
        placeholder_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            'static', 'img', 'placeholder.png'
        )
        placeholder_base64 = None
        if os.path.exists(placeholder_path):
            with open(placeholder_path, 'rb') as f:
                placeholder_base64 = base64.b64encode(f.read()).decode('utf-8')
        
        lot_images = {}
        for lot in lots:
            if lot.product_id:
                # Obtener la imagen del producto (image_1920 hace fallback al template)
                product = lot.product_id
                if product.image_1920:
                    lot_images[product.id] = product.image_1920
                elif product.product_tmpl_id and product.product_tmpl_id.image_1920:
                    lot_images[product.id] = product.product_tmpl_id.image_1920
                elif placeholder_base64:
                    # Usar placeholder si no hay imagen
                    lot_images[product.id] = placeholder_base64
        
        # Renderizar la lista de lotes
        qweb = request.env['ir.qweb']
        lots_list_html = qweb._render('portal_stock.portal_lots_list', {
            'lot_images': lot_images,
            'lots': lots,
            'batch_actions': True,
            'lots_repair_status': lots_repair_status,
            'label_repair': _('Repair'),
            'label_review': _('Review'),
        })
        
        # Preparar datos de paginación inicial
        items_total = StockLot.search_count(base_domain)
        items_count = len(lots)
        pagination_data = self._get_pagination_data(1, items_total, 100)
        pagination_data.update({'items_total': items_total, 'items_count': items_count})
        
        lots_pager_html = qweb._render('portal_stock.portal_lot_pager', {
            'lots': lots,
            'items_label': _('lots'),
            **pagination_data
        })
        
        values.update({
            'lots_list_html': lots_list_html,
            'lots_pager_html': lots_pager_html,
        })
        
        # Usar el mismo template de stock pero adaptado para lotes
        return request.render("portal_stock.portal_stock_page", values)

    @http.route('/account/stock/lots/reload', type='json', auth='user')
    def account_lots_list_reload(self, page=1, search='', domain=None, match_type='all', 
                                  sort=None, order='asc', quick_filter=None, product_id=None, **kw):
        """Recarga la lista de lotes"""
        SysParams = request.env['ir.config_parameter'].sudo()
        limit = int(SysParams.get_param(self.DEFAULT_LIMIT_PARAM, self.DEFAULT_LIMIT_VALUE))
        offset = (page - 1) * limit

        # Obtener el filtro activo por defecto si no se especifica uno
        if not quick_filter:
            quick_filter = 'all'

        # Construir dominio de búsqueda
        base_domain = self._build_lot_domain(search, domain, match_type, product_id)
        
        # Apply quick filters
        # if quick_filter and quick_filter != 'all':
        #     if quick_filter == 'available':
        #         base_domain.append(('product_qty', '>', 0))
        #     elif quick_filter == 'unavailable':
        #         base_domain.append(('product_qty', '<=', 0))

        # Configurar ordenamiento
        order_by = 'id desc'
        if sort and sort in self.LOT_FIELDS_MAPPING:
            field = self.LOT_FIELDS_MAPPING[sort]
            # Para campos relacionados, usar la sintaxis correcta
            if '.' in field and sort != 'image':  # image no es ordenable
                order_by = f"{field} {order}"
            elif sort != 'image':
                order_by = f"{field} {order}"

        # Obtener lotes y contar
        StockLot = request.env['stock.lot'].sudo()
        lots = StockLot.search(base_domain, limit=limit, offset=offset, order=order_by)
        items_total = StockLot.search_count(base_domain)
        items_count = len(lots)
        
        # Obtener account_partner para los estados de reparación
        partner_id = request.env.user.partner_id
        account_partner = request.env['account.partner'].sudo().search([
            ('partner_id', '=', partner_id.commercial_partner_id.id)
        ], limit=1)
        
        # Obtener estados de reparación de los lotes
        lots_repair_status = self._get_lots_repair_status(lots, account_partner)

        # Obtener imágenes de productos para cada lote
        # Cargar placeholder una vez
        placeholder_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            'static', 'img', 'placeholder.png'
        )
        placeholder_base64 = None
        if os.path.exists(placeholder_path):
            with open(placeholder_path, 'rb') as f:
                placeholder_base64 = base64.b64encode(f.read()).decode('utf-8')
        
        lot_images = {}
        for lot in lots:
            if lot.product_id:
                # Obtener la imagen del producto (image_1920 hace fallback al template)
                product = lot.product_id
                if product.image_1920:
                    lot_images[product.id] = product.image_1920
                elif product.product_tmpl_id and product.product_tmpl_id.image_1920:
                    lot_images[product.id] = product.product_tmpl_id.image_1920
                elif placeholder_base64:
                    # Usar placeholder si no hay imagen
                    lot_images[product.id] = placeholder_base64

        # Preparar datos de paginación
        pagination_data = self._get_pagination_data(page, items_total, limit)
        pagination_data.update({'items_total': items_total, 'items_count': items_count})

        qweb = request.env['ir.qweb']
        return {
            'status': 'success',
            'list': qweb._render('portal_stock.portal_lots_list', {
                'lots': lots,
                'batch_actions': True,
                'lots_repair_status': lots_repair_status,
                'lot_images': lot_images,
                'label_repair': _('Repair'),
                'label_review': _('Review'),
            }),
            'pager': qweb._render('portal_stock.portal_lot_pager', {
                'lots': lots,
                'items_label': _('lots'),
                **pagination_data
            }),
            'last_page': pagination_data['last_page']
        }

    @http.route('/account/stock/lots/advanced_filters', type='json', auth='user')
    def account_lots_advanced_filters(self, **kw):
        """Returns advanced search filter configuration for lots"""
        return {
            'status': 'success',
            'filters': json.dumps(self._get_lots_advanced_search_fields())
        }

    @http.route('/account/stock/lots/details/<int:lot_id>', type='http', auth="user", website=True)
    def account_lots_details_action(self, lot_id, **post):
        """Vista de detalles de un lote"""
        try:
            StockLot = request.env['stock.lot'].sudo()
            
            # Verificar que el lote pertenece a un producto del account_partner
            partner = request.env.user.partner_id
            account_partner = request.env['account.partner'].sudo().search([
                ('partner_id', '=', partner.commercial_partner_id.id)
            ], limit=1)
            
            if not account_partner:
                return request.redirect('/account/stock/lots')
            
            products = request.env['product.product'].sudo().search([
                ('is_storable', '=', True),
                ('account_partner_id', '=', account_partner.id)
            ])
            
            if not products:
                return request.redirect('/account/stock/lots')
            
            # Buscar el lote
            lot = StockLot.search([
                ('id', '=', lot_id),
                ('product_id', 'in', products.ids)
            ], limit=1)
            
            if not lot:
                return request.redirect('/account/stock/lots')
            
            # Asegurar que el lote existe y está accesible
            lot.ensure_one()
            
            # Obtener historial de alertas de calidad (reparaciones/revisiones) del lote
            QualityAlert = request.env['quality.alert'].sudo()
            lot_alerts = QualityAlert.search([
                ('lot_id', '=', lot.id),
                ('account_partner_id', '=', account_partner.id),
            ], order='create_date desc')
            
            values = self._get_admin_layout_values()
            values.update({
                'page_name': 'lot_details',
                'lot': lot,
                'lot_alerts': lot_alerts,
                'page_title': _('Lot Details'),
                'page_url': '/account/stock/lots/details/%s' % lot_id,
                'label_repair': _('Repair'),
                'label_review': _('Review'),
            })
            
            return request.render("portal_stock.portal_lot_details_page", values)
        except Exception as e:
            import traceback
            import logging
            _logger = logging.getLogger(__name__)
            _logger.error("Error in account_lots_details_action: %s\n%s", str(e), traceback.format_exc())
            return request.redirect('/account/stock/lots')

    @http.route('/portal_stock/lot/details/chatter/fetch', type='json', auth='public', website=True)
    def portal_lot_details_chatter_fetch(self, lot_id=None, limit=10, after=None, before=None, **kw):
        """Obtiene los mensajes del chatter para un lote"""
        if not lot_id:
            return {
                'data': {'mail.message': []},
                'status': 'success'
            }

        # Verificar acceso al lote
        partner = request.env.user.partner_id
        account_partner = request.env['account.partner'].sudo().search([
            ('partner_id', '=', partner.commercial_partner_id.id)
        ], limit=1)
        
        if not account_partner:
            return {
                'data': {'mail.message': []},
                'status': 'error',
                'message': 'Access denied'
            }
        
        products = request.env['product.product'].sudo().search([
            ('is_storable', '=', True),
            ('account_partner_id', '=', account_partner.id)
        ])
        
        StockLot = request.env['stock.lot'].sudo()
        lot = StockLot.search([
            ('id', '=', int(lot_id)),
            ('product_id', 'in', products.ids)
        ], limit=1)
        
        if not lot:
            return {
                'data': {'mail.message': []},
                'status': 'error',
                'message': 'Access denied'
            }

        # Dominio para buscar mensajes
        Message = request.env['mail.message']
        domain = [
            ('res_id', '=', int(lot_id)),
            ('model', '=', 'stock.lot'),
            ('subtype_id', '=', request.env.ref('mail.mt_comment').id),
            '|',
            ('body', '!=', ''),
            ('attachment_ids', '!=', False)
        ]

        # Los usuarios no internos solo ven mensajes no internos
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

    @http.route('/portal_stock/lot/details/chatter/post', type='http', auth="user", methods=['POST'])
    def portal_lot_details_chatter_post(self, lot_id, access_token=None, **post):
        """Publica un mensaje en el chatter de un lote"""
        import json
        from odoo.exceptions import AccessError
        
        if not str(lot_id).isdigit():
            return json.dumps({'status': 'error', 'message': 'Invalid lot ID'})

        # Verificar acceso al lote
        partner = request.env.user.partner_id
        account_partner = request.env['account.partner'].sudo().search([
            ('partner_id', '=', partner.commercial_partner_id.id)
        ], limit=1)
        
        if not account_partner:
            return json.dumps({'status': 'error', 'message': 'Access denied'})
        
        products = request.env['product.product'].sudo().search([
            ('is_storable', '=', True),
            ('account_partner_id', '=', account_partner.id)
        ])
        
        StockLot = request.env['stock.lot'].sudo()
        lot = StockLot.search([
            ('id', '=', int(lot_id)),
            ('product_id', 'in', products.ids)
        ], limit=1)
        
        if not lot:
            return json.dumps({'status': 'error', 'message': 'Access denied'})

        # Procesar adjunto si se proporciona
        attachment_id = False
        attachment_data = post.get('attachment')
        if attachment_data and hasattr(attachment_data, 'filename'):
            ufile = attachment_data
            if ufile:
                # Crear adjunto
                vals = {
                    "name": ufile.filename,
                    "raw": ufile.read(),
                    "res_id": int(lot_id),
                    "res_model": 'stock.lot',
                }

                if request.env.user.share:
                    # Generar token de acceso para usuarios compartidos
                    vals["access_token"] = request.env["ir.attachment"]._generate_access_token()

                try:
                    attachment = request.env["ir.attachment"].sudo().create(vals)
                    attachment_id = attachment.id
                except AccessError:
                    return json.dumps({"status": "error", "message": _("You are not allowed to upload an attachment here.")})

        # Publicar mensaje
        message_content = post.get('message', '')
        attachment_ids = [attachment_id] if attachment_id else []

        try:
            message = lot.sudo().with_user(request.env.user).message_post(
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

    @http.route('/account/stock/lots/get', type='json', auth='user')
    def account_lots_get(self, lot_id=None, **kw):
        """Obtiene los datos de un lote específico"""
        try:
            if not lot_id:
                return {'status': 'error', 'message': _('Missing lot identifier')}

            StockLot = request.env['stock.lot'].sudo()
            lot = StockLot.browse(int(lot_id))
            
            if not lot.exists():
                return {'status': 'error', 'message': _('Lot not found')}

            # Verificar que el lote pertenece a un producto del account_partner
            partner = request.env.user.partner_id
            account_partner = request.env['account.partner'].sudo().search([
                ('partner_id', '=', partner.commercial_partner_id.id)
            ], limit=1)
            
            if account_partner:
                products = request.env['product.product'].sudo().search([
                    ('is_storable', '=', True),
                    ('account_partner_id', '=', account_partner.id)
                ])
                if lot.product_id.id not in products.ids:
                    return {'status': 'error', 'message': _('You do not have access to this lot')}

            return {
                'status': 'success',
                'lot': {
                    'id': lot.id,
                    'name': lot.name,
                    'ref': lot.ref or '',
                    'product_id': lot.product_id.id,
                    'product_name': lot.product_id.name,
                    'product_qty': lot.product_qty,
                    'location_id': lot.location_id.id if lot.location_id else None,
                    'location_name': lot.location_id.complete_name if lot.location_id else '',
                }
            }
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

    @http.route('/account/stock/lots/delete', type='json', auth='user')
    def account_lots_delete(self, lot_id=None, **kw):
        """Elimina un lote"""
        try:
            if not lot_id:
                return {'status': 'error', 'message': _('Missing lot identifier')}

            StockLot = request.env['stock.lot'].sudo()
            lot = StockLot.browse(int(lot_id))

            if not lot.exists():
                return {'status': 'error', 'message': _('Lot not found')}

            # Verificar que el lote pertenece a un producto del account_partner
            partner = request.env.user.partner_id
            account_partner = request.env['account.partner'].sudo().search([
                ('partner_id', '=', partner.commercial_partner_id.id)
            ], limit=1)
            
            if account_partner:
                products = request.env['product.product'].sudo().search([
                    ('is_storable', '=', True),
                    ('account_partner_id', '=', account_partner.id)
                ])
                if lot.product_id.id not in products.ids:
                    return {'status': 'error', 'message': _('You do not have access to this lot')}

            # Intentar eliminar
            lot.unlink()
            return {'status': 'success', 'message': _('Lot deleted successfully')}
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

    @http.route('/account/stock/lots/delete/batch', type='json', auth='user')
    def account_lots_delete_batch(self, lot_ids=None, **kw):
        """Eliminación masiva de lotes"""
        try:
            ids_param = lot_ids or kw.get('ids') or kw.get('lots')
            if not ids_param:
                return {'status': 'error', 'message': _('No lots selected')}

            # Permitir tanto lista como string separado por comas
            if isinstance(ids_param, str):
                ids = [int(x) for x in ids_param.split(',') if x.strip().isdigit()]
            elif isinstance(ids_param, (list, tuple)):
                ids = [int(x) for x in ids_param]
            else:
                return {'status': 'error', 'message': _('Invalid lots payload')}

            if not ids:
                return {'status': 'error', 'message': _('No valid lots to delete')}

            partner = request.env.user.partner_id
            account_partner = request.env['account.partner'].sudo().search([
                ('partner_id', '=', partner.commercial_partner_id.id)
            ], limit=1)

            if not account_partner:
                return {'status': 'error', 'message': _('Account partner not found')}

            # Obtener productos del account_partner
            products = request.env['product.product'].sudo().search([
                ('is_storable', '=', True),
                ('account_partner_id', '=', account_partner.id)
            ])

            if not products:
                return {'status': 'error', 'message': _('No products found')}

            StockLot = request.env['stock.lot'].sudo()
            lots = StockLot.search([
                ('id', 'in', ids),
                ('product_id', 'in', products.ids)
            ])

            if not lots:
                return {'status': 'error', 'message': _('No permitted lots found for deletion')}

            count = len(lots)
            lots.unlink()
            return {
                'status': 'success',
                'message': _(f'{count} lot(s) deleted successfully'),
                'deleted_count': count,
            }
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

