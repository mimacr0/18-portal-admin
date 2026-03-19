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
import base64

try:
    import xlsxwriter
except ImportError:
    xlsxwriter = None

from odoo import http, _, fields
from odoo.http import request
from odoo.osv import expression
from odoo.addons.portal_admin_theme.controllers.admin import PortalAdminController


class PortalSaleListController(PortalAdminController):
    """Controller for sale list view and related operations"""

    # Constantes de configuración
    SALE_FIELDS_MAPPING = {
        'name': 'name',
        'partner': 'partner_id',
        'date': 'date_order',
        'date_order': 'date_order',
        'state': 'state',
        'amount_total': 'amount_total',
    }

    DEFAULT_LIMIT_PARAM = 'portal_sales.page_list_default_limit'
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
            'name': _('Sales Orders'),
            'url': '/account/sales',
            'icon': 'fas fa-shopping-cart',
            'order': 30
        })
        return menus

    @lru_cache(maxsize=1)
    def _get_sale_advanced_search_fields(self):
        """Devuelve la configuración de campos para búsqueda avanzada"""
        return [
            {'id': 'name', 'label': _('Order Number'), 'type': 'text'},
            {'id': 'date_order', 'label': _('Order Date'), 'type': 'date'},
            {'id': 'state', 'label': _('Status'), 'type': 'select', 'options': [
                {'id': 'draft', 'label': _('Quotation')},
                {'id': 'sent', 'label': _('Quotation Sent')},
                {'id': 'sale', 'label': _('Sales Order')},
                {'id': 'done', 'label': _('Locked')},
                {'id': 'cancel', 'label': _('Cancelled')}
            ]}
        ]

    def _get_sale_list_columns(self):
        return [
            {'id': 'name', 'label': _('Order #'), 'sortable': True, 'responsive': ['sm', 'md', 'lg']},
            {'id': 'date', 'label': _('Order Date'), 'sortable': True, 'lg': True, 'responsive': ['md', 'lg']},
            {'id': 'amount_total', 'label': _('Total'), 'sortable': True, 'lg': True, 'responsive': ['sm', 'md', 'lg']},
            {'id': 'products', 'label': _('Products'), 'sortable': False, 'responsive': ['lg'], 'optional': 'show'},
            {'id': 'state', 'label': _('Status'), 'sortable': True, 'lg': True, 'responsive': ['md', 'lg']},
            {'id': 'actions', 'label': _('Actions'), 'sortable': False, 'right': True, 'responsive': ['sm', 'md', 'lg']}
        ]

    def _get_sale_list_filters(self):
        return [
            {'id': 'all', 'label': _('All'), 'icon': 'fas fa-list', 'active': True, 'domain': []},
            {'id': 'quotations', 'label': _('Quotations'), 'icon': 'fas fa-file-invoice', 'domain': [('state', 'in', ['draft', 'sent'])]},
            {'id': 'orders', 'label': _('Sales Orders'), 'icon': 'fas fa-check-circle', 'domain': [('state', 'in', ['sale', 'done'])]},
        ]

    @http.route('/account/sales', type='http', auth="user", website=True)
    def account_sale_action(self, **post):
        # Ensure translations render with user's language
        self._ensure_user_lang_context()
        SaleOrder = request.env['sale.order'].sudo()
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))
        
        # Initial count for layout values if needed
        orders = SaleOrder.search([('partner_id', 'in', partner_ids)], limit=1)

        values = self._get_admin_layout_values()

        # Configuración de la interfaz
        values.update({
            'page_name': 'sale',
            'orders': orders,
            'company': request.env.company,
            'page_title': _('Sales Orders'),
            'page_url': '/account/sales',
            'flatpickr': True,
            'select2': True,
            'list_filters': self._get_sale_list_filters(),
            'list_columns': self._get_sale_list_columns(),
            'tools_actions': [],
            'batch_actions': [
                {'name': 'export', 'label': _('Export Excel'), 'icon': 'fas fa-file-excel', 'color': 'btn-primary'},
            ],
            'advanced_search': json.dumps(self._get_sale_advanced_search_fields()),
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

        return request.render("portal_sales.portal_sales_page_main", values)

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

    @http.route('/account/sale/list/advanced_filters', type='json', auth='user')
    def account_sale_list_advanced_filters(self, **kw):
        self._ensure_user_lang_context()
        return {
            'status': 'success',
            'filters': json.dumps(self._get_sale_advanced_search_fields())
        }

    def _build_sale_domain(self, search='', domain=None, match_type='all', quick_filter=None):
        """Construye el dominio de búsqueda para pedidos de venta"""
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

        base_domain = [
            ('partner_id', 'in', partner_ids)
        ]

        # Apply quick filters
        if quick_filter:
            active_filter = next((f for f in self._get_sale_list_filters() if f['id'] == quick_filter), None)
            if active_filter and active_filter.get('domain'):
                base_domain = expression.AND([base_domain, active_filter['domain']])

        # Aplicar búsqueda de texto
        if search:
            base_domain = expression.AND([
                base_domain,
                expression.OR([
                    [('name', 'ilike', search)],
                    [('client_order_ref', 'ilike', search)],
                ])
            ])

        # Aplicar dominio de búsqueda avanzada
        if domain and isinstance(domain, list) and domain:
            adv_conditions = []
            adv_condition_domains = []

            def _coerce_value(field_key, value_str):
                try:
                    if field_key in ['amount_total']:
                        return float(value_str)
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

                if field_key == 'name':
                    if operator not in ('ilike', '='):
                        operator = 'ilike'
                    cond = ('name', operator, raw_value)
                    adv_conditions.append(cond)
                    adv_condition_domains.append([cond])
                    continue

                if field_key == 'state':
                    cond = ('state', '=', raw_value)
                    adv_conditions.append(cond)
                    adv_condition_domains.append([cond])
                    continue

                if field_key == 'date_order':
                    if operator == '=':
                        start_utc, end_utc = _date_bounds_utc(str(raw_value))
                        conds = [
                            ('date_order', '>=', start_utc),
                            ('date_order', '<=', end_utc),
                        ]
                        adv_conditions.extend(conds)
                        adv_condition_domains.append(conds)
                        continue
                    elif operator in ('>=', '<='):
                        bound_utc = _date_bounds_utc(str(raw_value))[0 if operator == '>=' else 1]
                        cond = ('date_order', operator, bound_utc)
                        adv_conditions.append(cond)
                        adv_condition_domains.append([cond])
                        continue

                coerced_value = _coerce_value(field_key, raw_value)
                cond = (field_key, operator, coerced_value)
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

    @http.route('/account/sale/list/reload', type='json', auth='user')
    def account_sale_list_reload(self, page=1, search='', domain=None, match_type='all', sort=None, order='asc', quick_filter=None, **kw):
        self._ensure_user_lang_context()
        limit = self._get_portal_list_limit()
        offset = (page - 1) * limit

        base_domain = self._build_sale_domain(search, domain, match_type, quick_filter)

        order_by = 'id desc'
        if sort and sort in self.SALE_FIELDS_MAPPING:
            order_by = f"{self.SALE_FIELDS_MAPPING[sort]} {order}"

        SaleOrder = request.env['sale.order'].sudo()
        orders = SaleOrder.search(base_domain, limit=limit, offset=offset, order=order_by)
        items_total = SaleOrder.search_count(base_domain)
        items_count = len(orders)

        pagination_data = self._get_pagination_data(page, items_total, limit)
        pagination_data.update({'items_total': items_total, 'items_count': items_count})

        qweb = request.env['ir.qweb']
        return {
            'status': 'success',
            'list': qweb._render('portal_sales.portal_sales_list', {
                'orders': orders,
                'list_columns': self._get_sale_list_columns(),
                'batch_actions': True,
                '_': _,
            }),
            'pager': qweb._render('portal_sales.portal_sales_pager', {
                'items_label': _('orders'),
                '_': _,
                **pagination_data
            }),
            'last_page': pagination_data['last_page']
        }

    @http.route('/account/sale/export', type='http', auth='user', methods=['GET', 'POST'])
    def account_sale_export(self, ids=None, **kw):
        """Export sales to Excel (XLSX) file."""
        self._ensure_user_lang_context()
        
        if not xlsxwriter:
            return request.make_response(
                _('Excel export not available. Please install xlsxwriter.'),
                headers=[('Content-Type', 'text/plain')]
            )
        
        SaleOrder = request.env['sale.order'].sudo()
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))
        
        domain = [
            ('partner_id', 'in', partner_ids)
        ]
        
        if ids:
            try:
                id_list = [int(i) for i in ids.split(',') if i.strip()]
                if id_list:
                    domain.append(('id', 'in', id_list))
            except ValueError:
                pass
        
        orders = SaleOrder.search(domain, order='date_order desc')

        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output, {'in_memory': True})
        worksheet = workbook.add_worksheet(_('Sales Orders'))
        
        header_format = workbook.add_format({
            'bold': True,
            'bg_color': '#A8A800',
            'font_color': 'white',
            'border': 1,
            'align': 'center',
            'valign': 'vcenter'
        })
        cell_format = workbook.add_format({
            'border': 1,
            'valign': 'vcenter'
        })
        
        worksheet.set_column(0, 0, 15)
        worksheet.set_column(1, 1, 20)
        worksheet.set_column(2, 2, 15)
        worksheet.set_column(3, 3, 15)
        
        headers = [
            _('Order Number'),
            _('Date'),
            _('Total'),
            _('Status'),
        ]
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)
        
        for row, order in enumerate(orders, start=1):
            state_label = dict(order._fields['state'].selection).get(order.state, order.state)
            
            worksheet.write(row, 0, order.name or '', cell_format)
            worksheet.write(row, 1, str(order.date_order), cell_format)
            worksheet.write(row, 2, order.amount_total or 0, cell_format)
            worksheet.write(row, 3, state_label, cell_format)
        
        workbook.close()
        
        output.seek(0)
        content = output.getvalue()
        
        filename = f"sales_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        
        return request.make_response(
            content,
            headers=[
                ('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
                ('Content-Disposition', f'attachment; filename="{filename}"'),
            ]
        )

    @http.route('/account/sales/details/<int:order_id>', type='http', auth="user", website=True)
    def account_sale_details(self, order_id, **kw):
        """View for sale order details"""
        self._ensure_user_lang_context()
        SaleOrder = request.env['sale.order'].sudo()
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

        order = SaleOrder.search([
            ('id', '=', order_id),
            ('partner_id', 'in', partner_ids)
        ], limit=1)

        if not order:
            return request.redirect('/account/sales')

        values = self._get_admin_layout_values()
        values.update({
            'page_name': 'sale_details',
            'order': order,
            'page_title': order.name,
            'user': request.env.user,
        })

        return request.render("portal_sales.portal_sales_details_page", values)

    @http.route('/account/sale/delete', type='json', auth='user')
    def account_sale_delete(self, sale_id, **kw):
        """Cancel a sale order"""
        SaleOrder = request.env['sale.order'].sudo()
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

        order = SaleOrder.search([
            ('id', '=', int(sale_id)),
            ('partner_id', 'in', partner_ids)
        ], limit=1)

        if not order:
            return {'status': 'error', 'message': _('Order not found or access denied.')}

        if order.state in ('draft', 'sent'):
            try:
                order.action_cancel()
                return {'status': 'success'}
            except Exception as e:
                return {'status': 'error', 'message': str(e)}
        else:
            return {'status': 'error', 'message': _('Only quotations can be cancelled.')}

    @http.route('/account/sale/batch/delete', type='json', auth='user')
    def account_sale_batch_delete(self, ids, **kw):
        """Batch cancel sale orders"""
        SaleOrder = request.env['sale.order'].sudo()
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

        orders = SaleOrder.search([
            ('id', 'in', [int(i) for i in ids if i]),
            ('partner_id', 'in', partner_ids),
            ('state', 'in', ('draft', 'sent'))
        ])

        if not orders:
            return {'status': 'error', 'message': _('No cancellable orders found.')}

        try:
            orders.action_cancel()
            return {'status': 'success'}
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

    @http.route('/account/sales/chatter/fetch', type='json', auth='user')
    def account_sales_chatter_fetch(self, sale_id, **kw):
        """Fetch chatter messages for a sale order"""
        SaleOrder = request.env['sale.order'].sudo()
        order = SaleOrder.browse(int(sale_id))
        if not order.exists():
            return {'status': 'error', 'message': 'Order not found'}

        messages = order.message_ids.filtered(lambda m: m.message_type == 'comment' and not m.subtype_id.internal)
        
        # We need to format the messages for the JS component
        formatted_messages = []
        for msg in messages:
            formatted_messages.append({
                'id': msg.id,
                'author': {'id': msg.author_id.id, 'name': msg.author_id.name},
                'author_avatar_url': f'/web/image/res.partner/{msg.author_id.id}/avatar_128',
                'body': msg.body,
                'date': fields.Datetime.to_string(msg.date),
                'attachment_ids': [{
                    'id': attachment.id,
                    'name': attachment.name,
                    'mimetype': attachment.mimetype,
                    'access_token': attachment.access_token,
                    'checksum': attachment.checksum,
                } for attachment in msg.attachment_ids]
            })

        return {
            'status': 'success',
            'data': {
                'mail.message': formatted_messages
            }
        }

    @http.route('/account/sales/chatter/post', type='http', auth='user', methods=['POST'], csrf=True)
    def account_sales_chatter_post(self, sale_id, message, attachment=None, **kw):
        """Post a message to a sale order chatter"""
        SaleOrder = request.env['sale.order'].sudo()
        order = SaleOrder.browse(int(sale_id))
        if not order.exists():
            return json.dumps({'status': 'error', 'message': 'Order not found'})

        try:
            msg_values = {
                'body': message,
                'message_type': 'comment',
                'subtype_xmlid': 'mail.mt_comment',
            }
            
            if attachment:
                Att = request.env['ir.attachment'].sudo()
                attachment_id = Att.create({
                    'name': attachment.filename,
                    'datas': base64.b64encode(attachment.read()),
                    'res_model': 'sale.order',
                    'res_id': order.id,
                })
                msg_values['attachment_ids'] = [(4, attachment_id.id)]

            order.with_context(mail_create_nosubscribe=True).message_post(**msg_values)
            return json.dumps({'status': 'success'})
        except Exception as e:
            return json.dumps({'status': 'error', 'message': str(e)})


