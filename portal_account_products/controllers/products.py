import math

from odoo import http, _
from odoo.addons.portal_admin_theme.controllers.admin import PortalAdminController
from odoo.http import request
from odoo.osv import expression


class PortalProductsController(PortalAdminController):

    def _get_admin_layout_menus(self):
        menus = super()._get_admin_layout_menus()
        menus.extend([
            {
                'name': _('Products'),
                'url': '/account/account/products',
                'icon': 'fas fa-box'
            }
        ])
        return menus

    @http.route('/account/account/products', type='http', auth="user", website=True)
    def account_account_products_action(self, **post):
        ProductProducts = request.env['product.product'].sudo()
        products = ProductProducts.search([('is_storable', '=', True)])

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
            'page_name': 'products',
            'products': products,
            'page_title': _('Products'),
            'page_url': '/account/account/products',
            'list_filters': list_filters,
            'list_columns': list_columns,
            'tools_actions': tools_actions,
            'batch_actions': batch_actions
        })

        return request.render("portal_account_products.portal_products_page", values)

    @http.route('/account/account/products/list/reload', type='json', auth='user')
    def account_account_products_list_reload(self, page=1, search='', **kw):
        SysParams = request.env['ir.config_parameter'].sudo()
        limit = int(SysParams.get_param('portal_account_products.page_list_default_limit', '10'))
        offset = (page - 1) * limit
        domain = [('is_storable', '=', True)]

        if search:
            domain.extend(expression.OR([
                [('name', 'ilike', search)],
                [('default_code', 'ilike', search)],
                [('barcode', 'ilike', search)]
            ]))

        ProductProducts = request.env['product.product'].sudo()
        products = ProductProducts.search(domain, limit=limit, offset=offset)
        items_total = ProductProducts.search_count(domain)
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
            'list': qweb._render('portal_account_products.portal_products_list', {
                'products': products
            }),
            'pager': qweb._render('portal_account_products.portal_products_pager', {
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

    @http.route('/account/account/products/image/<int:pid>/<int:width>x<int:height>', type='http', auth='user')
    def account_account_products_image_action(self, pid, width, height, **kw):
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
