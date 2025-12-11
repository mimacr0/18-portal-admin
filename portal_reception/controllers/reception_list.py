##############################################################################
#
# Copyright 2025-Today DaFe Solutions
#
##############################################################################

import math
import json
import pytz
import io
from datetime import datetime
from functools import lru_cache

try:
    import xlsxwriter
except ImportError:
    xlsxwriter = None

from odoo import http, _
from odoo.http import request
from odoo.osv import expression
from odoo.addons.portal_admin_theme.controllers.admin import PortalAdminController


class PortalReceptionListController(PortalAdminController):
    """Controller for reception list view and related operations"""

    # Constantes de configuración
    RECEPTION_FIELDS_MAPPING = {
        'name': 'name',
        'origin': 'origin',
        'partner': 'partner_id',
        'date': 'scheduled_date',
        'scheduled_date': 'scheduled_date',
        'state': 'state',
        'package': 'package_name_virtual',
        'package_type': 'package_type_virtual',
    }

    DEFAULT_LIMIT_PARAM = 'portal_reception.page_list_default_limit'
    DEFAULT_LIMIT_VALUE = '100'

    def _get_portal_list_limit(self):
        """Get portal list limit from user settings"""
        user = request.env.user
        SysParams = request.env['ir.config_parameter'].sudo()
        default_limit = int(SysParams.get_param(self.DEFAULT_LIMIT_PARAM, self.DEFAULT_LIMIT_VALUE))
        limit = (user.portal_user_configuration or {}).get('list_limit', default_limit)

        if not str(limit).isdigit():
            limit = default_limit

        return int(limit)

    def _get_admin_layout_menus(self):
        menus = super()._get_admin_layout_menus()
        menus.append({
            'name': _('RMA'),
            'url': '/account/reception',
            'icon': 'fas fa-warehouse',
            'order': 20
        })
        return menus

    @lru_cache(maxsize=1)
    def _get_reception_advanced_search_fields(self):
        """Devuelve la configuración de campos para búsqueda avanzada"""
        PackageType = request.env['stock.package.type'].sudo()
        package_type_options = [
            {'id': pt.id, 'label': pt.name}
            for pt in PackageType.search([], limit=10)
        ]

        return [
            {'id': 'name', 'label': _('Name'), 'type': 'text'},
            {'id': 'package', 'label': _('Package'), 'type': 'text'},
            {'id': 'weight', 'label': _('Weight'), 'type': 'number'},
            {'id': 'shipping_weight', 'label': _('Shipping Weight'), 'type': 'number'},
            {'id': 'package_type', 'label': _('Package Type'), 'type': 'select', 'options': package_type_options},
            {'id': 'scheduled_date', 'label': _('Scheduled Date'), 'type': 'date'},
            {'id': 'state', 'label': _('Status'), 'type': 'select', 'options': [
                {'id': 'pending', 'label': _('Pending')},
                {'id': 'done', 'label': _('Done')},
                {'id': 'cancel', 'label': _('Cancel')}
            ]}
        ]

    @http.route('/account/reception', type='http', auth="user", website=True)
    def account_reception_action(self, **post):
        # Ensure translations render with user's language
        self._ensure_user_lang_context()
        StockPicking = request.env['stock.picking'].sudo()
        reception_type = request.env.ref('stock.picking_type_in')
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))
        packages = StockPicking.search([('picking_type_id', '=', reception_type.id), ('partner_id', 'in', partner_ids)])
        values = self._get_admin_layout_values()

        # Configuración de la interfaz
        values.update({
            'page_name': 'reception',
            'packages': packages,
            'page_title': _('RMA'),
            'page_url': '/account/reception',
            'flatpickr': True,
            'select2': True,
            'list_filters': [
                {'id': 'all', 'label': _('All'), 'icon': 'fas fa-check-circle', 'active': True},
                {'id': 'pending', 'label': _('Pending'), 'icon': 'fas fa-clock'},
                {'id': 'done', 'label': _('Done'), 'icon': 'fas fa-check'}
            ],
            'list_columns': [
                {'id': 'name', 'label': _('Name'), 'sortable': True, 'responsive': ['sm', 'md', 'lg']},
                {'id': 'weight', 'label': _('Weight'), 'sortable': True, 'lg': True, 'responsive': ['lg']},
                {'id': 'type', 'label': _('Package Type'), 'sortable': True, 'lg': True, 'responsive': ['lg']},
                {'id': 'date', 'label': _('Date'), 'sortable': True, 'md': True, 'responsive': ['md', 'lg']},
                {'id': 'state', 'label': _('Status'), 'sortable': True, 'md': True, 'responsive': ['md', 'lg']},
                {'id': 'note', 'label': _('Note'), 'sortable': False, 'responsive': ['lg']},
                {'id': 'actions', 'label': _('Actions'), 'sortable': False, 'right': True, 'responsive': ['sm', 'md', 'lg']}
            ],
            'batch_actions': [
                {'name': 'export', 'label': _('Export Excel'), 'icon': 'fas fa-file-excel', 'color': 'bg-[#696900] hover:bg-[#8A8A00]'},
                {'name': 'delete', 'label': _('Cancel'), 'icon': 'fas fa-ban'},
            ],
            'advanced_search': json.dumps(self._get_reception_advanced_search_fields())
        })
        
        # Procesar columnas para añadir flags de visibilidad según responsive
        list_columns = values.get('list_columns', [])
        for column in list_columns:
            responsive = column.get('responsive', [])
            column['show_in_sm'] = 'sm' in responsive
            column['show_in_md'] = 'md' in responsive
            column['show_in_lg'] = 'lg' in responsive
        values['list_columns'] = list_columns

        return request.render("portal_reception.portal_reception_page_main", values)

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

    @http.route('/account/reception/list/advanced_filters', type='json', auth='user')
    def account_reception_list_advanced_filters(self, **kw):
        self._ensure_user_lang_context()
        return {
            'status': 'success',
            'filters': json.dumps(self._get_reception_advanced_search_fields())
        }

    def _build_reception_domain(self, search='', domain=None, match_type='all', quick_filter=None):
        """Construye el dominio de búsqueda para recepciones"""
        StockPicking = request.env['stock.picking'].sudo()
        StockMoveLine = request.env['stock.move.line'].sudo()
        reception_type = request.env.ref('stock.picking_type_in')
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

        base_domain = [
            ('picking_type_id', '=', reception_type.id),
            ('partner_id', 'in', partner_ids),
            ('state', '!=', 'draft')
        ]

        # Apply quick filters
        if quick_filter and quick_filter != 'all':
            if quick_filter == 'pending':
                base_domain.append(('state', 'not in', ['done', 'cancel']))
            elif quick_filter == 'done':
                base_domain.append(('state', '=', 'done'))

        # Aplicar búsqueda de texto
        if search:
            base_domain.extend(expression.OR([
                [('name', 'ilike', search)],
                [('origin', 'ilike', search)],
                [('partner_id.name', 'ilike', search)]
            ]))

        # Aplicar dominio de búsqueda avanzada
        if domain and isinstance(domain, list) and domain:
            adv_conditions = []
            adv_condition_domains = []

            def _coerce_value(field_key, value_str):
                try:
                    if field_key in ['weight', 'shipping_weight']:
                        return float(value_str)
                    if field_key == 'package_type':
                        return int(value_str)
                    return value_str
                except Exception:
                    return value_str

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

                # Special handling for weight on picking (computed, non-stored)
                if field_key in ['weight', 'shipping_weight']:
                    operator = operator or '='
                    if operator == 'ilike':
                        operator = '='
                    try:
                        target_value = float(raw_value)
                    except Exception:
                        continue

                    candidates = StockPicking.search(base_domain)

                    def _matches_weight(picking):
                        try:
                            w = float(picking.shipping_weight or 0.0)
                        except Exception:
                            w = 0.0
                        if operator == '=':
                            return abs(w - target_value) < 1e-6
                        if operator == '!=':
                            return abs(w - target_value) >= 1e-6
                        if operator == '>=':
                            return w >= target_value
                        if operator == '<=':
                            return w <= target_value
                        if operator == '>':
                            return w > target_value
                        if operator == '<':
                            return w < target_value
                        return abs(w - target_value) < 1e-6

                    matched_ids = [p.id for p in candidates if _matches_weight(p)]

                    if operator == '!=':
                        cond = ('id', 'not in', matched_ids or [0])
                    else:
                        cond = ('id', 'in', matched_ids or [0])

                    adv_conditions.append(cond)
                    adv_condition_domains.append([cond])
                    continue

                if field_key not in self.RECEPTION_FIELDS_MAPPING:
                    continue

                model_field = self.RECEPTION_FIELDS_MAPPING[field_key]

                # Manejo especial para filtros por paquete y tipo de paquete
                if field_key in ['package', 'package_type']:
                    ml_domain = [('picking_id', '!=', False)]
                    if field_key == 'package':
                        if operator not in ('ilike', '='):
                            operator = 'ilike'
                        ml_domain.append(('result_package_id.name', operator, str(raw_value)))
                    else:
                        try:
                            value_int = int(raw_value)
                        except Exception:
                            continue
                        if operator not in ('=', '!='):
                            operator = '='
                        if operator == '=':
                            ml_domain.append(('result_package_id.package_type_id', '=', value_int))
                        else:
                            ml_domain.append(('result_package_id.package_type_id', '!=', value_int))

                    picking_ids = StockMoveLine.search(ml_domain).mapped('picking_id').ids
                    if operator in ('ilike', '=') and not picking_ids:
                        cond = ('id', '=', 0)
                    else:
                        if operator == '!=':
                            cond = ('id', 'not in', picking_ids or [0])
                        else:
                            cond = ('id', 'in', picking_ids)

                    adv_conditions.append(cond)
                    adv_condition_domains.append([cond])
                    continue

                # Manejo especial para el campo de estado
                if field_key == 'state':
                    val = (raw_value or '').lower()
                    if val in ['pending', 'draft', 'waiting']:
                        cond = ('state', 'not in', ['done', 'cancel'])
                        adv_conditions.append(cond)
                        adv_condition_domains.append([cond])
                        continue
                    elif val in ['done', 'completed', 'finished']:
                        cond = ('state', '=', 'done')
                        adv_conditions.append(cond)
                        adv_condition_domains.append([cond])
                        continue
                    elif val in ['cancel', 'cancelled']:
                        cond = ('state', '=', 'cancel')
                        adv_conditions.append(cond)
                        adv_condition_domains.append([cond])
                        continue

                # Manejo especial para fechas
                if field_key in ['scheduled_date', 'date']:
                    if operator == '=':
                        start_utc, end_utc = _date_bounds_utc(str(raw_value))
                        conds = [
                            (model_field, '>=', start_utc),
                            (model_field, '<=', end_utc),
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

                coerced_value = _coerce_value(field_key, raw_value)

                if field_key in ['weight', 'shipping_weight', 'package_type'] and operator == 'ilike':
                    operator = '='

                cond = (model_field, operator, coerced_value)
                adv_conditions.append(cond)
                adv_condition_domains.append([cond])

            if adv_conditions:
                if match_type == 'any':
                    base_domain = expression.AND([
                        base_domain,
                        expression.OR(adv_condition_domains)
                    ])
                else:
                    base_domain.extend(adv_conditions)

        return base_domain

    @http.route('/account/reception/list/reload', type='json', auth='user')
    def account_reception_list_reload(self, page=1, search='', domain=None, match_type='all', sort=None, order='asc', quick_filter=None, **kw):
        self._ensure_user_lang_context()
        limit = self._get_portal_list_limit()
        offset = (page - 1) * limit

        base_domain = self._build_reception_domain(search, domain, match_type, quick_filter)
        print(f"base_domain: {base_domain}")
        
        if quick_filter and quick_filter == 'pending':
            base_domain.append(('state', '=', 'assigned'))

        if quick_filter and quick_filter == 'done':
            base_domain.append(('state', '=', 'done'))

        order_by = 'id desc'
        if sort and sort in self.RECEPTION_FIELDS_MAPPING:
            order_by = f"{self.RECEPTION_FIELDS_MAPPING[sort]} {order}"

        StockPicking = request.env['stock.picking'].sudo()
        pickings = StockPicking.search(base_domain, limit=limit, offset=offset, order=order_by)
        items_total = StockPicking.search_count(base_domain)
        items_count = len(pickings)

        pagination_data = self._get_pagination_data(page, items_total, limit)
        pagination_data.update({'items_total': items_total, 'items_count': items_count})

        qweb = request.env['ir.qweb']
        return {
            'status': 'success',
            'list': qweb._render('portal_reception.portal_reception_list', {
                'packages': pickings,
                'batch_actions': True
            }),
            'pager': qweb._render('portal_reception.portal_reception_pager', {
                'items_label': _('packages'),
                **pagination_data
            }),
            'last_page': pagination_data['last_page']
        }

    @http.route('/account/reception/batch/delete', type='json', auth='user')
    def account_reception_batch_delete(self, ids, **kw):
        """Cancel selected receptions"""
        self._ensure_user_lang_context()
        if not ids:
            return {'status': 'error', 'message': _('No packages selected')}

        try:
            StockPicking = request.env['stock.picking'].sudo()
            reception_type = request.env.ref('stock.picking_type_in')
            partner_id = request.env.user.partner_id
            partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

            pickings = StockPicking.search([
                ('id', 'in', ids),
                ('picking_type_id', '=', reception_type.id),
                ('partner_id', 'in', partner_ids),
                ('state', 'not in', ['done', 'cancel'])
            ])

            if not pickings:
                return {'status': 'error', 'message': _('No valid receptions to cancel')}

            pickings.action_cancel()

            return {'status': 'success'}
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

    @http.route('/account/reception/export', type='http', auth='user', methods=['GET', 'POST'])
    def account_reception_export(self, ids=None, **kw):
        """Export receptions to Excel (XLSX) file."""
        self._ensure_user_lang_context()
        
        if not xlsxwriter:
            return request.make_response(
                _('Excel export not available. Please install xlsxwriter.'),
                headers=[('Content-Type', 'text/plain')]
            )
        
        StockPicking = request.env['stock.picking'].sudo()
        reception_type = request.env.ref('stock.picking_type_in')
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))
        
        domain = [
            ('picking_type_id', '=', reception_type.id),
            ('partner_id', 'in', partner_ids)
        ]
        
        if ids:
            try:
                id_list = [int(i) for i in ids.split(',') if i.strip()]
                if id_list:
                    domain.append(('id', 'in', id_list))
            except ValueError:
                pass
        
        pickings = StockPicking.search(domain, order='scheduled_date desc')

        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output, {'in_memory': True})
        worksheet = workbook.add_worksheet(_('Receptions'))
        
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
        date_format = workbook.add_format({
            'border': 1,
            'valign': 'vcenter',
            'num_format': 'dd/mm/yyyy hh:mm'
        })
        
        worksheet.set_column(0, 0, 15)
        worksheet.set_column(1, 1, 20)
        worksheet.set_column(2, 2, 18)
        worksheet.set_column(3, 3, 10)
        worksheet.set_column(4, 4, 15)
        worksheet.set_column(5, 5, 12)
        worksheet.set_column(6, 6, 40)
        
        headers = [
            _('Name'),
            _('Reference'),
            _('Scheduled Date'),
            _('Weight'),
            _('Package Type'),
            _('State'),
            _('Note'),
        ]
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)
        
        for row, picking in enumerate(pickings, start=1):
            packages = picking.get_packages()
            package_types = ', '.join(packages.mapped('package_type_id.name')) or ''
            package_refs = ', '.join(packages.mapped('name')) or ''
            state_label = dict(picking._fields['state'].selection).get(picking.state, picking.state)
            
            worksheet.write(row, 0, picking.name or '', cell_format)
            worksheet.write(row, 1, package_refs, cell_format)
            if picking.scheduled_date:
                worksheet.write_datetime(row, 2, picking.scheduled_date.replace(tzinfo=None), date_format)
            else:
                worksheet.write(row, 2, '', cell_format)
            worksheet.write(row, 3, picking.shipping_weight or 0, cell_format)
            worksheet.write(row, 4, package_types, cell_format)
            worksheet.write(row, 5, state_label, cell_format)
            worksheet.write(row, 6, picking.get_note_text() or '', cell_format)
        
        workbook.close()
        
        output.seek(0)
        content = output.getvalue()
        
        filename = f"receptions_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        
        return request.make_response(
            content,
            headers=[
                ('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
                ('Content-Disposition', f'attachment; filename="{filename}"'),
            ]
        )

