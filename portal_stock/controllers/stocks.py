import math
import json

from odoo import http, _
from odoo.addons.portal_admin_theme.controllers.admin import PortalAdminController
from odoo.http import request
from odoo.osv import expression


class PortalStockController(PortalAdminController):

    def _get_admin_layout_menus(self):
        menus = super()._get_admin_layout_menus()
        menus.extend([
            {
                'name': _('Stock'),
                'url': '/account/stock',
                'icon': 'fas fa-cubes'
            }
        ])
        return menus

    @http.route('/account/stock', type='http', auth="user", website=True)
    def account_stock_action(self, **post):
        ProductProducts = request.env['product.product'].sudo()
        stock = ProductProducts.search([('is_storable', '=', True)])

        attributes = request.env['product.attribute'].sudo().search([])
        attributes_data = []
        for attr in attributes:
            values = [{'id': v.id, 'name': v.name} for v in attr.value_ids]
            attributes_data.append({'id': attr.id, 'name': attr.name, 'values': values})
        
        values = self._get_admin_layout_values()

        list_filters = [
            {
                'id': 'status',
                'placeholder': _('All Status'),
                'values': [
                    ('in_stock', _('In Stock')),
                    ('out_of_stock', _('Out of Stock'))
                ]
            }
        ]

        list_columns = [
            {
                'id': 'name',
                'label': _('Name'),
                'sortable': True
            },
            {
                'id': 'sku',
                'label': _('SKU'),
                'sortable': True,
                'lg': True
            },
            {
                'id': 'barcode',
                'label': _('Barcode'),
                'sortable': True,
                'lg': True
            },
            {
                'id': 'status',
                'label': _('Status'),
                'sortable': True,
                'md': True
            },
            {
                'id': 'actions',
                'label': _('Actions'),
                'sortable': False,
                'right': True
            }
        ]

        advanced_search = [
            {
                'id': 'name',
                'label': _('Name')
            },
            {
                'id': 'sku',
                'label': _('SKU')
            },
            {
                'id': 'barcode',
                'label': _('Barcode')
            },
            {
                'id': 'status',
                'label': _('Status')
            }
        ]

        batch_actions = [
            {
                'name': 'delete',
                'label': _('Delete'),
                'icon': 'fas fa-trash-alt'
            }
        ]

        tools_actions = [
            {
                'name': 'import',
                'label': _('Import'),
                'icon': 'fas fa-file-import'
            }
        ]

        values.update({
            'page_name': 'stock',
            'stock': stock,
            'attributes': attributes_data,
            'page_title': _('Stock'),
            'page_url': '/account/stock',
            'list_filters': list_filters,
            'list_columns': list_columns,
            'tools_actions': tools_actions,
            'batch_actions': batch_actions,
            'advanced_search': json.dumps(advanced_search)
        })

        return request.render("portal_stock.portal_stock_page", values)

    @http.route('/account/stock/list/reload', type='json', auth='user')
    def account_stock_list_reload(self, page=1, search='', domain=None, match_type='all', sort=None, order='asc', **kw):
        SysParams = request.env['ir.config_parameter'].sudo()
        limit = int(SysParams.get_param('portal_stock.page_list_default_limit', '100'))
        offset = (page - 1) * limit
        base_domain = [('is_storable', '=', True)]

        # Apply text search
        if search:
            base_domain.extend(expression.OR([
                [('name', 'ilike', search)],
                [('default_code', 'ilike', search)],
                [('barcode', 'ilike', search)]
            ]))

        # Apply advanced search domain if provided
        if domain and isinstance(domain, list) and domain:
            adv_domain = []
            for condition in domain:
                if len(condition) == 3:
                    field, operator, value = condition
                    if field in ['name', 'sku', 'barcode', 'status']:
                        # Map frontend field names to model field names
                        field_mapping = {
                            'name': 'name',
                            'sku': 'default_code',
                            'barcode': 'barcode',
                            'status': 'qty_available'
                        }

                        # Special handling for status field
                        if field == 'status':
                            if value.lower() in ['in stock', 'instock']:
                                adv_domain.append(('qty_available', '>', 0))
                            elif value.lower() in ['out of stock', 'outofstock']:
                                adv_domain.append(('qty_available', '<=', 0))
                            else:
                                # Convert to numeric comparison if possible
                                try:
                                    numeric_value = float(value)
                                    adv_domain.append((field_mapping[field], operator, numeric_value))
                                except ValueError:
                                    pass
                        else:
                            adv_domain.append((field_mapping[field], operator, value))

            # Combine advanced search conditions based on match_type
            if adv_domain:
                if match_type == 'any':
                    base_domain.append(expression.OR(adv_domain))
                else:  # 'all' is the default
                    base_domain.extend(adv_domain)

        ProductProducts = request.env['product.product'].sudo()

        # Apply sorting if specified
        order_by = 'id'
        if sort:
            field_mapping = {
                'name': 'name',
                'sku': 'default_code',
                'barcode': 'barcode',
                'status': 'qty_available'
            }
            if sort in field_mapping:
                order_by = f"{field_mapping[sort]} {order}"

        products = ProductProducts.search(base_domain, limit=limit, offset=offset, order=order_by)
        items_total = ProductProducts.search_count(base_domain)
        items_count = len(products)
        first_page = 1
        last_page = math.ceil(items_total / limit)
        qweb = request.env['ir.qweb']

        pages = []

        for i in range(max(1, page - 1), min(last_page + 1, page + 3)):
            pages.append({
                'page': i,
                'active': i == page
            })

            if len(pages) >= 5:
                break

        return {
            'status': 'success',
            'list': qweb._render('portal_stock.portal_products_list', {
                'products': products,
                'batch_actions': True
            }),
            'pager': qweb._render('portal_stock.portal_stock_pager', {
                'products': products,
                'items_total': items_total,
                'items_count': items_count,
                'first_page': first_page,
                'last_page': last_page,
                'items_label': _('products'),
                'pages': pages
            }),
            'last_page': last_page
        }

    @http.route('/account/stock/list/advanced_filters', type='json', auth='user')
    def account_stock_list_advanced_filters(self, **kw):
        advanced_search = [
            {
                'id': 'name',
                'label': _('Name')
            },
            {
                'id': 'sku',
                'label': _('SKU')
            },
            {
                'id': 'barcode',
                'label': _('Barcode')
            },
            {
                'id': 'status',
                'label': _('Status')
            }
        ]

        return {
            'status': 'success',
            'filters': json.dumps(advanced_search)
        }

    @http.route('/account/stock/image/<int:pid>/<int:width>x<int:height>', type='http', auth='user')
    def account_stock_image_action(self, pid, width, height, **kw):
        field = 'image_128'
        crop = True
        download = False
        unique = True
        nocache = False

        try:
            ProductProducts = request.env['product.product'].sudo()
            product = ProductProducts.browse(pid)
            stream = request.env['ir.binary']._get_image_stream_from(
                product, field, width=int(width), height=int(height), crop=crop
            )
            if request.httprequest.args.get('access_token'):
                stream.public = True
        except Exception as exc:
            if download:
                raise request.not_found() from exc
            # Fallback to placeholder
            record = request.env.ref('web.image_placeholder').sudo()
            stream = request.env['ir.binary']._get_image_stream_from(
                record, 'raw', width=int(width), height=int(height), crop=crop
            )
            stream.public = False

        send_file_kwargs = {'as_attachment': download}
        if unique:
            send_file_kwargs['immutable'] = True
            send_file_kwargs['max_age'] = http.STATIC_CACHE_LONG
        if nocache:
            send_file_kwargs['max_age'] = None

        return stream.get_response(**send_file_kwargs)

    @http.route('/account/stock/create/product', type='json', auth='user')
    def account_stock_create_modal_action(self, **post):
        try:
            name = post.get('name')
            width = int(post['width'])
            height = int(post['height'])
            length = int(post['length'])
            volume = float(post['volume'])
            weight = float(post['weight'])
            barcode = post['barcode']
            sku = post['sku']
            # list_price = float(post['list_price']) or 0.0
            # standard_price = float(post['standard_price']) or 0.0
            tracking = post.get('tracking')
        except (ValueError, KeyError, json.JSONDecodeError) as e:
            return {'status': 'error', 'message': f'Data parsing error: {e}'}
        ProductTemplate = request.env['product.template']
        account_partner = request.env['account.partner'].search([('partner_id', '=', 119)], limit=1)

        values = {
            'account_partner_id': account_partner.id,
            'name': name,
            'sale_ok': False,
            'purchase_ok': False,
            'type': 'consu',
            'list_price': 0.0,
            'taxes_id': False,
            'standard_price': 0.0,
            'volume': volume,
            'weight': weight,
            'barcode': barcode,
            'default_code': sku,
            'is_storable': True,
            'tracking': tracking,
            # 'storage_type': self.storage_type,
            # 'categ_id': self.categ_id.id,
            # 'product_tag_ids': self.product_tag_ids,
        }

        template = ProductTemplate.create(values)


        return self.account_stock_action()
        # values = self._get_admin_layout_values()
        # values.update({
            # 'page_name': 'products',
            # 'page_title': _('Create Product'),
            # 'page_url': '/account/account/products/modal/create',
            # 'form_action': '/account/account/products/modal/create/submit'
        # })

        # return request.render("portal_account_products.portal_products_create_modal", values)