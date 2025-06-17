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
    }

    DEFAULT_LIMIT_PARAM = 'portal_expedition.page_list_default_limit'
    DEFAULT_LIMIT_VALUE = '100'

    def _get_admin_layout_menus(self):
        menus = super()._get_admin_layout_menus()
        menus.append({
            'name': _('Expeditions'),
            'url': '/account/expedition',
            'icon': 'fas fa-truck'
        })
        return menus

    @lru_cache(maxsize=1)
    def _get_expedition_advanced_search_fields(self):
        """Devuelve la configuración de campos para búsqueda avanzada"""
        return [
            {'id': 'name', 'label': _('Name')},
            {'id': 'order', 'label': _('Order')},
            {'id': 'tracking_ref', 'label': _('Tracking Reference')},
            {'id': 'sent_date', 'label': _('Sent Date')},
            {'id': 'date_order', 'label': _('Date Order')},
        ]

    @http.route('/account/expedition', type='http', auth="user", website=True)
    def account_expedition_action(self, **post):
        SaleOrder = request.env['sale.order'].sudo()

        partner_id = request.env.user.partner_id.id
        orders = SaleOrder.search([])
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
                {'id': 'name', 'label': _('Name'), 'sortable': True},
                {'id': 'product_info', 'label': _('Products Information'), 'sortable': False, 'md': True},
                {'id': 'total_info', 'label': _('Total Information'), 'sortable': False, 'md': True},
                {'id': 'tracking_info', 'label': _('Tracking Information'), 'sortable': False, 'md': True},
                {'id': 'dates_info', 'label': _('Dates Information'), 'sortable': False, 'md': True},
                {'id': 'states_info', 'label': _('States'), 'sortable': False, 'md': True},
                {'id': 'actions', 'label': _('Actions'), 'sortable': False, 'right': True}
            ],
            'tools_actions': [
                {'name': 'import', 'label': _('Import'), 'icon': 'fas fa-file-import'}
            ],
            'batch_actions': [
                {'name': 'delete', 'label': _('Delete'), 'icon': 'fas fa-trash-alt'}
            ],
            'advanced_search': json.dumps(self._get_expedition_advanced_search_fields())
        })

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

    def _build_sale_domain(self, search='', domain=None, match_type='all'):
        """Construye el dominio de búsqueda para productos"""
        base_domain = []

        # Aplicar búsqueda de texto
        if search:
            base_domain.extend(expression.OR([
                [('name', 'ilike', search)],
                [('picking_ids.carrier_tracking_ref', 'ilike', search)],
            ]))
        # # Aplicar dominio de búsqueda avanzada
        if domain and isinstance(domain, list) and domain:
            adv_domain = []
            for condition in domain:
                # Comprueba que cada condición tenga exactamente 3 elementos
                if len(condition) != 3:
                    continue

                field, operator, value = condition
                if field not in self.EXPEDITION_FIELDS_MAPPING:
                    continue

                model_field = self.EXPEDITION_FIELDS_MAPPING[field]
                # if field == 'date_order':
                #     try:
                #         # Ajusta el formato según lo que recibes: "YYYY-MM-DD"
                #         value = datetime.strptime(value, "%d-%m-%Y").date()
                #     except ValueError:
                #         continue  # o lanza error si prefieres

                adv_domain.append((model_field, operator, value))
            # Si no hay condiciones avanzadas, no se modifica el dominio base
            # Combinar condiciones de búsqueda avanzada según el tipo de coincidencia
            if adv_domain:
                if match_type == 'any':
                    base_domain.append(expression.OR(adv_domain))
                else:  # 'all' es el predeterminado
                    base_domain.extend(adv_domain)

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
            'toBeShipped': [
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
            return [('picking_ids', 'in', picking_ids)]

        return None


    @http.route('/account/expedition/list/reload', type='json', auth='user')
    def account_expedition_list_reload(self, page=1, search='', domain=None, match_type='all', sort=None, order='asc', quick_filter=None, **kw):
        SysParams = request.env['ir.config_parameter'].sudo()
        limit = int(SysParams.get_param(self.DEFAULT_LIMIT_PARAM, self.DEFAULT_LIMIT_VALUE))
        offset = (page - 1) * limit

        # Construir dominio de búsqueda
        base_domain = self._build_sale_domain(search, domain, match_type)

        # # Apply quick filters
        if quick_filter and quick_filter != 'all':
            domain_addition = self.get_quick_filter_domain(quick_filter, request.env)
            if domain_addition:
                base_domain.extend(domain_addition)

        # Configurar ordenamiento
        order_by = 'id'
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