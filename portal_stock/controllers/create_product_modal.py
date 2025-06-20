import json
from odoo import http, _
from odoo.http import request
from odoo.addons.portal_admin_theme.controllers.admin import PortalAdminController


class ProductModalController(PortalAdminController):
    @http.route('/account/stock/get/attributes', type='json', auth='user')
    def account_stock_get_attributes(self, **kw):
        """Return all product attributes for the product creation form"""
        attributes = request.env['product.attribute'].sudo().search([])
        return {
            'status': 'success',
            'attributes': [{'id': attr.id, 'name': attr.name} for attr in attributes]
        }

    @http.route('/account/stock/get/attribute/values', type='json', auth='user')
    def account_stock_get_attribute_values(self, attribute_id, **kw):
        """Return values for a specific attribute"""
        try:
            attribute_id = int(attribute_id)
            attribute = request.env['product.attribute'].sudo().browse(attribute_id)
            values = attribute.value_ids
            return {
                'status': 'success',
                'values': [{'id': value.id, 'name': value.name} for value in values]
            }
        except (ValueError, Exception) as e:
            return {'status': 'error', 'message': str(e)}

    @http.route('/account/stock/create/product', type='json', auth='user')
    def account_stock_create_product(self, **post):
        try:
            # Extraer los datos básicos del producto
            name = post.get('name')
            width = float(post.get('width', 0) or 0)
            height = float(post.get('height', 0) or 0)
            length = float(post.get('length', 0) or 0)
            volume = float(post.get('volume', 0) or 0)
            weight = float(post.get('weight', 0) or 0)
            barcode = post.get('barcode')
            sku = post.get('sku')
            tracking = post.get('tracking', 'none')
            image_base64 = post.get('image_base64')

            # Obtener la cuenta del usuario actual
            partner = request.env.user.partner_id
            account_partner = request.env['account.partner'].sudo().search([('partner_id', '=', partner.id)], limit=1)

            # Crear plantilla de producto
            ProductTemplate = request.env['product.template'].sudo()
            values = {
                'account_partner_id': account_partner.id if account_partner else False,
                'name': name,
                'sale_ok': False,
                'purchase_ok': False,
                'type': 'consu',
                'list_price': 0.0,
                'standard_price': 0.0,
                'volume': volume,
                'weight': weight,
                'barcode': barcode,
                'default_code': sku,
                'is_storable': True,
                'tracking': tracking,
                'image_1920': image_base64,
            }

            template = ProductTemplate.create(values)

            # Manejar atributos si se proporcionan
            if post.get('attributes'):
                attributes_data = json.loads(post.get('attributes') or '[]')

                # Crear líneas de atributos
                for attr_data in attributes_data:
                    attribute_id = attr_data.get('attribute_id')
                    value_ids = attr_data.get('attribute_value_id')

                    if attribute_id and value_ids:
                        # Convertir un valor en una lista si es necesario
                        if not isinstance(value_ids, list):
                            value_ids = [value_ids]

                        # Crear línea de atributos
                        template.write({
                            'attribute_line_ids': [(0, 0, {
                                'attribute_id': int(attribute_id),
                                'value_ids': [(6, 0, [int(v) for v in value_ids if v])]
                            })]
                        })

            # Asegurarse de que todas las variantes tengan los mismos valores de volumen y peso
            for variant in template.product_variant_ids:
                variant.write({
                    'volume': volume,
                    'weight': weight
                })

            qweb = request.env['ir.qweb']
            return {
                'status': 'success',
                'message': _('Product created successfully'),
                'product_id': template.id,
                'product_attributes': qweb._render('portal_stock.portal_update_product_modal', {
                    'products': template.product_variant_ids,
                    'template': template
                })
            }
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

    @http.route('/account/stock/upload/image', type='json', auth='user')
    def upload_image(self, image_data, record_id):
        record = request.env['product.template'].sudo().browse(int(record_id))
        record.image_1920 = image_data  # Campo binary estándar para imágenes
        return {'status': 'ok'}

    @http.route('/account/stock/update/product/variants', type='json', auth='user')
    def account_stock_update_product_variants(self, **post):
        try:
            variants_data = json.loads(post.get('variants', '[]'))

            for variant_data in variants_data:
                product_id = int(variant_data.get('product_id'))
                sku = variant_data.get('sku')
                barcode = variant_data.get('barcode')
                volume = float(variant_data.get('volume', 0) or 0)
                weight = float(variant_data.get('weight', 0) or 0)

                product = request.env['product.product'].sudo().browse(product_id)
                if product.exists():
                    product.write({
                        'default_code': sku,
                        'barcode': barcode,
                        'volume': volume,
                        'weight': weight
                    })

            return {
                'status': 'success',
                'message': _('Product variants updated successfully')
            }
        except Exception as e:
            return {'status': 'error', 'message': str(e)}