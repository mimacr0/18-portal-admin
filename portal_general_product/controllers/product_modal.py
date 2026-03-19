# -*- coding: utf-8 -*-
import logging
import base64
from odoo import http, _
from odoo.http import request
from odoo.addons.portal_admin_theme.controllers.admin import PortalAdminController

_logger = logging.getLogger(__name__)

class ProductModalController(PortalAdminController):

    @http.route('/account/stock/get/product', type='json', auth='user')
    def account_stock_get_product(self, mapping_id=None, **kw):
        """Return full product data for edit modal"""
        try:
            mapping = request.env['account.product.map'].sudo().browse(int(mapping_id or 0))
            if not mapping.exists():
                return {'status': 'error', 'message': _('Mapping not found')}
            
            product = mapping.product_id
          
            return {
                'status': 'success',
                'product': {
                    'id': mapping.id,
                    'name': mapping.template_name or product.name,
                    'account_sku': mapping.account_sku or '',
                    'account_ean13': mapping.account_ean13 or '',
                    'account_fnsku': mapping.account_fnsku or '',
                    'account_asin': mapping.account_asin or '',
                    'marketplace': mapping.marketplace or '',
                    'notes': mapping.notes or '',
                    'image_base64': mapping.image_1920.decode('utf-8') if mapping.image_1920 else False
                }
            }
        except Exception as e:
            _logger.error("Error in account_stock_get_product: %s", str(e))
            return {'status': 'error', 'message': str(e)}

    @http.route('/account/stock/update/product', type='json', auth='user')
    def account_stock_update_product(self, **post):
        """Update a single product/mapping with provided fields"""
        try:
            mapping_id = int(post.get('product_id') or 0)
            mapping = request.env['account.product.map'].sudo().browse(mapping_id)
            if not mapping.exists():
                return {'status': 'error', 'message': _('Mapping not found')}
            
            
            # Mapping updates
            map_vals = {}
            for field in ['account_sku', 'account_ean13', 'account_fnsku', 'account_asin', 'marketplace', 'notes', 'template_name']:
                if field in post:
                    map_vals[field] = post.get(field)
            
            if 'name' in post:
                map_vals['template_name'] = post.get('name')

            if 'image_base64' in post:
                image_data = post.get('image_base64')
                if image_data:
                    if ',' in image_data:
                        image_data = image_data.split(',')[1]
                    map_vals['image_1920'] = image_data
                elif image_data is False or image_data == '':
                    map_vals['image_1920'] = False

            if map_vals:
                mapping.write(map_vals)

            return {
                'status': 'success',
                'message': _('Client product updated successfully')
            }
        except Exception as e:
            _logger.error("Error in account_stock_update_product: %s", str(e))
            return {'status': 'error', 'message': str(e)}
