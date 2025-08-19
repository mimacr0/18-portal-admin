##############################################################################
#
# Copyright 2025 DaFe Solutions
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


class PortalRepairController(PortalAdminController):
    'Keep in mind that what we are really showning are quality.alert instances, no repair.order'

    ALERT_FIELDS_MAPPING = {
        'stage': 'stage_id',
        'name': 'name',
        'schedule_date': 'schedule_date',
        'picking_id': 'picking_id',
        'description': 'description',
    }

    DEFAULT_LIMIT_PARAM = 'portal_repair.page_list_default_limit'
    DEFAULT_LIMIT_VALUE = '100'

    def _get_admin_layout_menus(self):
        menus = super()._get_admin_layout_menus()
        menus.append({
            'name': _('Repair Alert'),
            'url': '/account/repair',
            'icon': 'fas fa-screwdriver-wrench'
        })
        return menus

    @lru_cache(maxsize=1)
    def _get_repair_advanced_search_fields(self):
        """Devuelve la configuración de campos para búsqueda avanzada"""
        return [
            {'id': 'name', 'label': _('Name')},
            # {'id': 'origin', 'label': _('Origin')},
            # {'id': 'partner', 'label': _('Partner')},
            {'id': 'schedule_date', 'label': _('Schedule Date')},
            {'id': 'stage', 'label': _('Stage')}
        ]

    @http.route('/account/repair', type='http', auth="user", website=True)
    def account_repair_alert_action(self, **post):

        QualityAlert = request.env['quality.alert'].sudo()
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))
        # alerts = QualityAlert.search([('account_partner_id', 'in', partner_ids)])
        alerts = QualityAlert.search([])
        values = self._get_admin_layout_values()

        # Configuración de la interfaz
        values.update({
            'page_name': 'repair-alert',
            'alerts': alerts,
            'page_title': _('Repair Alerts'),
            'page_url': '/account/repair',
            'flatpickr': True,
            'select2': True,
            'list_filters': [
                {'id': 'all', 'label': _('All'), 'icon': 'fas fa-check-circle'},
                {'id': 'active', 'label': _('Active'), 'icon': 'fas fa-check-circle', 'active': True},
                {'id': 'in_transit', 'label': _('In transit'), 'icon': 'fas fa-clock'},
                {'id': 'in_warehouse', 'label': _('In warehouse'), 'icon': 'fas fa-clock'},
                {'id': 'sent_to_repair', 'label': _('Sent to repair'), 'icon': 'fas fa-clock'},
                {'id': 'repairing', 'label': _('Repairing'), 'icon': 'fas fa-check'},
                {'id': 'return_after_sales', 'label': _('Return After Sales'), 'icon': 'fas fa-check'},
                {'id': 'sent_to_client', 'label': _('Sent to client'), 'icon': 'fas fa-check'},
                {'id': 'sent_to_recycling', 'label': _('Sent for recycling'), 'icon': 'fas fa-check'},
                {'id': 'cancelled', 'label': _('Cancelled'), 'icon': 'fas fa-clock'},
            ],
            'list_columns': [
                {'id': 'name', 'label': _('Name'), 'sortable': True},
                {'id': 'stage', 'label': _('Stage'), 'sortable': True, 'lg': True},
            ],
            'batch_actions': [
                {'name': 'delete', 'label': _('Delete'), 'icon': 'fas fa-trash-alt'}
            ],
            'advanced_search': json.dumps(self._get_repair_advanced_search_fields())
        })

        return request.render("portal_repair.portal_repair_alert_page_main", values)

    def _get_portal_list_limit(self):
        """Get portal list limit from user settings"""
        user = request.env.user
        SysParams = request.env['ir.config_parameter'].sudo()
        default_limit = int(SysParams.get_param(self.DEFAULT_LIMIT_PARAM, self.DEFAULT_LIMIT_VALUE))
        limit = (user.portal_user_configuration or {}).get('list_limit', default_limit)

        if not str(limit).isdigit():
            limit = default_limit

        return int(limit)

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


    @http.route('/account/repair/list/advanced_filters', type='json', auth='user')
    def account_reception_list_advanced_filters(self, **kw):
        return {
            'status': 'success',
            'filters': json.dumps(self._get_repair_advanced_search_fields())
        }

    def _build_alert_domain(self, search='', domain=None, match_type='all', quick_filter=None):
        """Construye el dominio de búsqueda para recepciones"""
        QualityAlert = request.env['quality.alert'].sudo()
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

        base_domain = [
            # ('partner_id', 'in', partner_ids),
        ]
        stage_mapping = {
            "in_transit": "repair_module.quality_alert_stage_in_transit_reception",
            "in_warehouse": "repair_module.quality_alert_stage_received",
            "sent_to_repair": "repair_module.quality_alert_stage_sent_to_review_repair",
            "repairing": "repair_module.quality_alert_stage_repairing",
            "return_after_sales": "repair_module.quality_alert_stage_sent_to_postsale",
            "sent_to_client": "repair_module.quality_alert_stage_sent_to_client",
            "sent_to_recycling": "repair_module.quality_alert_stage_sent_to_recycle",
            "cancelled": "repair_module.quality_alert_stage_repair_cancelled",
        }
        
        # Apply quick filters
        if quick_filter and quick_filter != 'all' and quick_filter != 'active'  :
            stage_xml_id = stage_mapping.get(quick_filter, 'quality.quality_alert_stage_0')
            stage = request.env.ref(stage_xml_id)
            base_domain.append(('stage_id', '=', stage.id))
            # Aplicar búsqueda de texto
        elif quick_filter and quick_filter == 'active':
            base_domain.extend([
                ('stage_id', '!=', request.env.ref('repair_module.quality_alert_stage_sent_to_client').id),
                ('stage_id', '!=', request.env.ref('repair_module.quality_alert_stage_sent_to_recycle').id),
                ('stage_id', '!=', request.env.ref('repair_module.quality_alert_stage_repair_cancelled').id),
            ])

        if search:
            base_domain.extend(expression.OR([
                [('name', 'ilike', search)],
            ]))

        # Aplicar dominio de búsqueda avanzada
        if domain:
            base_domain = self._apply_advanced_domain(base_domain, domain, match_type)

        return base_domain

    def _apply_advanced_domain(self, base_domain, domain, match_type='all'):
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
            model_field = self.ALERT_FIELDS_MAPPING[field_key]

            if field_key in ['scheduled_date', 'date']:
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

            cond = (model_field, operator, raw_value)
            adv_conditions.append(cond)
            adv_condition_domains.append([cond])

        if adv_conditions:
            if match_type == 'any':
                return expression.AND([base_domain, expression.OR(adv_condition_domains)])
            else:
                base_domain.extend(adv_conditions)
        return base_domain

    @http.route('/account/repair/list/reload', type='json', auth='user')
    def account_reception_list_reload(self, page=1, search='', domain=None, match_type='all', sort=None, order='asc', quick_filter=None, **kw):
        SysParams = request.env['ir.config_parameter'].sudo()
        limit = self._get_portal_list_limit()
        offset = (page - 1) * limit
        # Construir dominio de búsqueda
        print(f"Reloading repair alert list with search: {search}, domain: {domain}, match_type: {match_type}, quick_filter: {quick_filter}")
        base_domain = self._build_alert_domain(search, domain, match_type, quick_filter)

        # if quick_filter and quick_filter == 'pending':
        #     base_domain.append(('state', '=', 'assigned'))

        # if quick_filter and quick_filter == 'done':
        #     base_domain.append(('state', '=', 'done'))

        # Configurar ordenamiento
        order_by = 'id desc'
        if sort and sort in self.ALERT_FIELDS_MAPPING:
            order_by = f"{self.ALERT_FIELDS_MAPPING[sort]} {order}"

        # Obtener recepciones y contar
        QualityAlert = request.env['quality.alert'].sudo()
        alerts = QualityAlert.search(base_domain, limit=limit, offset=offset, order=order_by)
        items_total = QualityAlert.search_count(base_domain)
        items_count = len(alerts)
        # Preparar datos de paginación
        pagination_data = self._get_pagination_data(page, items_total, limit)
        pagination_data.update({'items_total': items_total, 'items_count': items_count})

        qweb = request.env['ir.qweb']
        return {
            'status': 'success',
            'list': qweb._render('portal_repair.portal_repair_alert_list', {
                'alerts': alerts,
                'batch_actions': True
            }),
            'pager': qweb._render('portal_repair.portal_repair_alert_pager', {
                'items_label': _('alerts'),
                **pagination_data
            }),
            'last_page': pagination_data['last_page']
        }