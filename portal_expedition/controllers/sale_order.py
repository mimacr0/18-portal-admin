##############################################################################
#
# Copyright 2025 DaFe Solutions
#
##############################################################################

import json
from functools import lru_cache

from odoo import http, _
from odoo.addons.portal_admin_theme.controllers.admin import PortalAdminController
from odoo.http import request
from odoo.osv import expression
from datetime import datetime
##############################################################################

class PortalExpeditionController(PortalAdminController):
    # Constantes de configuración
    EXPEDITION_FIELDS_MAPPING = {               
        'name': 'name',
        'tracking_ref': 'picking_ids.carrier_tracking_ref',
        'date_order': 'date_order',
        'date_done': 'picking_ids.date_done',
        'sale_state': 'state',
    }

    DEFAULT_LIMIT_PARAM = 'portal_expedition.page_list_default_limit'
    DEFAULT_LIMIT_VALUE = '100'

    def _get_admin_layout_menus(self):
        menus = super()._get_admin_layout_menus()
        menus.append({
            'name': _('Expeditions'),
            'url': '/account/expedition',
            'icon': 'fas fa-truck',
            'order': 40
        })
        return menus

    @lru_cache(maxsize=1)
    def _get_expedition_advanced_search_fields(self):
        """Devuelve la configuración de campos para búsqueda avanzada"""
        PackageType = request.env['stock.package.type'].sudo()
        package_type_options = [
            {'id': pt.id, 'label': pt.name}
            for pt in PackageType.search([], limit=10)
        ]

        return [
            {'id': 'name', 'label': _('Name'), 'type': 'text'},
            {'id': 'tracking_ref', 'label': _('Tracking Ref'), 'type': 'text'},
            {'id': 'date_order', 'label': _('Order Date'), 'type': 'date'},
            {'id': 'date_done', 'label': _('Done Date'), 'type': 'date'},
            {'id': 'sale_state', 'label': _('Sale State'), 'type': 'select', 'options': [
                {'id': 'draft', 'label': _('Quotation')},
                {'id': 'sent', 'label': _('Quotation Sent')},
                {'id': 'sale', 'label': _('Sales Order')},
                {'id': 'cancel', 'label': _('Cancelled')},
            ]}
        ]
    @http.route('/account/expedition', type='http', auth="user", website=True)
    def account_expedition_action(self, **post):
        SaleOrder = request.env['sale.order'].sudo()

        # Usamos el método auxiliar para obtener el dominio según account.partner
        domain = self._get_account_partner_domain()

        orders = SaleOrder.search(domain)

        values = self._get_admin_layout_values()
        # Configuración de la interfaz
        values.update({
            'page_name': 'expedition',
            'orders': orders,
            'page_title': _('Expeditions'),
            'page_url': '/account/expedition',
            'list_filters': [
                {'id': 'all', 'label': _('All'), 'icon': 'fas fa-check-circle', 'active': True},
                {'id': 'draft', 'label': _('Draft'), 'icon': 'fas fa-file'},
                {'id': 'billing', 'label': _('Billing'), 'icon': 'fas fa-file-text'},
                {'id': 'preparing', 'label': _('Preparing'), 'icon': 'fas fa-cart-arrow-down'},
                {'id': 'to-be-shipped', 'label': _('To be Shipped'), 'icon': 'fas fa-inbox'},
                {'id': 'shipped', 'label': _('Shipped'), 'icon': 'fas fa-truck'},
                {'id': 'cancel', 'label': _('Cancelled'), 'icon': 'fas fa-stop-circle'},
            ],

            'list_columns': [
                {'id': 'name', 'label': _('Name'), 'sortable': True, 'responsive': ['sm', 'md', 'lg']},
                {'id': 'product_info', 'label': _('Products Information'), 'sortable': False, 'md': True, 'responsive': ['lg']},
                {'id': 'total_info', 'label': _('Total Information'), 'sortable': False, 'md': True, 'responsive': ['lg']},
                {'id': 'tracking_info', 'label': _('Tracking Information'), 'sortable': False, 'md': True, 'responsive': ['md', 'lg']},
                {'id': 'traceability_info', 'label': _('Traceability Information'), 'sortable': False, 'md': True, 'responsive': ['md', 'lg']},
                {'id': 'states_info', 'label': _('States'), 'sortable': False, 'md': True, 'responsive': ['md', 'lg']},
                {'id': 'actions', 'label': _('Actions'), 'sortable': False, 'right': True, 'responsive': ['sm', 'md', 'lg']}
            ],
            'tools_actions': [
            ],
            'batch_actions': [
                {'name': 'delete', 'label': _('Delete'), 'icon': 'fas fa-trash-alt'}
            ],
            'advanced_search': json.dumps(self._get_expedition_advanced_search_fields())
        })
        
        # Procesar columnas para añadir flags de visibilidad según responsive
        list_columns = values.get('list_columns', [])
        for column in list_columns:
            responsive = column.get('responsive', [])
            column['show_in_sm'] = 'sm' in responsive
            column['show_in_md'] = 'md' in responsive
            column['show_in_lg'] = 'lg' in responsive
        values['list_columns'] = list_columns

        return request.render("portal_expedition.portal_expedition_page", values)


    def _get_pagination_data(self, page, items_total, limit):
        """Calcula datos de paginación"""
        import math
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

    def _build_sale_domain(self, search='', domain=None, match_type='all', quick_filter=None):
        """Construye el dominio de búsqueda para productos"""
        
        base_domain = self._get_account_partner_domain(domain)

        # Integrar el dominio pasado como argumento
        if domain:
            base_domain = expression.AND([base_domain, domain])

        if quick_filter and quick_filter != 'all':
            base_domain.extend(self.get_quick_filter_domain(quick_filter, request.env))
        # Aplicar búsqueda de texto
        if search:
            base_domain.extend(expression.OR([
                [('name', 'ilike', search)],
                [('picking_ids.carrier_tracking_ref', 'ilike', search)],
            ]))

        # Aplicar dominio de búsqueda avanzada
        if domain:
            base_domain = self._apply_order_advanced_domain(base_domain, domain, match_type)
    
        return base_domain

    def _apply_order_advanced_domain(self, base_domain, domain, match_type='all'):
        """
        Construye y combina condiciones avanzadas para el dominio.
        """
        adv_conditions = []
        adv_condition_domains = []

        def _date_bounds_utc(date_str):
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
            model_field = self.EXPEDITION_FIELDS_MAPPING[field_key]

            if field_key in ['date_order', 'date_done']:
                if operator == '=':
                    start_utc, end_utc = _date_bounds_utc(str(raw_value))
                    conds = [(model_field, '>=', start_utc), (model_field, '<=', end_utc)]
                    adv_conditions.extend(conds)
                    adv_condition_domains.append(conds)
                    continue
                elif operator in ('>=', '<='):
                    bound_utc = _date_bounds_utc(str(raw_value))[0 if operator == '>=' else 1]
                    cond = (model_field, operator, bound_utc)
                    adv_conditions.append(cond)
                    adv_condition_domains.append([cond])
                    continue
            

            # Funciona como un default, si es nada de lo anterior, se usa este
            cond = (model_field, operator, raw_value)
            adv_conditions.append(cond)
            adv_condition_domains.append([cond])

        if adv_conditions:
            if match_type == 'any':
                return expression.AND([base_domain, expression.OR(adv_condition_domains)])
            else:
                base_domain.extend(adv_conditions)
        return base_domain

    def get_quick_filter_domain(self, quick_filter, env):
        """
        Retorna el dominio adicional según el filtro rápido (quick_filter).
        
        :param quick_filter: str, el nombre del filtro
        :param env: el entorno Odoo para hacer búsquedas (request.env)
        :return: lista con dominio o None
        """
        simple_states = {
            'draft': [('state', 'in', ['draft', 'sent'])],  
            'billing': [('state', '=', 'sale')],
            'cancel': [('state', '=', 'cancel')],
        }

        picking_filters = {
            'preparing': [
                ('state', 'in', ['confirmed', 'assigned']),
                ('picking_type_code', '!=', 'outgoing'),
            ],
            'to_be_shipped': [
                ('state', 'in', ['confirmed', 'assigned']),
                ('picking_type_code', '=', 'outgoing'),
            ],
            'shipped': [
                ('picking_type_code', '=', 'outgoing'),
                ('state', '=', 'done'),
            ],
        }
        if quick_filter in simple_states:
            return simple_states[quick_filter]

        elif quick_filter in picking_filters:
            picking_model = env['stock.picking'].sudo()
            picking_ids = picking_model.search(picking_filters[quick_filter]).ids
            if picking_ids:
                return [('picking_ids', 'in', picking_ids)]
            else:
                # Retornar un dominio que nunca coincida si no hay pickings
                return [('id', '=', 0)]


    @http.route('/account/expedition/list/reload', type='json', auth='user')
    def account_expedition_list_reload(self, page=1, search='', domain=None, match_type='all', sort=None, order='asc', quick_filter=None, **kw):
        SysParams = request.env['ir.config_parameter'].sudo()
        limit = int(SysParams.get_param(self.DEFAULT_LIMIT_PARAM, self.DEFAULT_LIMIT_VALUE))
        offset = (page - 1) * limit

        # Construir dominio de búsqueda
        base_domain = self._build_sale_domain(search, domain, match_type, quick_filter)

        # # Apply quick filters
        # if quick_filter and quick_filter != 'all':
        #     domain_addition = self.get_quick_filter_domain(quick_filter, request.env)
        #     if domain_addition:
        #         base_domain.extend(domain_addition)

        # Configurar ordenamiento
        order_by = 'id desc'
        if sort and sort in self.EXPEDITION_FIELDS_MAPPING:
            order_by = f"{self.EXPEDITION_FIELDS_MAPPING[sort]} {order}"
        
        SaleOrder = request.env['sale.order'].sudo()
        # Obtener productos y contar
        orders = SaleOrder.search(base_domain, limit=limit, offset=offset, order=order_by)
        items_total = SaleOrder.search_count(base_domain)
        items_count = len(orders)

        # Preparar datos de paginación
        pagination_data = self._get_pagination_data(page, items_total, limit)
        pagination_data.update({'items_total': items_total, 'items_count': items_count})

        qweb = request.env['ir.qweb']
        return {
            'status': 'success',
            'list': qweb._render('portal_expedition.portal_expedition_list', {
                'orders': orders,
                'batch_actions': True
            }),
            'pager': qweb._render('portal_expedition.portal_expedition_pager', {
                'orders': orders,
                'items_label': _('orders'),
                **pagination_data
            }),
            'last_page': pagination_data['last_page']
        }

    @http.route('/account/expedition/list/advanced_filters', type='json', auth='user')
    def account_expedition_list_advanced_filters(self, **kw):
        return {
            'status': 'success',
            'filters': json.dumps(self._get_expedition_advanced_search_fields())
        }

    @http.route('/account/expedition/details/<int:order_id>', type='http', auth='user')
    def account_expedition_details(self, order_id, **kw):
        SaleOrder = request.env['sale.order'].sudo()
        order = SaleOrder.browse(order_id)

        if not order.exists():
            return {
                'status': 'error',
                'message': _('The requested expedition does not exist.')
            }

        return request.render('portal_expedition.portal_expedition_details_page', {
            'page_name': 'expedition_details',
            'order': order,
            'user': request.env.user, 
            'company': request.env.company, 
            'page_title': _('Expedition Details'),
            'page_url': '/account/expedition/details/%s' % order_id,
        })