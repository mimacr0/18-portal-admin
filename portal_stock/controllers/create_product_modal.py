import json
import traceback

try:
    import openpyxl
except ImportError:
    openpyxl = None

from odoo import http, _
from odoo.http import request
from odoo.addons.portal_admin_theme.controllers.admin import PortalAdminController


class ProductModalController(PortalAdminController):
    @http.route('/account/stock/get/product', type='json', auth='user')
    def account_stock_get_product(self, product_id=None, **kw):
        """Return full product data for edit modal"""
        try:
            if not product_id:
                return {'status': 'error', 'message': _('Missing product identifier')}

            product = request.env['product.product'].sudo().browse(int(product_id))
            if not product.exists():
                return {'status': 'error', 'message': _('Product not found')}

            # Optional: ensure product belongs to current account partner
            partner = request.env.user.partner_id
            account_partner = request.env['account.partner'].sudo().search([
                ('partner_id', '=', partner.commercial_partner_id.id)
            ], limit=1)
            if account_partner and product.account_partner_id.id != account_partner.id:
                return {'status': 'error', 'message': _('You do not have access to this product')}

            template = product.product_tmpl_id.sudo()
            
            # Obtener la imagen directamente de product.product (variante)
            # Primero buscar image_variant_1920, luego image_1920 (que hace fallback al template)
            image_base64 = None
            if product.image_variant_1920:
                image_base64 = product.image_variant_1920
            elif product.image_1920:
                image_base64 = product.image_1920
            
            # Obtener todos los datos directamente de product.product (variante)
            # name puede venir de product.name (que es un campo computado que hace fallback al template)
            # tracking es del template pero lo leemos desde ahí
            # volume en Odoo se almacena en m³, pero el frontend espera cm³, así que convertimos
            volume_cm3 = (product.volume or 0.0) * 1000000 if product.volume else 0.0
            
            return {
                'status': 'success',
                'product': {
                    'id': product.id,
                    'template_id': template.id,
                    'name': product.name or template.name,  # product.name es computado, hace fallback al template
                    'sku': product.default_code or '',  # Solo de la variante
                    'barcode': product.barcode or '',  # Solo de la variante
                    'weight': product.weight or 0.0,  # Solo de la variante
                    'volume': volume_cm3,  # Solo de la variante, convertido de m³ a cm³
                    'tracking': template.tracking or 'none',  # tracking es del template
                    'image_base64': image_base64,  # Imagen en base64 de product.product
                }
            }
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

    @http.route('/account/stock/get/attributes', type='json', auth='user')
    def account_stock_get_attributes(self, **kw):
        """Return all product attributes for the product creation form"""
        # Obtener el idioma del usuario o usar español por defecto
        user_lang = request.env.user.lang or 'es_ES'
        # Obtener atributos con el contexto de idioma
        attributes = request.env['product.attribute'].sudo().with_context(lang=user_lang).search([])
        return {
            'status': 'success',
            'attributes': [{'id': attr.id, 'name': attr.name} for attr in attributes]
        }

    @http.route('/account/stock/get/attribute/values', type='json', auth='user')
    def account_stock_get_attribute_values(self, attribute_id, **kw):
        """Return values for a specific attribute"""
        try:
            attribute_id = int(attribute_id)
            # Obtener el idioma del usuario o usar español por defecto
            user_lang = request.env.user.lang or 'es_ES'
            # Obtener atributo y valores con el contexto de idioma
            attribute = request.env['product.attribute'].sudo().with_context(lang=user_lang).browse(attribute_id)
            values = attribute.value_ids.with_context(lang=user_lang)
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

            # Obtener la cuenta de la empresa del usuario actual para asociar el producto a la empresa
            partner = request.env.user.partner_id
            account_partner = request.env['account.partner'].sudo().search([('partner_id', '=', partner.commercial_partner_id.id)], limit=1)

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

                # Agrupar valores por atributo para evitar duplicados
                attribute_map = {}
                for attr_data in attributes_data:
                    attribute_id = attr_data.get('attribute_id')
                    value_ids = attr_data.get('attribute_value_id')

                    if attribute_id and value_ids:
                        # Convertir un valor en una lista si es necesario
                        if not isinstance(value_ids, list):
                            value_ids = [value_ids]
                        
                        # Agrupar valores por atributo
                        attr_key = int(attribute_id)
                        if attr_key not in attribute_map:
                            attribute_map[attr_key] = set()
                        attribute_map[attr_key].update(int(v) for v in value_ids if v)

                # Crear todas las líneas de atributos de una vez
                if attribute_map:
                    attribute_lines = []
                    for attribute_id, value_ids in attribute_map.items():
                        attribute_lines.append((0, 0, {
                            'attribute_id': attribute_id,
                            'value_ids': [(6, 0, list(value_ids))]
                        }))
                    template.write({'attribute_line_ids': attribute_lines})

            # Asegurarse de que todas las variantes tengan los mismos valores de volumen y peso
            for variant in template.product_variant_ids:
                variant.write({
                    'volume': volume,
                    'weight': weight
                })

            # Asegurar que el contexto use el idioma del usuario para las traducciones
            self._ensure_user_lang_context()
            user_lang = request.env.user.sudo().lang or 'en_US'
            
            # Send recent activity notification
            user = request.env.user
            user.send_portal_user_recent_activity(
                "Product '%s' created",
                "New product",
                "fas fa-box",
                "success",
                message_args=[template.name]
            )
            
            qweb = request.env['ir.qweb'].with_context(lang=user_lang)
            return {
                'status': 'success',
                'message': _('Product created successfully'),
                'product_id': template.id,
                'product_attributes': qweb._render('portal_stock.portal_update_product_modal', {
                    'products': template.product_variant_ids,
                    'template': template,
                    'page_name': 'stock'
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

    @http.route('/account/stock/update/product', type='json', auth='user')
    def account_stock_update_product(self, **post):
        """Update a single product with provided fields
        
        Si el producto tiene tracking='serial', solo actualiza la variante específica.
        Si no tiene tracking='serial', actualiza tanto el template como la variante.
        """
        try:
            product_id = int(post.get('product_id'))
            name = post.get('name')
            weight = float(post.get('weight', 0) or 0)
            volume = float(post.get('volume', 0) or 0)
            barcode = post.get('barcode')
            sku = post.get('sku')
            tracking = post.get('tracking', 'none')
            image_base64 = post.get('image_base64')

            Product = request.env['product.product'].sudo()
            product = Product.browse(product_id)
            if not product.exists():
                return {'status': 'error', 'message': _('Product not found')}

            # Optional: ensure product belongs to current account partner
            partner = request.env.user.partner_id
            account_partner = request.env['account.partner'].sudo().search([
                ('partner_id', '=', partner.commercial_partner_id.id)
            ], limit=1)
            if account_partner and product.account_partner_id.id != account_partner.id:
                return {'status': 'error', 'message': _('You do not have access to this product')}

            template = product.product_tmpl_id.sudo()
            
            # Actualizar siempre en product.product (variante), independientemente del tracking
            # Convertir volumen de cm³ a m³ (como en _create_product_from_data)
            volume_m3 = volume / 1000000 if volume > 0 else 0
            
            # Campos que se actualizan en la variante (product.product)
            prod_vals = {}
            if sku is not None:
                prod_vals['default_code'] = sku
            if barcode is not None:
                prod_vals['barcode'] = barcode
            if weight is not None:
                prod_vals['weight'] = weight
            if volume is not None:
                prod_vals['volume'] = volume_m3
            if image_base64:
                # Usar image_variant_1920 para guardar en la variante
                prod_vals['image_variant_1920'] = image_base64
            
            if prod_vals:
                product.write(prod_vals)
            
            # Campos que solo existen en el template (name y tracking)
            tmpl_vals = {}
            if name is not None:
                tmpl_vals['name'] = name
            if tracking is not None:
                tmpl_vals['tracking'] = tracking or 'none'
            
            if tmpl_vals:
                template.write(tmpl_vals)

            return {
                'status': 'success',
                'message': _('Product updated successfully')
            }
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

    # ==========================================
    # Product Import Helper Methods
    # ==========================================
    
    def _clean_header(self, value):
        """Clean header value: remove asterisks and extra whitespace."""
        if not value:
            return ''
        return value.lower().replace('*', '').strip()
    
    def _get_attribute_columns(self, headers, col_idx):
        """Detect columns that match product.attribute names.
        
        Busca atributos en todos los idiomas instalados para encontrar coincidencias.
        
        Returns: dict {header_name: (column_index, attribute_record)}
        """
        ProductAttribute = request.env['product.attribute'].sudo()
        all_attributes = ProductAttribute.search([])
        
        # Obtener todos los idiomas instalados
        installed_langs = request.env['res.lang'].get_installed()
        lang_codes = [lang_code for lang_code, _ in installed_langs]
        
        attribute_columns = {}
        for attr in all_attributes:
            # Buscar el nombre del atributo en todos los idiomas
            attr_names = set()
            attr_names.add(attr.name.lower().strip())  # Nombre en idioma actual
            
            # Buscar en todos los idiomas instalados
            for lang_code in lang_codes:
                attr_with_lang = attr.with_context(lang=lang_code)
                attr_name_lang = attr_with_lang.name.lower().strip()
                if attr_name_lang:
                    attr_names.add(attr_name_lang)
            
            # Buscar coincidencia con cualquier header
            for header, idx in col_idx.items():
                header_lower = header.lower().strip()
                if header_lower in attr_names:
                    attribute_columns[header_lower] = (idx, attr)
                    break
        
        return attribute_columns
    
    def _validate_product_row(self, row, col_idx, row_num, attribute_columns=None):
        """Validate a single product row from Excel.
        
        Returns: (is_valid, data_dict, error_message)
        """
        # Get name (required)
        name = str(row[col_idx['name']] or '').strip()
        if not name:
            return False, None, _('Row %d: Missing product name') % row_num
        
        # Get tracking (required)
        tracking = str(row[col_idx['tracking']] or '').strip().lower()
        if tracking not in ['serial', 'none']:
            return False, None, _('Row %d: Invalid tracking value "%s" (must be "serial" or "none")') % (row_num, tracking)
        
        # Get dimensions (required)
        try:
            width = float(row[col_idx['width']] or 0)
            height = float(row[col_idx['height']] or 0)
            length = float(row[col_idx['length']] or 0)
            weight = float(row[col_idx['weight']] or 0)
            
            if width <= 0 or height <= 0 or length <= 0:
                return False, None, _('Row %d: Dimensions must be greater than 0') % row_num
            if weight < 0:
                return False, None, _('Row %d: Weight cannot be negative') % row_num
        except (ValueError, TypeError):
            return False, None, _('Row %d: Invalid numeric values for dimensions or weight') % row_num
        
        # Optional fields
        sku = str(row[col_idx.get('sku', -1)] or '').strip() if 'sku' in col_idx else ''
        barcode = str(row[col_idx.get('barcode', -1)] or '').strip() if 'barcode' in col_idx else ''
        
        # Extraer atributos: {attribute_id: [value_ids]}
        attributes_data = {}
        if attribute_columns:
            ProductAttributeValue = request.env['product.attribute.value'].sudo()
            for attr_header, (attr_col_idx, attribute) in attribute_columns.items():
                attr_value_str = str(row[attr_col_idx] or '').strip()
                if attr_value_str:
                    # Split por coma para múltiples valores
                    value_names = [
                        v.strip().replace('\xa0', ' ').replace('\u00a0', ' ').strip()
                        for v in attr_value_str.replace('\xa0', ' ').replace('\u00a0', ' ').split(',')
                        if v.strip()
                    ]
                    
                    value_data = []  # Lista de tuplas (value_id, value_name_en)
                    # Obtener todos los idiomas instalados
                    installed_langs = request.env['res.lang'].get_installed()
                    lang_codes = [lang_code for lang_code, _ in installed_langs]
                    
                    for value_name in value_names:
                        attr_value = None
                        # Primero buscar en inglés (ya que el usuario escribe en inglés)
                        if 'en_US' in lang_codes:
                            attr_value = ProductAttributeValue.with_context(lang='en_US').search([
                                ('attribute_id', '=', attribute.id),
                                ('name', '=ilike', value_name)
                            ], limit=1)
                        
                        # Si no encuentra en inglés, buscar en todos los idiomas instalados
                        if not attr_value:
                            for lang_code in lang_codes:
                                if lang_code != 'en_US':  # Ya buscamos en inglés
                                    attr_value = ProductAttributeValue.with_context(lang=lang_code).search([
                                        ('attribute_id', '=', attribute.id),
                                        ('name', '=ilike', value_name)
                                    ], limit=1)
                                    if attr_value:
                                        break
                        
                        if attr_value:
                            # Obtener nombre en inglés para el SKU
                            attr_value_en = attr_value.with_context(lang='en_US')
                            value_data.append((attr_value.id, attr_value_en.name))
                    if value_data:
                        # Ordenar por value_id de menor a mayor
                        value_data.sort(key=lambda x: x[0])
                        attributes_data[attribute.id] = value_data

        return True, {
            'name': name,
            'tracking': tracking,
            'width': width,
            'height': height,
            'length': length,
            'weight': weight,
            'volume': width * height * length,
            'sku': sku,
            'barcode': barcode,
            'attributes': attributes_data,  # {attribute_id: [value_ids]}
        }, None
    
    def _clean_text_for_sku(self, text, max_length=None):
        """Limpia texto para usar en SKU: solo alfanuméricos, sin espacios, mayúsculas.
        
        El método equivalente está disponible en product.product._clean_text_for_sku()
        """
        if not text:
            return ''
        cleaned = ''.join(c for c in text if c.isalnum() or c.isspace()).replace(' ', '').upper()
        return cleaned[:max_length] if max_length else cleaned

    def _create_product_from_data(self, data, account_partner):
        """Create product template from validated data dict.
        
        Returns: product.template record
        """
        ProductTemplate = request.env['product.template'].sudo()
        
        if not data['sku']:
            sku = account_partner.name[:10] + data['name'][:4]
        else:
            sku = data['sku']

        values = {
            'account_partner_id': account_partner.id if account_partner else False,
            'name': data['name'],
            'sale_ok': False,
            'purchase_ok': False,
            'type': 'consu',
            'list_price': 0.0,
            'standard_price': 0.0,
            'volume': data['volume'] / 1000000,  # Convert cm³ to m³
            'weight': data['weight'],
            'barcode': data['barcode'] or False,
            'internal_reference': sku or False,
            'is_storable': True,
            'tracking': data['tracking'],
        }
        
        return ProductTemplate.create(values)
    
    def _process_product_attributes(self, template, row, attribute_columns, row_num):
        """Process and create attribute lines for a product.
        
        Supports multiple values per attribute separated by comma.
        Example: "Black, White, Blue" will create 3 attribute values for Color.
        If attribute line already exists, adds new values to existing ones instead of replacing.
        
        Returns: list of warning messages
        """
        warnings = []
        ProductAttributeValue = request.env['product.attribute.value'].sudo()
        AttributeLine = request.env['product.template.attribute.line'].sudo()
        
        # Obtener todos los idiomas instalados para buscar valores
        installed_langs = request.env['res.lang'].get_installed()
        lang_codes = [lang_code for lang_code, _ in installed_langs]
        
        for attr_header, (attr_col_idx, attribute) in attribute_columns.items():
            attr_value_str = str(row[attr_col_idx] or '').strip()
            if attr_value_str:
                # Split by comma to support multiple values
                # Also replace non-breaking spaces and clean whitespace
                value_names = [
                    v.strip().replace('\xa0', ' ').replace('\u00a0', ' ').strip()
                    for v in attr_value_str.replace('\xa0', ' ').replace('\u00a0', ' ').split(',')
                    if v.strip()
                ]
                
                found_value_ids = []
                for value_name in value_names:
                    attr_value = None
                    # Primero buscar en inglés (ya que el usuario escribe en inglés)
                    if 'en_US' in lang_codes:
                        attr_value = ProductAttributeValue.with_context(lang='en_US').search([
                            ('attribute_id', '=', attribute.id),
                            ('name', '=ilike', value_name)
                        ], limit=1)
                    
                    # Si no encuentra en inglés, buscar en todos los idiomas instalados
                    if not attr_value:
                        for lang_code in lang_codes:
                            if lang_code != 'en_US':  # Ya buscamos en inglés
                                attr_value = ProductAttributeValue.with_context(lang=lang_code).search([
                                    ('attribute_id', '=', attribute.id),
                                    ('name', '=ilike', value_name)
                                ], limit=1)
                                if attr_value:
                                    break
                    
                    if attr_value:
                        found_value_ids.append(attr_value.id)
                    else:
                        warnings.append(_('Row %d: Attribute value "%s" not found for "%s"') % (row_num, value_name, attribute.name))
                
                if found_value_ids:
                    # Buscar si ya existe una línea de atributo para este atributo
                    existing_line = AttributeLine.search([
                        ('product_tmpl_id', '=', template.id),
                        ('attribute_id', '=', attribute.id)
                    ], limit=1)
                    
                    if existing_line:
                        # Si existe, obtener los value_ids actuales y agregar los nuevos (sin duplicados)
                        current_value_ids = existing_line.value_ids.ids
                        # Actualizar agregando solo los nuevos valores
                        new_value_ids = [vid for vid in found_value_ids if vid not in current_value_ids]
                        if new_value_ids:
                            existing_line.write({
                                'value_ids': [(4, vid) for vid in new_value_ids]
                            })
                            existing_line.invalidate_recordset(['value_ids'])
                    else:
                        # Si no existe, crear una nueva línea
                        AttributeLine.create({
                            'product_tmpl_id': template.id,
                            'attribute_id': attribute.id,
                            'value_ids': [(6, 0, found_value_ids)]
                        })
        
        return warnings
    
    
    def _update_variant_dimensions(self, template, volume, weight):
        """Update all variants with the same volume and weight."""
        for variant in template.product_variant_ids:
            variant.write({
                'volume': volume / 1000000,
                'weight': weight
            })
    
    def _send_import_notification(self, created_count):
        """Send notification about imported products."""
        if created_count > 0:
            user = request.env.user
            user.send_portal_user_recent_activity(
                "%d product(s) imported from Excel",
                "Products imported",
                "fas fa-file-import",
                "success",
                message_args=[created_count]
            )

    # ==========================================
    # Product Import Endpoint
    # ==========================================

    @http.route('/account/stock/import_products', type='http', auth='user', methods=['POST'], csrf=False)
    def account_stock_import_products(self, file=None, **kw):
        """Import products from Excel (XLSX) file.
        
        Required columns: name, tracking, width, height, length, weight
        Optional columns: sku, barcode
        Attribute columns: Any column matching a product.attribute name (e.g., Color, RAM, ROM)
                          Multiple values separated by comma: "Black, White, Blue"
        """
        self._ensure_user_lang_context()
        
        if not openpyxl:
            return request.make_json_response({
                'status': 'error',
                'message': _('Excel import not available. Please install openpyxl.')
            })
        
        if not file:
            return request.make_json_response({
                'status': 'error',
                'message': _('No file provided')
            })
        
        try:
            # Read Excel file
            workbook = openpyxl.load_workbook(file, data_only=True)
            sheet = workbook.active
            
            # Get headers
            headers = [self._clean_header(cell.value) for cell in sheet[1]]
            
            # Validate required columns
            required_cols = ['name', 'tracking', 'width', 'height', 'length', 'weight']
            missing_cols = [col for col in required_cols if col not in headers]
            if missing_cols:
                return request.make_json_response({
                    'status': 'error',
                    'message': _('Missing required columns: %s') % ', '.join(missing_cols)
                })
            
            # Setup
            col_idx = {header: idx for idx, header in enumerate(headers)}
            attribute_columns = self._get_attribute_columns(headers, col_idx)
            
            partner = request.env.user.partner_id
            account_partner = request.env['account.partner'].sudo().search([
                ('partner_id', '=', partner.commercial_partner_id.id)
            ], limit=1)
            ProductTemplate = request.env['product.template'].sudo()
            ProductProduct = request.env['product.product'].sudo()
            
            errors = []
            warnings = []
            created_count = 0
            created_templates = []
            created_variants = []
            row_num = 1
            
            # Process rows
            for row in sheet.iter_rows(min_row=2, values_only=True):
                row_num += 1
                
                if not any(row):
                    continue
                
                # Validate row and extract data (including attributes)
                is_valid, data, error = self._validate_product_row(row, col_idx, row_num, attribute_columns)
                if not is_valid:
                    errors.append(error)
                    continue
                
                # Agregar account_partner a data
                data['account_partner'] = account_partner

                # Buscar si el producto ya existe (por nombre, internal_reference, barcode)
                existing_template = None
                skip_row = False
                
                # Buscar por nombre del producto
                if data['name']:
                    existing_template = ProductTemplate.search([
                        ('name', '=', data['name']),
                        ('account_partner_id', '=', account_partner.id if account_partner else False)
                    ], limit=1)
                
                # Si no se encontró por nombre, buscar por internal_reference (default_code)
                if not existing_template and data.get('sku'):
                    existing_template = ProductTemplate.search([
                        ('default_code', '=', data['sku']),
                        ('account_partner_id', '=', account_partner.id if account_partner else False)
                    ], limit=1)
                
                # Si no se encontró por nombre ni internal_reference, buscar por barcode
                if not existing_template and data.get('barcode'):
                    existing_template = ProductTemplate.search([
                        ('barcode', '=', data['barcode']),
                        ('account_partner_id', '=', account_partner.id if account_partner else False)
                    ], limit=1)
                    if not existing_template:
                        # Buscar también en variantes
                        existing_product = ProductProduct.search([
                            ('barcode', '=', data['barcode'])
                        ], limit=1)
                        if existing_product:
                            existing_template = existing_product.product_tmpl_id
                            # Si el producto existe pero no tiene SKU, asignarle uno
                            if existing_product and not existing_product.default_code:
                                existing_product.ensure_default_code(account_partner=account_partner)
                
                # Si el producto existe, actualizar atributos; si no, crear nuevo
                try:
                    if existing_template:
                        # Producto existe: actualizar atributos
                        template = existing_template
                    else:
                        # Producto no existe: crear nuevo
                        template = self._create_product_from_data(data, account_partner)
                    
                    # Process attributes
                    attr_warnings = self._process_product_attributes(template, row, attribute_columns, row_num)
                    warnings.extend(attr_warnings)
                    
                    # Verificar que se crearon todas las líneas de atributos
                    attribute_lines_count = len(template.attribute_line_ids)
                    expected_lines = len(attribute_columns) if attribute_columns else 0
                    if attribute_lines_count < expected_lines:
                        warnings.append(_('Row %d: Expected %d attribute lines but only %d were created') % (
                            row_num, expected_lines, attribute_lines_count
                        ))
                    
                    # Forzar regeneración de variantes para asegurar que se crean todas las combinaciones
                    template._create_variant_ids()
                    
                    # Update variants
                    self._update_variant_dimensions(template, data['volume'], data['weight'])
                    
                    # Obtener las variantes creadas (se generan automáticamente después de procesar atributos)
                    variants = template.product_variant_ids
                    
                    # Generar y asignar SKUs a cada variante usando el método del modelo
                    for variant in variants:
                        if not variant.default_code:
                            variant.ensure_default_code(account_partner=account_partner)
                    
                    created_count += 1
                    created_templates.append(template)
                    created_variants.extend(variants)
                except Exception as e:
                    errors.append(_('Row %d: Error creating product - %s') % (row_num, str(e)))
                    continue
            
            # Handle results
            if errors and created_count == 0:
                return request.make_json_response({
                    'status': 'error',
                    'message': _('Import failed with %d errors.') % len(errors),
                    'errors': errors[:10],
                    'traceback': ''
                })
            
            self._send_import_notification(created_count)
            
            variant_count = len(created_variants)
            return request.make_json_response({
                'status': 'success',
                'message': _('%d product template(s) and %d variant(s) created successfully.') % (created_count, variant_count),
                'created': created_count,
                'created_variants': variant_count,
                'templates': [{'id': t.id, 'name': t.name} for t in created_templates],
                'variants': [{'id': v.id, 'name': v.name, 'default_code': v.default_code} for v in created_variants],
                'errors': (warnings + errors)[:10] if (warnings or errors) else [],
                'reload': True
            })
            
        except Exception as e:
            return request.make_json_response({
                'status': 'error',
                'message': _('Import failed: %s') % str(e),
                'traceback': traceback.format_exc()
            })

    @http.route('/account/stock/download_products_template', type='http', auth='user', methods=['GET'])
    def download_products_template(self, **kw):
        """Generate and download products import template with attribute values sheet."""
        import io
        
        if not openpyxl:
            return request.make_response(
                'Excel generation not available. Please install openpyxl.',
                headers=[('Content-Type', 'text/plain')]
            )
        
        try:
            from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
            
            workbook = openpyxl.Workbook()
            
            # ============================================
            # Sheet 1: Products Template
            # ============================================
            sheet1 = workbook.active
            sheet1.title = 'Products'
            
            # Get all attributes
            ProductAttribute = request.env['product.attribute'].sudo().with_context(lang='en_US')
            all_attributes = ProductAttribute.search([], order='name')
            
            # Define headers
            base_headers = ['name*', 'tracking*', 'width*', 'height*', 'length*', 'weight*', 'sku', 'barcode']
            attribute_headers = [attr.name for attr in all_attributes]
            all_headers = base_headers + attribute_headers
            
            # Header styles
            header_font = Font(bold=True, color='FFFFFF')
            required_fill = PatternFill(start_color='4472C4', end_color='4472C4', fill_type='solid')
            optional_fill = PatternFill(start_color='70AD47', end_color='70AD47', fill_type='solid')
            attribute_fill = PatternFill(start_color='ED7D31', end_color='ED7D31', fill_type='solid')
            thin_border = Border(
                left=Side(style='thin'),
                right=Side(style='thin'),
                top=Side(style='thin'),
                bottom=Side(style='thin')
            )
            
            # Write headers
            for col, header in enumerate(all_headers, 1):
                cell = sheet1.cell(row=1, column=col, value=header)
                cell.font = header_font
                cell.border = thin_border
                cell.alignment = Alignment(horizontal='center')
                
                if header.endswith('*'):
                    cell.fill = required_fill
                elif header in ['sku', 'barcode']:
                    cell.fill = optional_fill
                else:
                    cell.fill = attribute_fill
            
            # Add example row
            example_row = ['Product Example', 'serial', 10, 5, 2, 0.5, 'SKU001', '1234567890123']
            # Add example values for attribute columns (fake data)
            example_attribute_values = [''] * len(attribute_headers)
            if example_attribute_values:
                example_attribute_values[0] = 'Red, Blue'
            if len(example_attribute_values) > 1:
                example_attribute_values[1] = '64GB, 128GB'
            example_row.extend(example_attribute_values)
            
            for col, value in enumerate(example_row, 1):
                cell = sheet1.cell(row=2, column=col, value=value)
                cell.border = thin_border
            
            # Set column widths
            for col in range(1, len(all_headers) + 1):
                sheet1.column_dimensions[openpyxl.utils.get_column_letter(col)].width = 15
            
            # ============================================
            # Sheet 2: Instructions
            # ============================================
            sheet2 = workbook.create_sheet('Instructions')
            
            instructions = [
                ['PRODUCT IMPORT TEMPLATE INSTRUCTIONS'],
                [''],
                ['REQUIRED COLUMNS (Blue):'],
                ['name*', 'Product name'],
                ['tracking*', 'Tracking type: "serial" or "none"'],
                ['width*', 'Width in centimeters (cm)'],
                ['height*', 'Height in centimeters (cm)'],
                ['length*', 'Length in centimeters (cm)'],
                ['weight*', 'Weight in kilograms (kg)'],
                [''],
                ['OPTIONAL COLUMNS (Green):'],
                ['sku', 'Internal reference code'],
                ['barcode', 'Product barcode (EAN13, etc.)'],
                [''],
                ['ATTRIBUTE COLUMNS (Orange):'],
                ['Use values from the "Attribute Values" sheet'],
                ['If a product has multiple values for an attribute, separate them with commas (e.g. "Red, Blue")'],
                ['Leave empty if product does not have that attribute'],
                [''],
                ['中文说明:'],
                ['必填列（蓝色）:'],
                ['name*', '产品名称'],
                ['tracking*', '跟踪类型: "serial" 或 "none"'],
                ['width*', '宽度（厘米）'],
                ['height*', '高度（厘米）'],
                ['length*', '长度（厘米）'],
                ['weight*', '重量（千克）'],
                [''],
                ['可选列（绿色）:'],
                ['sku', '内部参考代码'],
                ['barcode', '产品条码（EAN13 等）'],
                [''],
                ['属性列（橙色）:'],
                ['使用“Attribute Values”表中的值'],
                ['如需填写多个属性值，请用逗号分隔（例如 "Red, Blue"）'],
                ['如果产品没有该属性，请留空'],
            ]
            
            for row_idx, row_data in enumerate(instructions, 1):
                for col_idx, value in enumerate(row_data, 1):
                    cell = sheet2.cell(row=row_idx, column=col_idx, value=value)
                    if row_idx == 1:
                        cell.font = Font(bold=True, size=14)
                    elif value in ['REQUIRED COLUMNS (Blue):', 'OPTIONAL COLUMNS (Green):', 'ATTRIBUTE COLUMNS (Orange):']:
                        cell.font = Font(bold=True)
            
            sheet2.column_dimensions['A'].width = 20
            sheet2.column_dimensions['B'].width = 50
            
            # ============================================
            # Sheet 3: Attribute Values
            # ============================================
            sheet3 = workbook.create_sheet('Attribute Values')
            
            ProductAttributeValue = request.env['product.attribute.value'].sudo().with_context(lang='en_US')
            
            # Write attribute names as headers
            for col, attr in enumerate(all_attributes, 1):
                cell = sheet3.cell(row=1, column=col, value=attr.name)
                cell.font = Font(bold=True, color='FFFFFF')
                cell.fill = attribute_fill
                cell.border = thin_border
                cell.alignment = Alignment(horizontal='center')
                sheet3.column_dimensions[openpyxl.utils.get_column_letter(col)].width = 15
            
            # Write attribute values
            for col, attr in enumerate(all_attributes, 1):
                values = ProductAttributeValue.search([
                    ('attribute_id', '=', attr.id)
                ], order='sequence, id')
                
                for row, value in enumerate(values, 2):
                    cell = sheet3.cell(row=row, column=col, value=value.name)
                    cell.border = thin_border
            
            # Save to bytes
            output = io.BytesIO()
            workbook.save(output)
            output.seek(0)
            
            return request.make_response(
                output.read(),
                headers=[
                    ('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
                    ('Content-Disposition', 'attachment; filename=products_template.xlsx')
                ]
            )
            
        except Exception as e:
            import traceback
            error_msg = f'Error generating template: {str(e)}\n{traceback.format_exc()}'
            return request.make_response(
                error_msg,
                headers=[('Content-Type', 'text/plain')]
            )