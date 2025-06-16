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
                {'id': 'draft', 'label': _('Draft'), 'icon': 'fas fa-check-circle'},
                # Draft => Los Sale order que estén en estado draft 
                {'id': 'billing', 'label': _('Billing'), 'icon': 'fas fa-pause-circle'},
                # Billing => Los Sale order que estén en estado sale 
                {'id': 'preparing', 'label': _('Preparing'), 'icon': 'fas fa-pause-circle'},
                # Preparing => Los Stock Pinking cuyo estado sea confirmed o assigned, y sean de movimiento internal
                {'id': 'to be shipped', 'label': _('To be Shipped'), 'icon': 'fas fa-pause-circle'},
                # To be shipped => Los Stock Pinking cuyo estado sea confirmed o assigned, y sean de movimiento outgoing
                {'id': 'shipped', 'label': _('Shipped'), 'icon': 'fas fa-pause-circle'},
                # Shipped => Los Stock Pinking cuyo estado sea done, y sean de movimiento outgoing
                {'id': 'cancel', 'label': _('Cancelled'), 'icon': 'fas fa-pause-circle'},
                # Cancel => Los Sale order que estén en estado cancelled 
            # Tener en cuenta que sea el que sea el estado del picking, lo que se muestra es el sale.
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
        print("Base domain:", base_domain)
        return base_domain
        
    @http.route('/account/expedition/list/reload', type='json', auth='user')
    def account_expedition_list_reload(self, page=1, search='', domain=None, match_type='all', sort=None, order='asc', quick_filter=None, **kw):
        SysParams = request.env['ir.config_parameter'].sudo()
        limit = int(SysParams.get_param(self.DEFAULT_LIMIT_PARAM, self.DEFAULT_LIMIT_VALUE))
        offset = (page - 1) * limit

        # Construir dominio de búsqueda
        base_domain = self._build_sale_domain(search, domain, match_type)

        # # Apply quick filters
        # if quick_filter and quick_filter != 'all':
        #     if quick_filter == 'expedition_reference':
        #         base_domain.append(('tracking', '=', 'lot'))
        #     elif quick_filter == 'expedition_qty':
        #         base_domain.append(('tracking', '=', 'none'))

        # Configurar ordenamiento
        order_by = 'id'
        if sort and sort in self.EXPEDITION_FIELDS_MAPPING:
            order_by = f"{self.EXPEDITION_FIELDS_MAPPING[sort]} {order}"

        # Obtener productos y contar
        SaleOrder = request.env['sale.order'].sudo()
        orders = SaleOrder.search(base_domain, limit=limit, offset=offset, order=order_by)
        print("Orders found:", len(orders))
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
