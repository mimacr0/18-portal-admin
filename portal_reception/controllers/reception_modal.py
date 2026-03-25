import math
import json
import re
import pytz
import logging
from datetime import datetime

from odoo import fields, http, _
from odoo.http import request
from odoo.osv import expression
from odoo.tools import float_round

_logger = logging.getLogger(__name__)
from odoo.addons.portal_reception.controllers.reception_details import PortalReceptionDetailsController


class PortalReceptionModalController(PortalReceptionDetailsController):
    """Controller for reception creation modal and search endpoints"""

    @http.route('/account/reception/calculate_rates', type='json', auth='user')
    def account_reception_calculate_rates(self, **post):
        """Calculate shipping rates for various carriers based on package data and destination"""
        self._ensure_user_lang_context()
        packages_data = json.loads(post.get('packages_data') or '[]')
        sender_country_id = post.get('sender_country_id')
        receiver_country_id = post.get('receiver_country_id')

        if not packages_data:
            return {'status': 'success', 'carriers': []}

        # Filter carriers by both origin and destination countries: 
        # selectable if carrier.country_ids is empty OR if it contains either sender or receiver country
        domain = [('active', '=', True)]
        countries_to_match = []
        if sender_country_id:
            countries_to_match.append(int(sender_country_id))

        # ESTO SE COMENTA SI LOS PAQUETES SOLO TIENEN COMO DESTINO LA EMRPESA MIMACRO
        # if receiver_country_id:
        #     countries_to_match.append(int(receiver_country_id))
            
        try:
            if countries_to_match:
                domain = expression.AND([domain, [
                    # '|', ('country_ids', '=', False), 
                    ('country_ids', 'in', list(set(countries_to_match)))
                ]])
        except (ValueError, TypeError) as e:
            _logger.error("Invalid country IDs provided for rate calculation: %s", e)
            return {'status': 'error', 'message': _('Invalid country data provided.')}
            
        _logger.info("Computing rates for %d packages. Route: %s -> %s", len(packages_data), sender_country_id, receiver_country_id)
        Carriers = request.env['delivery.carrier'].sudo().search(domain)
        
        # Calculate totals for rule evaluation
        total_weight = 0.0
        total_volume = 0.0
        total_quantity = 0.0
        for p in packages_data:
            weight = float(p.get('weight', 0))
            length = float(p.get('length', 0))
            width = float(p.get('width', 0))
            height = float(p.get('height', 0))
            
            total_weight += weight
            # Volume in m3 (assuming cm inputs)
            total_volume += (length * width * height) / 1000000.0
            total_quantity += float(p.get('units', 1.0)) # Each unit in package adds to total qty for rules
        
        results = []
        for carrier in Carriers:
            price = 0.0
            try:
                if carrier.delivery_type == 'fixed':
                    price = float(carrier.fixed_price)
                elif carrier.delivery_type == 'base_on_rule':
                    # total is value of goods, we don't have them yet, so 0.0
                    price = carrier._get_price_from_picking(
                        total=0.0, 
                        weight=total_weight, 
                        volume=total_volume, 
                        quantity=total_quantity
                    )
                else:
                    # Fallback for other types if they have fixed_price, otherwise small default
                    price = float(getattr(carrier, 'fixed_price', 5.0))
                    # Apply simulated weight factor for unknown types
                    price += (float(total_weight) * 1.2)
                
                # Price is now calculated solely based on carrier logic (Fixed or Rules)
                results.append({
                    'id': carrier.id,
                    'name': carrier.name,
                    'price': float_round(price, precision_digits=2),
                    'currency': carrier.currency_id.symbol or '€',
                    'delivery_type': dict(carrier._fields['delivery_type'].selection).get(carrier.delivery_type, carrier.delivery_type),
                })
            except Exception as e:
                _logger.warning("Could not calculate rate for carrier %s: %s", carrier.name, e)
                continue

        return {'status': 'success', 'carriers': sorted(results, key=lambda x: x['price'])}

    @http.route('/account/reception/create', type='json', auth='user')
    def account_reception_create(self, **post):
        """Create a new reception package"""
        self._ensure_user_lang_context()
        partner = request.env.user.partner_id

        StockQuantPackage = request.env['stock.quant.package'].sudo()
        AccountPartner = request.env['account.partner'].sudo()
        ResPartner = request.env['res.partner'].sudo()

        def _to_int(val):
            if val and str(val).isdigit():
                return int(val)
            return False

        sender_id = post.get('sender_id')
        carrier_id = post.get('carrier_id')
        notes = post.get('notes')
        packages_data = json.loads(post.get('packages_data') or '[]')
        reception_type = post.get('type', 'return')

        if not packages_data:
            return {'status': 'error', 'message': _('Please add at least one package')}

        if not carrier_id:
            return {'status': 'error', 'message': _('Please select a carrier')}

        total_weight = float(sum([float(p.get('weight', 0)) for p in packages_data]))
        number_of_packages = len(packages_data) # Each UI row represents one package-item (bulto)
        total_units = sum([float(p.get('units', 1)) for p in packages_data])

        account_partner = AccountPartner.search([('partner_id', '=', partner.commercial_partner_id.id)], limit=1)
        if not account_partner:
            return {'status': 'error', 'message': _('Account partner not found for this user.')}

        # If no sender_id, create a new sender from sender fields
        if not sender_id:
            sender_name = post.get('sender_name', '').strip()
            if sender_name:
                sender_country_id = post.get('sender_country_id')
                new_sender = ResPartner.create({
                    'name': sender_name,
                    'type': 'sender',
                    'parent_id': partner.commercial_partner_id.id,
                    'street': post.get('sender_street', ''),
                    'city': post.get('sender_city', ''),
                    'zip': post.get('sender_zip', ''),
                    'state_id': _to_int(post.get('sender_state_id')),
                    'country_id': _to_int(sender_country_id),
                    'email': post.get('sender_email', ''),
                    'phone': post.get('sender_phone', ''),
                })
                sender_id = new_sender.id

        # Always create shipping address from receiver fields
        shipping_address_id = False
        receiver_name = post.get('receiver_name', '').strip()
        if receiver_name:
            receiver_country_id = post.get('receiver_country_id')
            new_shipping = ResPartner.create({
                'name': receiver_name,
                'type': 'delivery',
                'parent_id': partner.commercial_partner_id.id,
                'street': post.get('receiver_street', ''),
                'city': post.get('receiver_city', ''),
                'zip': post.get('receiver_zip', ''),
                'state_id': _to_int(post.get('receiver_state_id')),
                'country_id': _to_int(receiver_country_id),
                'email': post.get('receiver_email', ''),
                'phone': post.get('receiver_phone', ''),
            })
            shipping_address_id = new_shipping.id

        package_vals = {
            'carrier_id': int(carrier_id) if carrier_id else False,
            'owner_id': partner.commercial_partner_id.id,
            'sender_id': int(sender_id) if sender_id else False,
            'shipping_address_id': int(shipping_address_id) if shipping_address_id else False,
            'number_of_packages': number_of_packages or 1,
            'type': reception_type,
            'notes': notes,
            'shipping_weight': total_weight,
            'pack_date': fields.Date.today(),
        }

        # Use set_name_based_on_account if it exists and we want specific sequence
        if hasattr(StockQuantPackage, 'set_name_based_on_account'):
            package_vals['name'] = StockQuantPackage.set_name_based_on_account(account_partner)

        # Set dimensions from the first package if available (as declared by client)
        if packages_data:
            p0 = packages_data[0]
            if 'length' in p0: package_vals['packaging_length'] = float(p0.get('length', 0))
            if 'width' in p0: package_vals['width'] = float(p0.get('width', 0))
            if 'height' in p0: package_vals['height'] = float(p0.get('height', 0))

        try:
            # 1. CREATE PACKAGES AND RMA LINES
            created_packages = []
            GenericProduct = request.env.ref('portal_reception.product_generic_reception', raise_if_not_found=False)

            for i, p in enumerate(packages_data):
                # Specific values for this individual package
                p_weight = float(p.get('weight', 0))
                p_len = float(p.get('length', 0))
                p_wid = float(p.get('width', 0))
                p_hei = float(p.get('height', 0))

                p_vals = {
                    'carrier_id': int(carrier_id) if carrier_id and str(carrier_id).isdigit() else False,
                    'owner_id': partner.commercial_partner_id.id,
                    'sender_id': int(sender_id) if sender_id and str(sender_id).isdigit() else (sender_id if isinstance(sender_id, int) else False),
                    'shipping_address_id': int(shipping_address_id) if shipping_address_id and str(shipping_address_id).isdigit() else (shipping_address_id if isinstance(shipping_address_id, int) else False),
                    'number_of_packages': 1,
                    'type': reception_type,
                    'notes': notes,
                    'shipping_weight': p_weight,
                    'packaging_length': p_len,
                    'width': p_wid,
                    'height': p_hei,
                    'pack_date': fields.Date.today(),
                }

                if hasattr(StockQuantPackage, 'set_name_based_on_account'):
                    p_vals['name'] = StockQuantPackage.set_name_based_on_account(account_partner)

                package = StockQuantPackage.create(p_vals)
                created_packages.append(package)

                # Create RMA Line for this specific package
                product_name = p.get('product_name', '').strip()
                mapping = False
                
                if product_name:
                    mapping = request.env['account.product.map'].sudo().search([
                        ('account_id', '=', account_partner.id),
                        ('name', '=', product_name),
                        ('active', '=', True)
                    ], limit=1)
                
                if not mapping:
                    mapping = request.env['account.product.map'].sudo().search([
                        ('account_id', '=', account_partner.id),
                        ('product_id', '=', GenericProduct.id if GenericProduct else False),
                    ], limit=1)
                    
                    if not mapping and GenericProduct:
                        mapping = request.env['account.product.map'].sudo().create({
                            'account_id': account_partner.id,
                            'product_id': GenericProduct.id,
                            'name': _("Generic Product"),
                            'active': True
                        })

                if mapping:
                    request.env['rma.package.line'].sudo().create({
                        'package_id': package.id,
                        'product_map_id': mapping.id,
                        'quantity': float(p.get('units', 1)),
                    })

            # 2. CREATE SALE ORDER
            carrier = request.env['delivery.carrier'].sudo().browse(int(carrier_id)) if carrier_id else False
            total_price = 0.0
            if carrier:
                if carrier.delivery_type == 'fixed':
                    total_price = float(carrier.fixed_price)
                elif carrier.delivery_type == 'base_on_rule':
                    total_volume = sum([(float(p.get('length', 0)) * float(p.get('width', 0)) * float(p.get('height', 0))) / 1000000.0 for p in packages_data])
                    total_price = carrier._get_price_from_picking(total=0.0, weight=total_weight, volume=total_volume, quantity=float(number_of_packages))
                else:
                    total_price = float(getattr(carrier, 'fixed_price', 10.0)) + (total_weight * 1.2)

            # Create a nice origin string safely
            origin_list = []
            for i, p in enumerate(created_packages):
                if i < 3:
                    origin_list.append(p.name)
            origin_str = ", ".join(origin_list)
            if len(created_packages) > 3:
                origin_str += "..."

            sale_order = request.env['sale.order'].sudo().create({
                'partner_id': partner.id,
                'origin': origin_str,
                'carrier_id': getattr(carrier, 'id', False),
            })

            # Link packages to the sale_order for traceability
            for package in created_packages:
                package.sale_id = sale_order.id

            # Create Sale Order Lines
            carrier_product_id = False
            if carrier:
                carrier_product_id = getattr(carrier.product_id, 'id', False)
            
            bundle_product_id = getattr(GenericProduct, 'id', False)
            
            sale_order_id = getattr(sale_order, 'id', False)
            if sale_order_id:
                # 1. Main Shipping Service Line (with total price)
                request.env['sale.order.line'].sudo().create({
                    'order_id': sale_order_id,
                    'product_id': carrier_product_id,
                    'name': _("Shipping Service (%d packages, %d total units, %.2f kg)") % (number_of_packages, total_units, total_weight),
                    'product_uom_qty': 1.0,
                    'price_unit': float(total_price),
                })
                
                # 2. Individual Package Lines (informational, price 0)
                for package in created_packages:
                    request.env['sale.order.line'].sudo().create({
                        'order_id': sale_order_id,
                        'product_id': bundle_product_id,
                        'package_id': package.id,
                        'name': _("Bundle / Package: %s") % package.name,
                        'product_uom_qty': 1.0,
                        'price_unit': 0.0,
                    })

            # 3. MOCK LABEL API
            labels = []
            for i, package in enumerate(created_packages):
                labels.append({
                    'package_num': i + 1,
                    'package_name': package.name,
                    'tracking_ref': f"TRK-{package.id}-{i+1}",
                    'label_url': f"/account/reception/label_dummy/{package.id}/{i+1}"
                })

            # Send recent activity notification
            user = request.env.user
            if hasattr(user, 'send_portal_user_recent_activity'):
                # Safely get first few names
                pkg_display_list = []
                for i, p in enumerate(created_packages):
                    if i < 2:
                        pkg_display_list.append(p.name)
                display_names = ", ".join(pkg_display_list)
                user.send_portal_user_recent_activity(
                    "Receptions created: %s",
                    "New %d packages and sale order",
                    "fas fa-box",
                    "success",
                    message_args=[display_names, len(created_packages)]
                )

            return {
                'status': 'success', 
                'message': _('Reception created successfully'),
                'summary': {
                    'packages': [{'id': p.id, 'name': p.name} for p in created_packages],
                    'order_name': sale_order.name if sale_order else _('New Order'),
                    'num_packages': int(number_of_packages),
                    'total_cost': float(total_price),
                    'cost_per_package': float(total_price / number_of_packages) if number_of_packages > 0 else 0.0,
                    'currency_symbol': carrier.currency_id.symbol if carrier and carrier.currency_id else '€',
                    'carrier_name': carrier.name if carrier else 'N/A',
                    'labels': labels
                }
            }
        except Exception as e:
            _logger.error("Error creating reception: %s", str(e))
            return {'status': 'error', 'message': str(e)}

    @http.route('/account/reception/label_dummy/<int:package_id>/<int:package_num>', type='http', auth='user')
    def account_reception_label_dummy(self, package_id, package_num, **kw):
        """Return a dummy empty PDF label"""
        # Very simple PDF content
        pdf_content = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n0\n%%EOF"
        return request.make_response(pdf_content, headers=[
            ('Content-Type', 'application/pdf'),
            ('Content-Disposition', f'attachment; filename="label_{package_id}_{package_num}.pdf"')
        ])

    @http.route('/account/reception/address/search', type='json', auth='user')
    def account_reception_address_search(self, query='', address_type='sender', **kw):
        """Search sender or delivery addresses by name, email or phone.
        Phone search strips non-digit characters so '+34 608 20 90 67' matches '608209067'.
        """
        self._ensure_user_lang_context()
        partner = request.env.user.partner_id

        partner_type = address_type if address_type in ('sender', 'delivery') else 'sender'

        # Standard search by name and email
        domain = [
            ('id', 'child_of', partner.commercial_partner_id.id),
            ('type', '=', partner_type),
            '|',
            ('name', 'ilike', query),
            ('email', 'ilike', query),
        ]
        addresses = request.env['res.partner'].sudo().search(domain, limit=10)

        # Additionally search by normalized phone (strip all non-digit chars)
        digits_only = re.sub(r'\D', '', query)
        if digits_only and len(digits_only) >= 4:
            request.env.cr.execute("""
                SELECT id FROM res_partner
                WHERE (parent_id = %s OR id = %s)
                AND type = %s
                AND regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') LIKE %s
                LIMIT 10
            """, (
                partner.commercial_partner_id.id,
                partner.commercial_partner_id.id,
                partner_type,
                '%' + digits_only + '%',
            ))
            phone_ids = [r[0] for r in request.env.cr.fetchall()]
            if phone_ids:
                phone_partners = request.env['res.partner'].sudo().browse(phone_ids)
                addresses = addresses | phone_partners

        return {
            'status': 'success',
            'addresses': [{
                'id': a.id,
                'name': a.name,
                'street': a.street or '',
                'city': a.city or '',
                'zip': a.zip or '',
                'email': a.email or '',
                'phone': a.phone or '',
                'display_name': a.display_name,
            } for a in addresses[:10]]
        }

    @http.route('/account/reception/address/create', type='json', auth='user')
    def account_reception_partner_create(self, **post):
        """Create a new res.partner as child of the user's commercial partner"""
        self._ensure_user_lang_context()
        partner = request.env.user.partner_id
        name = post.get('name', '').strip()
        if not name:
            return {'status': 'error', 'message': _('Name is required')}

        vals = {
            'name': name,
            'parent_id': partner.commercial_partner_id.id,
            'type': post.get('type', 'contact'),
        }

        if post.get('email'):
            vals['email'] = post['email']
        if post.get('phone'):
            vals['phone'] = post['phone']
        if post.get('street'):
            vals['street'] = post['street']
        if post.get('city'):
            vals['city'] = post['city']
        if post.get('zip'):
            vals['zip'] = post['zip']
        if post.get('country_id'):
            vals['country_id'] = int(post['country_id'])

        try:
            new_partner = request.env['res.partner'].sudo().create(vals)
            return {
                'status': 'success',
                'id': new_partner.id,
                'name': new_partner.name,
                'display_name': new_partner.display_name,
            }
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

    @http.route('/account/reception/product-catalog', type='json', auth='user')
    def account_reception_product_catalog(self, page=1, search='', **post):
        """Get the product catalog - locally implemented to avoid portal_catalog dependency"""
        self._ensure_user_lang_context()
        ProductProduct = request.env['product.product'].sudo()

        # Set limit to 20 items per page
        limit = 20
        page = int(page)
        offset = (page - 1) * limit

        domain = []

        if search:
            domain = expression.AND([
                domain,
                expression.OR([
                    [('name', 'ilike', search)],
                    [('default_code', 'ilike', search)],
                    [('barcode', 'ilike', search)]
                ])
            ])

        # Get user language
        user_lang = request.env.user.sudo().lang or 'es_ES'

        # Get products with pagination
        products = ProductProduct.with_context(lang=user_lang).search(domain, limit=limit, offset=offset)
        total_count = ProductProduct.search_count(domain)
        total_pages = math.ceil(total_count / limit) if total_count > 0 else 1

        # Create pages for pagination template
        pages = []
        for i in range(max(1, page - 2), min(total_pages + 1, page + 3)):
            pages.append({
                'page': i,
                'active': i == page
            })

        # Return both products and pagination data rendered with templates
        qweb = request.env['ir.qweb'].with_context(lang=user_lang)
        return {
            'status': 'success',
            'products_html': qweb._render('portal_catalog.portal_product_catalog_items', {
                'products': products
            }),
            'pagination_html': qweb._render('portal_catalog.portal_product_catalog_pagination', {
                'page': page,
                'pages': pages,
                'total_pages': total_pages,
                'total_count': total_count,
                'has_next': page < total_pages,
                'has_previous': page > 1
            })
        }

    @http.route('/account/reception/product-search', type='json', auth='user')
    def account_reception_product_search(self, term='', **kw):
        """Search products - locally implemented to avoid portal_catalog dependency"""
        self._ensure_user_lang_context()
        user_lang = request.env.user.sudo().lang or 'es_ES'
        ProductProduct = request.env['product.product'].sudo().with_context(lang=user_lang)
        
        domain = []

        if term:
            domain = expression.AND([
                domain,
                expression.OR([
                    [('name', 'ilike', term)],
                    [('default_code', 'ilike', term)],
                    [('barcode', 'ilike', term)],
                    [('product_template_attribute_value_ids.name', 'ilike', term)],
                    [('product_template_attribute_value_ids.attribute_id.name', 'ilike', term)]
                ])
            ])

        products = ProductProduct.search(domain, limit=10)

        result_items = []
        for product in products:
            attributes = []
            for attr_value in product.product_template_attribute_value_ids:
                attributes.append({
                    'id': attr_value.id,
                    'name': attr_value.name,
                    'attribute_name': attr_value.attribute_id.name,
                    'value': attr_value.name,
                    'display_name': f"{attr_value.attribute_id.name}: {attr_value.name}"
                })

            result_items.append({
                'id': product.id,
                'text': product.name,
                'default_code': product.default_code or '',
                'barcode': product.barcode or '',
                'price': product.list_price,
                'currency': product.currency_id.symbol,
                'attributes': attributes,
                'image': product.image_128 and f"data:image/png;base64,{product.image_128.decode('utf-8')}" or False
            })

        return {
            'status': 'success',
            'items': result_items
        }

    @http.route('/account/reception/carrier-search', type='json', auth='user')
    def account_reception_carrier_search(self, term='', **kw):
        """Search carriers based on term for select2"""
        self._ensure_user_lang_context()
        DeliveryCarrier = request.env['delivery.carrier'].sudo()
        domain = []

        if term:
            domain = expression.OR([
                [('name', 'ilike', term)],
                [('delivery_type', 'ilike', term)]
            ])

        carriers = DeliveryCarrier.search(domain, limit=10)

        result_items = []
        for carrier in carriers:
            result_items.append({
                'id': carrier.id,
                'text': carrier.name,
                'delivery_type': carrier.delivery_type
            })

        return {
            'items': result_items
        }

    @http.route('/account/reception/zip/search', type='json', auth='user')
    def account_reception_zip_search(self, query='', country_id=False, **kw):
        """Search for zip/city combinations limited by country"""
        self._ensure_user_lang_context()
        if not query or len(query) < 2:
            return {'status': 'success', 'results': []}
            
        domain = [
            '|', ('name', 'ilike', query), ('city_id.name', 'ilike', query)
        ]
        if country_id and str(country_id).isdigit():
            domain.append(('country_id', '=', int(country_id)))
            
        # Search res.city.zip for nationwide data (requires base_location module)
        zip_records = request.env['res.city.zip'].sudo().search(domain, limit=15)
        
        results = []
        for rec in zip_records:
            results.append({
                'zip': rec.name,
                'city': rec.city_id.name,
                'state_id': rec.state_id.id if rec.state_id else False,
                'state_name': rec.state_id.name if rec.state_id else False,
            })
        
        return {'status': 'success', 'results': results}

    @http.route('/account/reception/unmapped_products', type='json', auth='user')
    def account_reception_unmapped_products(self, search='', **kw):
        """Fetch all products not yet mapped for the current client"""
        self._ensure_user_lang_context()
        partner_id = request.env.user.partner_id
        
        # Get user's account partner
        AccountPartner = request.env['account.partner'].sudo()
        account_partner = AccountPartner.search([('partner_id', '=', partner_id.commercial_partner_id.id)], limit=1)
        if not account_partner:
            return {'status': 'success', 'quants': []}

        # Search products instead of quants to show everything
        ProductProduct = request.env['product.product'].sudo()

        # OPTIMIZATION: Get only IDs from account.product.map to exclude them
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

        # Use 18.0 search to get products excluding those already mapped
        products = ProductProduct.search(domain, limit=500)
        if not products:
            return {'status': 'success', 'quants': []}
        
        # Removed stock calculation logic (quants and aggregation)
        # It is not needed for the mapping process.

        result = []
        for p in products:
            result.append({
                'id': p.id,
                'name': p.name,
                'code': p.default_code,
                'image_url': f'/account/reception/product_image/{p.id}'
            })

        return {'status': 'success', 'quants': result}

    @http.route('/account/reception/product_image/<int:product_id>', type='http', auth='user')
    def account_reception_product_image(self, product_id, **kw):
        """Securely serve product images to portal users using sudo()"""
        product = request.env['product.product'].sudo().browse(product_id)
        if not product.exists() or not product.image_128:
            return request.redirect('/web/static/img/placeholder.png')
        
        return request.env['ir.binary']._get_image_stream_from(
            product, 'image_128',
        ).get_response()

    @http.route('/account/reception/product/map/quick_create', type='json', auth='user')
    def account_reception_product_map_quick_create(self, **post):
        """Quickly create an account.product.map for a product"""
        self._ensure_user_lang_context()
        partner_id = request.env.user.partner_id
        product_id = int(post.get('product_id') or 0)
        if not product_id:
            return {'status': 'error', 'message': _('Product ID is required')}
        name = post.get('name')
        account_sku = post.get('account_sku')

        AccountPartner = request.env['account.partner'].sudo()
        account_partner = AccountPartner.search([('partner_id', '=', partner_id.commercial_partner_id.id)], limit=1)
        
        if not account_partner:
            return {'status': 'error', 'message': _('Account partner not found')}

        try:
            mapping = request.env['account.product.map'].sudo().create({
                'product_id': int(product_id),
                'name': name,
                'account_sku': account_sku,
                'account_id': account_partner.id,
                'active': True
            })
            return {
                'status': 'success',
                'id': mapping.id,
                'name': mapping.name,
                'account_sku': mapping.account_sku,
                'product_name': mapping.product_id.name
            }
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

    @http.route('/account/reception/address/get_details', type='json', auth='user')
    def account_reception_address_get_details(self, partner_id, **kw):
        """Fetch detailed address for a partner"""
        self._ensure_user_lang_context()
        if not partner_id:
            return {'status': 'error', 'message': _('Partner ID is required')}
            
        partner = request.env['res.partner'].sudo().browse(int(partner_id))
        if not partner:
            return {'status': 'error', 'message': _('Partner not found')}
            
        return {
            'status': 'success',
            'partner': {
                'id': partner.id,
                'name': partner.name,
                'street': partner.street,
                'city': partner.city,
                'zip': partner.zip,
                'email': partner.email,
                'phone': partner.phone,
                'country_id': partner.country_id.id,
                'country_name': partner.country_id.name,
            }
        }

