##############################################################################
#
# Copyright 2025 DaFe Solutions
#
##############################################################################

import io
import math
import json
import pytz
from datetime import datetime
from functools import lru_cache

try:
    import xlsxwriter
except ImportError:
    xlsxwriter = None

from odoo import fields, http, _
from odoo.addons.portal_admin_theme.controllers.admin import PortalAdminController
from odoo.http import request
from odoo.osv import expression


class PortalRepairController(PortalAdminController):
    'Keep in mind that what we are really showning are quality.alert instances, no repair.order'
    ALERT_FIELDS_MAPPING = {
        'stage': 'stage_id',
        'name': 'name',
        'schedule_date': 'repair_order_ids.schedule_date',
        'done_date': 'repair_order_ids.done_date',
        'picking_id': 'picking_id',
        'description': 'description',
        'type': 'maintenance_type',
        'product_name': 'product_id.name',
    }

    DEFAULT_LIMIT_PARAM = 'portal_repair.page_list_default_limit'
    DEFAULT_LIMIT_VALUE = '100'

    def _get_admin_layout_menus(self):
        menus = super()._get_admin_layout_menus()
        menus.append({
            'name': _('SAT'),
            'url': '/account/repair',
            'icon': 'fas fa-screwdriver-wrench',
            'order': 50
        })
        return menus

    @lru_cache(maxsize=1)
    def _get_repair_advanced_search_fields(self):
        """Devuelve la configuración de campos para búsqueda avanzada"""

        Stage = request.env['quality.alert.stage'].sudo()
        stages = Stage.search([], order="sequence asc")
        stage_options = [
            {'id': st.id, 'label': st.name}
            for st in stages
        ]

        return [
            {'id': 'name', 'label': _('Name'), 'type': 'text'},
            {'id': 'product_name', 'label': _('Product'), 'type': 'text'},
            {'id': 'schedule_date', 'label': _('Repair Schedule Date'), 'type': 'date'},
            {'id': 'done_date', 'label': _('Repair Done Date'), 'type': 'date'},
            {'id': 'stage', 'label': _('Stage'), 'type': 'select', 'options': stage_options},
            {'id': 'type', 'label': _('Type'), 'type': 'select', 'options': [
                {'id': 'repair', 'label': _('Repair')},
                {'id': 'review', 'label': _('Review')},
                {'id': 'renew', 'label': _('Renew')},
                {'id': 'warranty', 'label': _('Warranty')},
            ]},
        ]
    @http.route('/account/repair', type='http', auth="user", website=True)
    def account_repair_alert_action(self, **post):
        QualityAlert = request.env['quality.alert'].sudo()

        # Obtener dominio base según account.partner del usuario actual
        domain = self._get_account_partner_domain()

        # Buscar solo las alertas de este account_partner
        alerts = QualityAlert.search(domain)

        values = self._get_admin_layout_values()

        # Configuración de la interfaz
        values.update({
            'page_name': 'repair-alert',
            'alerts': alerts,
            'page_title': _('SAT'),
            'page_url': '/account/repair',
            'flatpickr': True,
            'select2': True,
            'list_filters': [
                {'id': 'all', 'label': _('All'), 'icon': 'fas fa-list'},
                {'id': 'active', 'label': _('Active'), 'icon': 'fas fa-check-circle', 'active': True},
                {'id': 'in_transit', 'label': _('In transit'), 'icon': 'fas fa-truck'},
                {'id': 'in_warehouse', 'label': _('In warehouse'), 'icon': 'fas fa-warehouse'},
                {'id': 'sent_to_repair', 'label': _('Sent to repair'), 'icon': 'fas fa-tools'},
                {'id': 'repairing', 'label': _('Repairing'), 'icon': 'fas fa-cogs'},
                {'id': 'return_after_sales', 'label': _('Return After Sales'), 'icon': 'fas fa-undo'},
                {'id': 'sent_to_client', 'label': _('Sent to client'), 'icon': 'fas fa-shipping-fast'},
                {'id': 'sent_to_recycling', 'label': _('Sent for recycling'), 'icon': 'fas fa-recycle'},
                {'id': 'cancelled', 'label': _('Cancelled'), 'icon': 'fas fa-ban'},
            ],
            'list_columns': [
                {'id': 'name', 'label': _('Name'), 'sortable': True, 'responsive': ['sm', 'md', 'lg']},
                {'id': 'stage', 'label': _('Stage'), 'sortable': True, 'lg': True, 'responsive': ['lg']},
                {'id': 'product', 'label': _('Product Info'), 'responsive': ['md', 'lg']},
                {'id': 'repair', 'label': _('Repair Info'), 'responsive': ['md', 'lg']},
            ],
            'batch_actions': [
                {'name': 'export', 'label': _('Export Excel'), 'icon': 'fas fa-file-excel', 'color': 'btn-primary'},
                {'name': 'delete', 'label': _('Delete'), 'icon': 'fas fa-trash-alt', 'color': 'bg-red-600 hover:bg-red-700'},
            ],
            'advanced_search': json.dumps(self._get_repair_advanced_search_fields()),
        })
        
        # Procesar columnas para añadir flags de visibilidad según responsive
        list_columns = values.get('list_columns', [])
        for column in list_columns:
            responsive = column.get('responsive', [])
            column['show_in_sm'] = 'sm' in responsive
            column['show_in_md'] = 'md' in responsive
            column['show_in_lg'] = 'lg' in responsive
        values['list_columns'] = list_columns

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
        base_domain = self._get_account_partner_domain(domain)

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
            base_domain = self._apply_repair_advanced_domain(base_domain, domain, match_type)

        return base_domain

    def _apply_repair_advanced_domain(self, base_domain, domain, match_type='all'):
        """
        Construye y combina condiciones avanzadas para el dominio.
        """
        adv_conditions = []
        adv_condition_domains = []
        RepairAlert = request.env['quality.alert'].sudo()

        def _date_bounds_utc(date_str):
            """
            Convierte un valor de fecha/fecha-hora a UTC.
            - Si solo trae YYYY-MM-DD, devuelve inicio y fin del día.
            - Si ya trae YYYY-MM-DD HH:MM:SS, devuelve ese datetime exacto.
            """
            user_tz = pytz.timezone(request.env.user.tz or 'UTC')

            # Intentar parsear como fecha-hora completa
            try:
                dt = datetime.strptime(date_str, '%Y-%m-%d %H:%M:%S')
                dt_local = user_tz.localize(dt)
                return dt_local.astimezone(pytz.UTC).strftime('%Y-%m-%d %H:%M:%S'), \
                    dt_local.astimezone(pytz.UTC).strftime('%Y-%m-%d %H:%M:%S')
            except ValueError:
                pass

            # Si no es fecha-hora, parsear solo fecha
            try:
                day_local_start = user_tz.localize(datetime.strptime(date_str + ' 00:00:00', '%Y-%m-%d %H:%M:%S'))
                day_local_end = user_tz.localize(datetime.strptime(date_str + ' 23:59:59', '%Y-%m-%d %H:%M:%S'))
                return day_local_start.astimezone(pytz.UTC).strftime('%Y-%m-%d %H:%M:%S'), \
                    day_local_end.astimezone(pytz.UTC).strftime('%Y-%m-%d %H:%M:%S')
            except Exception:
                return date_str, date_str

        for condition in domain:
            if not isinstance(condition, (list, tuple)) or len(condition) != 3:
                continue
            field_key, operator, raw_value = condition
            model_field = self.ALERT_FIELDS_MAPPING[field_key]

            if 'date' in field_key.lower():
                try:
                    if operator == '=':
                        start_utc, end_utc = _date_bounds_utc(str(raw_value))
                        conds = [
                            (model_field, '>=', start_utc),
                            (model_field, '<=', end_utc)
                        ]
                        adv_conditions.extend(conds)
                        adv_condition_domains.append(conds)
                        continue
                    elif operator in ('>=', '<='):
                        bound_utc = _date_bounds_utc(str(raw_value))[0 if operator == '>=' else 1]
                        cond = (model_field, operator, bound_utc)
                        adv_conditions.append(cond)
                        adv_condition_domains.append([cond])
                        continue
                except Exception:
                    continue

            if field_key == 'stage':
                try:
                    value_int = int(raw_value)
                except Exception:
                    continue  # valor inválido, saltar
                
                if operator not in ('=', '!='):
                    operator = '='
                
                cond = ('stage_id', operator, value_int)
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

    @http.route('/account/repair/list/reload', type='json', auth='user')
    def account_repair_list_reload(self, page=1, search='', domain=None, match_type='all', sort=None, order='asc', quick_filter=None, **kw):
        SysParams = request.env['ir.config_parameter'].sudo()
        limit = self._get_portal_list_limit()
        offset = (page - 1) * limit
        # Construir dominio de búsqueda
        base_domain = self._build_alert_domain(search, domain, match_type, quick_filter)

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

    @http.route('/account/repair/export', type='http', auth='user', methods=['GET', 'POST'])
    def account_repair_export(self, ids=None, **kw):
        """Export repair alerts to Excel (XLSX) file."""
        if not xlsxwriter:
            return request.make_response(
                _('Excel export not available. Please install xlsxwriter.'),
                headers=[('Content-Type', 'text/plain')]
            )
        
        QualityAlert = request.env['quality.alert'].sudo()
        partner_id = request.env.user.partner_id
        
        account_partner = request.env['account.partner'].sudo().search([
            ('partner_id', '=', partner_id.commercial_partner_id.id)
        ], limit=1)
        
        domain = [('account_partner_id', '=', account_partner.id if account_partner else 0)]
        
        if ids:
            try:
                id_list = [int(i) for i in ids.split(',') if i.strip()]
                if id_list:
                    domain.append(('id', 'in', id_list))
            except ValueError:
                pass
        
        alerts = QualityAlert.search(domain, order='create_date desc')

        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output, {'in_memory': True})
        worksheet = workbook.add_worksheet(_('Repairs'))
        
        # Formats
        header_format = workbook.add_format({
            'bold': True,
            'bg_color': self.BASE_COLOR,
            'font_color': 'white',
            'border': 1,
            'align': 'center',
            'valign': 'vcenter'
        })
        cell_format = workbook.add_format({
            'border': 1,
            'valign': 'vcenter'
        })
        date_format = workbook.add_format({
            'border': 1,
            'valign': 'vcenter',
            'num_format': 'dd/mm/yyyy hh:mm'
        })
        
        # Column widths
        worksheet.set_column(0, 0, 20)  # Title
        worksheet.set_column(1, 1, 18)  # Name
        worksheet.set_column(2, 2, 15)  # Stage
        worksheet.set_column(3, 3, 25)  # Product
        worksheet.set_column(4, 4, 18)  # Lot
        worksheet.set_column(5, 5, 15)  # Lifecycle State
        worksheet.set_column(6, 6, 20)  # Maintenance Type
        worksheet.set_column(7, 7, 30)  # Results
        worksheet.set_column(8, 8, 30)  # Diagnosis
        worksheet.set_column(9, 9, 18)  # Create Date
        
        # Headers
        headers = [
            _('Title'),
            _('Name'),
            _('Stage'),
            _('Product'),
            _('Lot'),
            _('Lifecycle State'),
            _('Maintenance Type'),
            _('Results'),
            _('Diagnosis'),
            _('Create Date'),
        ]
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)
        
        # Data rows
        for row, alert in enumerate(alerts, start=1):
            # Get repair order info
            repair_orders = alert.repair_order_ids.filtered(lambda o: o.state == 'done')
            maintenance_types = ', '.join(repair_orders.mapped('maintenance_type') or [])
            results = ', '.join([', '.join(o.result_ids.mapped('name')) for o in repair_orders if o.result_ids])
            diagnosis = ', '.join([', '.join(o.diagnosis_ids.mapped('name')) for o in repair_orders if o.diagnosis_ids])
            
            worksheet.write(row, 0, alert.title or '', cell_format)
            worksheet.write(row, 1, alert.name or '', cell_format)
            worksheet.write(row, 2, alert.stage_id.name or '', cell_format)
            worksheet.write(row, 3, alert.product_id.display_name or '', cell_format)
            worksheet.write(row, 4, alert.lot_id.display_name or '', cell_format)
            worksheet.write(row, 5, alert.lot_id.lifecycle_state or '', cell_format)
            worksheet.write(row, 6, maintenance_types, cell_format)
            worksheet.write(row, 7, results, cell_format)
            worksheet.write(row, 8, diagnosis, cell_format)
            if alert.create_date:
                worksheet.write_datetime(row, 9, alert.create_date.replace(tzinfo=None), date_format)
            else:
                worksheet.write(row, 9, '', cell_format)
        
        workbook.close()
        
        output.seek(0)
        content = output.getvalue()
        
        filename = f"repairs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        
        return request.make_response(
            content,
            headers=[
                ('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
                ('Content-Disposition', f'attachment; filename="{filename}"'),
            ]
        )