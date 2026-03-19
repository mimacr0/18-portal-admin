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
        'partner': 'owner_id',
        'date': 'pack_date',
        'pack_date': 'pack_date',
        'state': 'rma_state',
        'package_type': 'package_type_id',
        'carrier': 'carrier_id',
        'weight': 'weight',
        'shipping_weight': 'shipping_weight',
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
            'name': _('Reception Packages'),
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
            {'id': 'weight', 'label': _('Weight'), 'type': 'number'},
            {'id': 'shipping_weight', 'label': _('Shipping Weight'), 'type': 'number'},
            {'id': 'package_type', 'label': _('Package Type'), 'type': 'select', 'options': package_type_options},
            {'id': 'pack_date', 'label': _('Date'), 'type': 'date'},
            {'id': 'state', 'label': _('Status'), 'type': 'select', 'options': [
                {'id': 'draft', 'label': _('Waiting Package')},
                {'id': 'opened', 'label': _('Opened & Inspected')},
                {'id': 'done', 'label': _('Empty / Done')}
            ]}
        ]

    def _get_reception_list_columns(self):
        return [
            {'id': 'name', 'label': _('Tracking/Name'), 'sortable': True, 'responsive': ['sm', 'md', 'lg']},
            {'id': 'carrier', 'label': _('Carrier'), 'sortable': True, 'lg': True, 'responsive': ['lg']},
            {'id': 'weight', 'label': _('Weight'), 'sortable': True, 'lg': True, 'responsive': ['lg']},
            {'id': 'type', 'label': _('Package Type'), 'sortable': True, 'lg': True, 'responsive': ['lg']},
            {'id': 'date', 'label': _('Date'), 'sortable': True, 'lg': True, 'responsive': ['md', 'lg']},
            {'id': 'sender', 'label': _('Sender'), 'sortable': True, 'md': True, 'responsive': ['md', 'lg']},
            {'id': 'shipping', 'label': _('Shipping Address'), 'sortable': True, 'lg': True, 'responsive': ['md', 'lg']},
            {'id': 'products', 'label': _('Declared Products'), 'sortable': True, 'lg': True, 'responsive': ['md', 'lg']},
            {'id': 'state', 'label': _('Status'), 'sortable': True, 'lg': True, 'responsive': ['md', 'lg']},
            {'id': 'actions', 'label': _('Actions'), 'sortable': False, 'right': True, 'responsive': ['sm', 'md', 'lg']}
        ]

    def _get_reception_list_filters(self):
        return [
            {'id': 'all', 'label': _('All'), 'icon': 'fas fa-check-circle', 'active': True, 'domain': []},
            {'id': 'pending', 'label': _('Pending'), 'icon': 'fas fa-clock', 'domain': [('type', '=', 'return'), ('rma_state', '=', 'draft')]},
            {'id': 'done', 'label': _('Done'), 'icon': 'fas fa-check', 'domain': [('type', '=', 'return'), ('rma_state', '=', 'done')]},
            {'id': 'return', 'label': _('Return'), 'icon': 'fas fa-undo', 'domain': [('type', '=', 'return')]},
            {'id': 'new', 'label': _('New'), 'icon': 'fas fa-star', 'domain': [('type', '=', 'new')]}
        ]

    @http.route('/account/reception', type='http', auth="user", website=True)
    def account_reception_action(self, **post):
        # Ensure translations render with user's language
        self._ensure_user_lang_context()
        StockPackage = request.env['stock.quant.package'].sudo()
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))
        # packages = StockPackage.search([('type', '=', 'return'), ('owner_id', 'in', partner_ids)])
        packages = StockPackage.search([('type', '=', 'return')])
        
        # Data for the creation modal (rma_label style)
        all_partners = request.env['res.partner'].sudo().search([
            ('id', 'child_of', partner_id.commercial_partner_id.id),
        ])
        sender_addresses = all_partners.filtered(lambda p: p.type == 'sender')
        shipping_addresses = all_partners.filtered(lambda p: p.type in ['delivery'] and (not p.country_id or p.country_id.code == 'ES'))
        countries = request.env['res.country'].sudo().search([])
        package_types = request.env['stock.package.type'].sudo().search([])
        carriers = request.env['delivery.carrier'].sudo().search([('active', '=', True)])

        values = self._get_admin_layout_values()

        # Configuración de la interfaz
        values.update({
            'page_name': 'reception',
            'packages': packages,
            'sender_addresses': sender_addresses,
            'shipping_addresses': shipping_addresses,
            'countries': countries,
            'package_types': package_types,
            'carriers': carriers,
            'company': request.env.company,
            'page_title': _('Packages'),
            'page_url': '/account/reception',
            'flatpickr': True,
            'select2': True,
            'list_filters': self._get_reception_list_filters(),
            'list_columns': self._get_reception_list_columns(),
            'tools_actions': [
                {'name': 'import', 'label': _('Import Excel'), 'icon': 'fas fa-file-import', 'color': 'btn-primary', 'modal_id': 'dashboard-page-import-receptions-modal'},
            ],

            'batch_actions': [
                {'name': 'export', 'label': _('Export Excel'), 'icon': 'fas fa-file-excel', 'color': 'btn-primary'},
                {'name': 'delete', 'label': _('Cancel'), 'icon': 'fas fa-ban'},
            ],
            'advanced_search': json.dumps(self._get_reception_advanced_search_fields()),
            '_': _,
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
        # DEFINITIONS
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

        base_domain = [
            # ('owner_id', 'in', partner_ids)
        ]

        # Apply quick filters
        # Apply quick filters
        if quick_filter:
            active_filter = next((f for f in self._get_reception_list_filters() if f['id'] == quick_filter), None)
            if active_filter and active_filter.get('domain'):
                base_domain = expression.AND([base_domain, active_filter['domain']])


        # Aplicar búsqueda de texto
        if search:
            base_domain = expression.AND([
                base_domain,
                expression.OR([
                    [('name', 'ilike', search)],
                    [('carrier_id.name', 'ilike', search)],
                    # [('owner_id.name', 'ilike', search)]
                ])
            ])

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

                # Advanced filtering by package name or type (direct fields)
                if field_key in ['package', 'package_type']:
                    model_field = 'name' if field_key == 'package' else 'package_type_id'
                    if field_key == 'package' and operator not in ('ilike', '='):
                        operator = 'ilike'
                    
                    coerced_value = _coerce_value(field_key, raw_value)
                    cond = (model_field, operator, coerced_value)
                    adv_conditions.append(cond)
                    adv_condition_domains.append([cond])
                    continue

                # Manejo especial para el campo de estado
                if field_key == 'state':
                    val = str(raw_value or '').lower()
                    domain_val = 'draft'
                    if val in ['draft', 'received', 'pending']:
                        domain_val = 'draft'
                    elif val in ['opened', 'inspected']:
                        domain_val = 'opened'
                    elif val in ['done', 'empty']:
                        domain_val = 'done'
                    
                    cond = ('rma_state', '=', domain_val)
                    adv_conditions.append(cond)
                    adv_condition_domains.append([cond])
                    continue

                # Manejo especial para fechas
                if field_key in ['pack_date', 'date']:
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
                    base_domain = expression.AND([base_domain, adv_conditions])

        return base_domain

    @http.route('/account/reception/list/reload', type='json', auth='user')
    def account_reception_list_reload(self, page=1, search='', domain=None, match_type='all', sort=None, order='asc', quick_filter=None, **kw):
        self._ensure_user_lang_context()
        limit = self._get_portal_list_limit()
        offset = (page - 1) * limit

        base_domain = self._build_reception_domain(search, domain, match_type, quick_filter)

        order_by = 'id desc'
        if sort and sort in self.RECEPTION_FIELDS_MAPPING:
            order_by = f"{self.RECEPTION_FIELDS_MAPPING[sort]} {order}"

        StockPackage = request.env['stock.quant.package'].sudo()
        packages = StockPackage.search(base_domain, limit=limit, offset=offset, order=order_by)
        items_total = StockPackage.search_count(base_domain)
        items_count = len(packages)

        pagination_data = self._get_pagination_data(page, items_total, limit)
        pagination_data.update({'items_total': items_total, 'items_count': items_count})

        qweb = request.env['ir.qweb']
        return {
            'status': 'success',
            'list': qweb._render('portal_reception.portal_reception_list', {
                'packages': packages,
                'batch_actions': True,
                '_': _,
            }),
            'pager': qweb._render('portal_reception.portal_reception_pager', {
                'items_label': _('packages'),
                '_': _,
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
            StockPackage = request.env['stock.quant.package'].sudo()
            partner_id = request.env.user.partner_id
            partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

            packages = StockPackage.search([
                ('id', 'in', ids),
                ('type', '=', 'return'),
                # ('owner_id', 'in', partner_ids),
                ('rma_state', '=', 'draft')
            ])

            if not packages:
                return {'status': 'error', 'message': _('No valid packages to cancel')}

            packages.unlink() # For packages, we might just delete if draft or mark as cancelled if supported

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
        
        StockPackage = request.env['stock.quant.package'].sudo()
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))
        
        domain = [
            ('type', '=', 'return'),
            ('owner_id', 'in', partner_ids)
        ]
        
        if ids:
            try:
                id_list = [int(i) for i in ids.split(',') if i.strip()]
                if id_list:
                    domain.append(('id', 'in', id_list))
            except ValueError:
                pass
        
        packages = StockPackage.search(domain, order='pack_date desc')

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
            # _('Weight'),
            # _('Package Type'),
            _('State'),
            # _('Note'),
        ]
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)
        
        for row, package in enumerate(packages, start=1):
            package_type = package.package_type_id.name or ''
            state_label = dict(package._fields['rma_state'].selection).get(package.rma_state, package.rma_state)
            
            worksheet.write(row, 0, package.name or '', cell_format)
            worksheet.write(row, 1, package.name, cell_format)
            if package.pack_date:
                worksheet.write(row, 2, str(package.pack_date), cell_format)
            else:
                worksheet.write(row, 2, '', cell_format)
            worksheet.write(row, 3, package.shipping_weight or 0, cell_format)
            worksheet.write(row, 4, package_type, cell_format)
            worksheet.write(row, 5, state_label, cell_format)
            worksheet.write(row, 6, package.notes or '', cell_format)
        
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

    @http.route('/account/reception/product_maps', type='json', auth='user')
    def account_reception_product_maps(self, search='', **kw):
        """Fetch account.product.map records for the Kanban selector"""
        self._ensure_user_lang_context()
        partner_id = request.env.user.partner_id
        
        domain = [
            ('account_id.partner_id', '=', partner_id.commercial_partner_id.id),
            ('active', '=', True)
        ]
        
        if search:
            domain += [
                '|', ('name', 'ilike', search),
                ('account_sku', 'ilike', search)
            ]
            
        product_maps = request.env['account.product.map'].sudo().search(domain, order='name asc')
        
        return {
            'status': 'success',
            'product_maps': [{
                'id': pm.id,
                'name': pm.name,
                'account_sku': pm.account_sku,
                'internal_product_name': pm.product_id.name,
                'image_url': f'/account/reception/product_image/{pm.product_id.id}'
            } for pm in product_maps]
        }

