# -*- coding: utf-8 -*-
import json
import math
import logging
from odoo import http, _, fields
from odoo.http import request
from odoo.osv import expression
from odoo.addons.portal_account.controllers.dashboard import PortalDashboardController

_logger = logging.getLogger(__name__)

class PortalProductMappingController(PortalDashboardController):

    PRODUCT_MAPPING_FIELDS_MAPPING = {
        'product': 'product_id',
        'product_id': 'product_id',
        'account_sku': 'account_sku',
        'account_ean13': 'account_ean13',
        'account_fnsku': 'account_fnsku',
        'account_asin': 'account_asin',
        'marketplace': 'marketplace',
        'tracking': 'tracking',
    }

    def _get_admin_layout_menus(self):
        menus = super()._get_admin_layout_menus()
        menus.append({
            'id': 'product_mapping',
            'name': _('Product Mapping'),
            'url': '/account/product_mapping',
            'icon': 'fas fa-tags',
            'order': 35
        })
        return menus

    def _get_product_mapping_domain(self, search=None, domain=None, match_type='all'):
        partner = request.env.user.partner_id.commercial_partner_id
        
        AccountPartner = request.env['account.partner'].sudo()
        account_partner = AccountPartner.search([('partner_id', '=', partner.id)], limit=1)
        
        if not account_partner:
            _logger.warning("No account.partner found for partner %s", partner.name)
            return [('id', '=', 0)]
            
        base_domain = [('account_id', '=', account_partner.id)]
        
        if search:
            search_domain = [
                '|', '|', '|', '|',
                ('product_id.name', 'ilike', search),
                ('account_sku', 'ilike', search),
                ('account_ean13', 'ilike', search),
                ('account_fnsku', 'ilike', search),
                ('account_asin', 'ilike', search)
            ]
            base_domain = expression.AND([base_domain, search_domain])
            
        if domain and isinstance(domain, list):
            adv_conditions = []
            adv_condition_domains = []
            
            for condition in domain:
                if not isinstance(condition, (list, tuple)) or len(condition) != 3:
                    continue
                    
                field_key, operator, value = condition
                _logger.info("Processing condition: field_key=%s, operator=%s, value=%s", field_key, operator, value)
                
                # Sanitize: Skip if value is empty or same as field name (dummy/init state)
                if not value or value == field_key:
                    _logger.info("Skipping condition because value matches field_key or is empty")
                    continue
                    
                model_field = self.PRODUCT_MAPPING_FIELDS_MAPPING.get(field_key, field_key)
                
                coerced_value = value
                if model_field == 'product_id':
                    if isinstance(value, str) and value.isdigit():
                        coerced_value = int(value)
                    elif not isinstance(value, int):
                        # If it's not a digit and not an int, it's invalid for product_id
                        continue
                
                if field_key in ['marketplace', 'tracking', 'product_id'] and operator == 'ilike':
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
            
        _logger.info("UID %s | Partner %s | Domain: %s (Match: %s)", request.uid, partner.id, base_domain, match_type)
        return base_domain

    def _get_product_mapping_list_columns(self):
        return [
            {'id': 'product', 'label': _('Internal Product'), 'sortable': True},
            {'id': 'account_sku', 'label': _('Account SKU'), 'sortable': True},
            {'id': 'account_ean13', 'label': _('EAN13'), 'sortable': True, 'optional': 'show'},
            {'id': 'account_fnsku', 'label': _('FNSKU'), 'sortable': True, 'optional': 'hide'},
            {'id': 'account_asin', 'label': _('ASIN'), 'sortable': True, 'optional': 'hide'},
            {'id': 'marketplace', 'label': _('Marketplace'), 'sortable': True, 'optional': 'show'},
            {'id': 'tracking', 'label': _('Tracking'), 'sortable': True, 'optional': 'show'},
            {'id': 'actions', 'label': _('Actions'), 'sortable': False, 'right': True},
        ]

    def _get_product_mapping_filters(self):
        return [
            {'id': 'all', 'label': _('All Products'), 'icon': 'fas fa-list', 'active': True, 'domain': []},
            {'id': 'amazon', 'label': _('Amazon'), 'icon': 'fab fa-amazon', 'domain': [('marketplace', '=', 'amazon')]},
            {'id': 'ebay', 'label': _('eBay'), 'icon': 'fab fa-ebay', 'domain': [('marketplace', '=', 'ebay')]},
            {'id': 'web', 'label': _('Webstore'), 'icon': 'fas fa-globe', 'domain': [('marketplace', '=', 'web')]},
            {'id': 'tracking_serial', 'label': _('Serial / IMEI'), 'icon': 'fas fa-barcode', 'domain': [('tracking', '=', 'serial')]},
        ]

    def _get_product_mapping_advanced_search_fields(self):
        return [
            {'id': 'product_id', 'label': _('Internal Product'), 'type': 'many2one', 'model': 'product.product'},
            {'id': 'account_sku', 'label': _('Account SKU'), 'type': 'char'},
            {'id': 'account_ean13', 'label': _('EAN13'), 'type': 'char'},
            {'id': 'account_fnsku', 'label': _('FNSKU'), 'type': 'char'},
            {'id': 'account_asin', 'label': _('ASIN'), 'type': 'char'},
            {'id': 'marketplace', 'label': _('Marketplace'), 'type': 'selection', 'options': [
                ('amazon', 'Amazon'), ('cdiscount', 'Cdiscount'), ('ebay', 'eBay'),
                ('temu', 'Temu'), ('aliexpress', 'AliExpress'), ('pccomponentes', 'PcComponentes'),
                ('carrefour', 'Carrefour'), ('worten', 'Worten'), ('web', 'Webstore'), ('other', 'Other')
            ]},
            {'id': 'tracking', 'label': _('Tracking'), 'type': 'selection', 'options': [
                ('none', _('No Tracking')), ('lot', _('Batch')), ('serial', _('Serial / IMEI'))
            ]},
        ]

    @http.route('/account/product_mapping', type='http', auth="user", website=True)
    def account_product_mapping_action(self, **post):
        self._ensure_user_lang_context()
        values = self._get_admin_layout_values()
        
        limit = 20
        page = 1
        offset = (page - 1) * limit
        
        domain = self._get_product_mapping_domain()
        ProductMap = request.env['account.product.map'].sudo()
        mappings = ProductMap.search(domain, limit=limit, offset=offset, order='id desc')
        items_total = ProductMap.search_count(domain)
        items_count = len(mappings)
        
        pagination_data = self._get_pagination_data(page, items_total, limit)
        
        values.update({
            'page_name': 'product_mapping',
            'page_title': _('Product Mapping'),
            'page_url': '/account/product_mapping',
            'mappings': mappings,
            'list_columns': self._get_product_mapping_list_columns(),
            'list_filters': self._get_product_mapping_filters(),
            'advanced_search': json.dumps(self._get_product_mapping_advanced_search_fields()),
            'items_total': items_total,
            'items_count': items_count,
            'items_label': _('mappings'),
            'pages': pagination_data['pages'],
            'last_page': pagination_data['last_page'],
            'batch_actions': self._get_product_mapping_batch_actions(),
            'tools_actions': [
                {'name': 'import', 'label': _('Import Excel'), 'icon': 'fas fa-file-import', 'color': 'btn-primary', 'modal_id': 'product_mapping_import_modal'},
            ],
            '_': _,
        })
        
        return request.render("portal_general_product.portal_product_mapping_page_main", values)

    def _get_product_mapping_batch_actions(self):
        return [
            {'name': 'export', 'label': _('Export Excel'), 'icon': 'fas fa-file-excel', 'color': 'bg-green-600 hover:bg-green-700'},
        ]

    @http.route('/account/product_mapping/reload', type='json', auth="user", website=True)
    def account_product_mapping_reload(self, page=1, search='', domain=None, match_type='all', sort=None, order='asc', quick_filter=None, **kw):
        limit = 20
        offset = (page - 1) * limit
        
        base_domain = self._get_product_mapping_domain(search, domain, match_type)
        
        if quick_filter:
            for f in [f for f in self._get_product_mapping_filters() if f['id'] == quick_filter]:
                if f['domain']:
                    base_domain = expression.AND([base_domain, f['domain']])

        order_str = 'id desc'
        if sort:
            field_name = self.PRODUCT_MAPPING_FIELDS_MAPPING.get(sort, sort)
            order_str = f"{field_name} {order}, id desc"

        ProductMap = request.env['account.product.map'].sudo()
        mappings = ProductMap.search(base_domain, limit=limit, offset=offset, order=order_str)
        items_total = ProductMap.search_count(base_domain)
        
        pagination_data = self._get_pagination_data(page, items_total, limit)
        
        qweb = request.env['ir.qweb'].sudo()
        return {
            'status': 'success',
            'list': qweb._render('portal_general_product.portal_product_mapping_list', {
                'mappings': mappings,
                'page_name': 'product_mapping',
                'list_columns': self._get_product_mapping_list_columns(),
                'batch_actions': self._get_product_mapping_batch_actions(),
                '_': _,
            }),
            'pager': qweb._render('portal_general_product.portal_product_mapping_pager', {
                'items_count': len(mappings),
                'items_total': items_total,
                'items_label': _('mappings'),
                '_': _,
                **pagination_data
            }),
            'last_page': pagination_data['last_page']
        }

    @http.route('/account/product_mapping/unmapped_products', type='json', auth='user')
    def account_product_mapping_unmapped_products(self, search='', **kw):
        """Fetch all products not yet mapped for the current client"""
        self._ensure_user_lang_context()
        partner_id = request.env.user.partner_id.commercial_partner_id
        
        AccountPartner = request.env['account.partner'].sudo()
        account_partner = AccountPartner.search([('partner_id', '=', partner_id.id)], limit=1)
        if not account_partner:
            return {'status': 'success', 'products': []}

        ProductProduct = request.env['product.product'].sudo()
        mapped_product_ids = request.env['account.product.map'].sudo().search([
            ('account_id', '=', account_partner.id),
            ('active', '=', True)
        ]).product_id.ids

        domain = [('id', 'not in', mapped_product_ids)]
        if search:
            domain = expression.AND([
                domain,
                expression.OR([
                    [('name', 'ilike', search)],
                    [('default_code', 'ilike', search)]
                ])
            ])

        products = ProductProduct.search(domain, limit=50)
        
        result = []
        for p in products:
            result.append({
                'id': p.id,
                'name': p.name,
                'code': p.default_code,
                'image_url': '/web/static/img/placeholder.png'
            })

        return {'status': 'success', 'products': result}

    @http.route('/account/product_mapping/create', type='json', auth='user')
    def account_product_mapping_create(self, **post):
        """Create a new account.product.map"""
        self._ensure_user_lang_context()
        partner_id = request.env.user.partner_id.commercial_partner_id
        product_id = int(post.get('product_id') or 0)
        if not product_id:
            return {'status': 'error', 'message': _('Product ID is required')}
        
        AccountPartner = request.env['account.partner'].sudo()
        account_partner = AccountPartner.search([('partner_id', '=', partner_id.id)], limit=1)
        if not account_partner:
            return {'status': 'error', 'message': _('Account partner not found')}

        try:
            ProductMap = request.env['account.product.map'].sudo()
            account_sku = post.get('account_sku') or ''
            
            existing = ProductMap.with_context(active_test=False).search([
                ('account_id', '=', account_partner.id),
                ('account_sku', '=', account_sku)
            ], limit=1)

            if existing:
                if existing.product_id.id == int(product_id):
                    if not existing.active:
                        existing.write({'active': True})
                    mapping = existing
                else:
                    return {
                        'status': 'error', 
                        'message': _('SKU "%s" is already assigned to another product: %s') % (account_sku, existing.product_id.name)
                    }
            else:
                mapping = ProductMap.create({
                    'product_id': int(product_id),
                    'name': post.get('name'),
                    'account_sku': account_sku,
                    'account_id': account_partner.id,
                    'active': True
                })

            return {
                'status': 'success',
                'id': mapping.id,
                'message': _('Mapping created for %s') % mapping.product_id.name
            }
        except Exception as e:
            return {'status': 'error', 'message': str(e)}
