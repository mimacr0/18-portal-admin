##############################################################################
#
# Copyright 2025-Today DaFe Solutions
#
##############################################################################

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
        'package_type': 'package_type_id',
        'weight': 'shipping_weight',
        'date': 'pack_date',
    }

    DEFAULT_LIMIT_PARAM = 'portal_reception.page_list_default_limit'
    DEFAULT_LIMIT_VALUE = '100'

    def _get_admin_layout_menus(self):
        menus = super()._get_admin_layout_menus()
        menus.append({
            'name': _('Receptions'),
            'url': '/account/reception',
            'icon': 'fas fa-truck'
        })
        return menus

    @lru_cache(maxsize=1)
    def _get_advanced_search_fields(self):
        """Devuelve la configuración de campos para búsqueda avanzada"""
        return [
            {'id': 'name', 'label': _('Name')},
            {'id': 'package_type', 'label': _('Type')},
            {'id': 'weight', 'label': _('Weight')},
            {'id': 'date', 'label': _('Planned Date')},
        ]

    @http.route('/account/reception', type='http', auth="user", website=True)
    def account_reception_action(self, **post):
        StockQuantPackage = request.env['stock.quant.package'].sudo()
        partner_id = request.env.user.partner_id.id
        packages = StockQuantPackage.search([])
        values = self._get_admin_layout_values()

        # Configuración de la interfaz
        values.update({
            'page_name': 'reception',
            'packages': packages,
            'page_title': _('Receptions'),
            'page_url': '/account/reception',
            'list_filters': [
                {'id': 'all', 'label': _('All'), 'icon': 'fas fa-check-circle', 'active': True},
                {'id': 'in_stock', 'label': _('In Stock'), 'icon': 'fas fa-check-circle'},
                {'id': 'out_of_stock', 'label': _('Out of Stock'), 'icon': 'fas fa-pause-circle'},
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


    # @http.route('/account/reception/list/reload', type='json', auth='user')
    # def account_reception_list_reload(self, page=1, search='', domain=None, match_type='all', sort=None, order='asc', **kw):
    #     SysParams = request.env['ir.config_parameter'].sudo()
    #     limit = int(SysParams.get_param(self.DEFAULT_LIMIT_PARAM, self.DEFAULT_LIMIT_VALUE))
    #     offset = (page - 1) * limit
    #
    #     # Construir dominio de búsqueda
    #     base_domain = self._build_package_domain(search, domain, match_type)
    #
    #     # Configurar ordenamiento
    #     order_by = 'id'
    #     if sort and sort in self.RECEPTION_FIELDS_MAPPING:
    #         order_by = f"{self.RECEPTION_FIELDS_MAPPING[sort]} {order}"
    #
    #     # Obtener paquetes y contar
    #     StockQuantPackage = request.env['stock.quant.package'].sudo()
    #     partner_id = request.env.user.partner_id.id
    #     # base_domain.append(('account_partner_id', '=', partner_id))
    #
    #     packages = StockQuantPackage.search(base_domain, limit=limit, offset=offset, order=order_by)
    #     items_total = StockQuantPackage.search_count(base_domain)
    #     items_count = len(packages)
    #
    #     # Preparar datos de paginación
    #     pagination_data = self._get_pagination_data(page, items_total, limit)
    #     pagination_data.update({'items_total': items_total, 'items_count': items_count})
    #
    #     qweb = request.env['ir.qweb']
    #     return {
    #         'status': 'success',
    #         'list': qweb._render('portal_reception.portal_reception_list', {
    #             'packages': packages,
    #             'batch_actions': True
    #         }),
    #         'pager': qweb._render('portal_reception.portal_reception_pager', {
    #             'items_label': _('packages'),
    #             **pagination_data
    #         }),
    #         'last_page': pagination_data['last_page']
    #     }

    # def _build_package_domain(self, search='', domain=None, match_type='all'):
    #     """Construye el dominio de búsqueda para paquetes"""
    #     base_domain = []
    #
    #     # Aplicar búsqueda de texto
    #     if search:
    #         base_domain.extend(expression.OR([
    #             [('name', 'ilike', search)],
    #             [('package_type_id.name', 'ilike', search)]
    #         ]))
    #
    #     # Aplicar dominio de búsqueda avanzada
    #     if domain and isinstance(domain, list) and domain:
    #         adv_domain = []
    #         for condition in domain:
    #             if len(condition) != 3:
    #                 continue
    #
    #             field, operator, value = condition
    #             if field not in self.RECEPTION_FIELDS_MAPPING:
    #                 continue
    #
    #             model_field = self.RECEPTION_FIELDS_MAPPING[field]
    #
    #             # Manejo especial para el campo de fecha
    #             if field == 'date':
    #                 try:
    #                     adv_domain.append((model_field, operator, value))
    #                 except (ValueError, TypeError):
    #                     pass
    #             else:
    #                 adv_domain.append((model_field, operator, value))
    #
    #         # Combinar condiciones de búsqueda avanzada según el tipo de coincidencia
    #         if adv_domain:
    #             if match_type == 'any':
    #                 base_domain.append(expression.OR(adv_domain))
    #             else:  # 'all' es el predeterminado
    #                 base_domain.extend(adv_domain)
    #
    #     return base_domain