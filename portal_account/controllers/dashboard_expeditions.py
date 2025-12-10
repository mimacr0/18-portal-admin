##############################################################################
#
# Copyright 2025-Today DaFe Solutions
#
##############################################################################

from datetime import datetime, timedelta

import pytz

try:
    import openpyxl
except ImportError:
    openpyxl = None

from odoo import http, _, fields
from odoo.http import request
from odoo.addons.portal_account.controllers.dashboard import PortalDashboardController


class PortalDashboardExpeditionsController(PortalDashboardController):
    """Controller for expedition-related dashboard endpoints"""

    @http.route('/account/dashboard/kpis/expeditions/count', type='json', auth='user')
    def account_dashboard_kpis_expeditions_count(self, **kw):
        self._ensure_user_lang_context()
        StockPicking = request.env['stock.picking'].sudo()
        expedition_type = request.env.ref('stock.picking_type_out')
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

        domain = [
            ('picking_type_id', '=', expedition_type.id),
            ('partner_id', 'in', partner_ids),
            ('state', '!=', 'draft')
        ]

        count = StockPicking.search_count(domain)

        return {
            'status': 'success',
            'count': count
        }

    @http.route('/account/dashboard/kpis/expeditions/chart', type='json', auth='user')
    def account_dashboard_kpis_expeditions_chart(self, **kw):
        self._ensure_user_lang_context()
        StockPicking = request.env['stock.picking'].sudo()
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

        # Get expedition type
        expedition_type = request.env.ref('stock.picking_type_out')

        # Query for expeditions by day (last 7 days)
        query_expeditions = """
            SELECT
                DATE(date) as date,
                COUNT(*) as count
            FROM
                stock_picking
            WHERE
                picking_type_id = %s
                AND partner_id IN %s
                AND state != 'draft'
                AND date >= NOW() - INTERVAL '7 days'
            GROUP BY
                DATE(date)
            ORDER BY
                date ASC;
        """

        # Execute queries
        request.cr.execute(query_expeditions, (expedition_type.id, tuple(partner_ids)))
        expeditions_data = request.cr.dictfetchall()

        # Format data for charts
        expedition_values = []
        dates = []

        # Get last 7 days
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=6)
        current_date = start_date

        # Create a date-indexed dict for easy lookup
        expedition_by_date = {item['date'].strftime('%Y-%m-%d'): item['count'] for item in expeditions_data}

        # Fill in data for all 7 days
        while current_date <= end_date:
            date_str = current_date.strftime('%Y-%m-%d')
            dates.append(date_str)
            expedition_values.append(expedition_by_date.get(date_str, 0))
            current_date += timedelta(days=1)

        return {
            'status': 'success',
            'dates': dates,
            'values': expedition_values
        }

    @http.route('/account/dashboard/import_expeditions', type='http', auth='user', methods=['POST'], csrf=False)
    def account_dashboard_import_expeditions(self, file=None, **kw):
        """Import expeditions as Sale Orders from Excel (XLSX) file.
        
        Expected columns:
        - reference: Client reference (required)
        - scheduled_date: Commitment date in format DD/MM/YYYY HH:MM (required)
        - product: Product reference or name (required)
        - quantity: Quantity (required)
        - price: Unit price (optional, uses product price if not provided)
        - destination_name: Delivery contact name (optional)
        - destination_street: Delivery street address (optional)
        - destination_city: Delivery city (optional)
        - destination_zip: Delivery ZIP code (optional)
        - destination_country: Delivery country code (optional, e.g. ES, FR)
        """
        print("=" * 60)
        print("[IMPORT EXPEDITIONS] Starting import process (Sale Orders)...")
        print(f"[IMPORT EXPEDITIONS] File received: {file}")
        
        self._ensure_user_lang_context()
        
        if not openpyxl:
            print("[IMPORT EXPEDITIONS] ERROR: openpyxl not installed")
            return request.make_json_response({
                'status': 'error',
                'message': _('Excel import not available. Please install openpyxl.')
            })
        
        if not file:
            print("[IMPORT EXPEDITIONS] ERROR: No file provided")
            return request.make_json_response({
                'status': 'error',
                'message': _('No file provided')
            })
        
        try:
            # Read Excel file
            print("[IMPORT EXPEDITIONS] Reading Excel file...")
            workbook = openpyxl.load_workbook(file, data_only=True)
            sheet = workbook.active
            print(f"[IMPORT EXPEDITIONS] Sheet loaded: {sheet.title}, rows: {sheet.max_row}, cols: {sheet.max_column}")
            
            # Get headers from first row
            headers = [cell.value.lower().strip() if cell.value else '' for cell in sheet[1]]
            print(f"[IMPORT EXPEDITIONS] Headers found: {headers}")
            
            # Required columns
            required_cols = ['reference', 'scheduled_date', 'product', 'quantity']
            missing_cols = [col for col in required_cols if col not in headers]
            
            if missing_cols:
                print(f"[IMPORT EXPEDITIONS] ERROR: Missing columns: {missing_cols}")
                return request.make_json_response({
                    'status': 'error',
                    'message': _('Missing required columns: %s') % ', '.join(missing_cols)
                })
            
            # Get column indices
            col_idx = {header: idx for idx, header in enumerate(headers)}
            print(f"[IMPORT EXPEDITIONS] Column indices: {col_idx}")
            
            # Get models
            partner = request.env.user.partner_id
            print(f"[IMPORT EXPEDITIONS] User partner: {partner.name} (id={partner.id})")
            print(f"[IMPORT EXPEDITIONS] Commercial partner: {partner.commercial_partner_id.name} (id={partner.commercial_partner_id.id})")
            
            SaleOrder = request.env['sale.order'].sudo()
            SaleOrderLine = request.env['sale.order.line'].sudo()
            ProductProduct = request.env['product.product'].sudo()
            AccountPartner = request.env['account.partner'].sudo()
            ResPartner = request.env['res.partner'].sudo()
            ResCountry = request.env['res.country'].sudo()
            
            account_partner = AccountPartner.search([
                ('partner_id', '=', partner.commercial_partner_id.id)
            ], limit=1)
            print(f"[IMPORT EXPEDITIONS] Account partner: {account_partner.name if account_partner else 'NOT FOUND'}")
            
            # Group rows by reference (each reference = one sale order)
            orders_data = {}
            errors = []
            row_num = 1
            
            print("[IMPORT EXPEDITIONS] Processing rows...")
            for row in sheet.iter_rows(min_row=2, values_only=True):
                row_num += 1
                
                # Skip empty rows
                if not any(row):
                    print(f"[IMPORT EXPEDITIONS] Row {row_num}: Empty, skipping")
                    continue
                
                print(f"[IMPORT EXPEDITIONS] Row {row_num}: {row}")
                
                reference = str(row[col_idx['reference']] or '').strip()
                if not reference:
                    errors.append(_('Row %d: Missing reference') % row_num)
                    print(f"[IMPORT EXPEDITIONS] Row {row_num}: ERROR - Missing reference")
                    continue
                
                # Parse scheduled date (commitment date)
                scheduled_date_val = row[col_idx['scheduled_date']]
                print(f"[IMPORT EXPEDITIONS] Row {row_num}: scheduled_date_val = {scheduled_date_val} (type: {type(scheduled_date_val)})")
                if isinstance(scheduled_date_val, datetime):
                    scheduled_date = scheduled_date_val
                elif scheduled_date_val:
                    try:
                        scheduled_date = datetime.strptime(str(scheduled_date_val).strip(), '%d/%m/%Y %H:%M')
                    except ValueError:
                        try:
                            scheduled_date = datetime.strptime(str(scheduled_date_val).strip(), '%d/%m/%Y')
                        except ValueError:
                            errors.append(_('Row %d: Invalid date format (expected DD/MM/YYYY HH:MM)') % row_num)
                            print(f"[IMPORT EXPEDITIONS] Row {row_num}: ERROR - Invalid date format")
                            continue
                else:
                    errors.append(_('Row %d: Missing scheduled date') % row_num)
                    print(f"[IMPORT EXPEDITIONS] Row {row_num}: ERROR - Missing scheduled date")
                    continue
                
                print(f"[IMPORT EXPEDITIONS] Row {row_num}: scheduled_date = {scheduled_date}")
                
                # Get product
                product_ref = str(row[col_idx['product']] or '').strip()
                if not product_ref:
                    errors.append(_('Row %d: Missing product') % row_num)
                    print(f"[IMPORT EXPEDITIONS] Row {row_num}: ERROR - Missing product")
                    continue
                
                product = ProductProduct.search([
                    '|', ('default_code', '=', product_ref), ('name', 'ilike', product_ref)
                ], limit=1)
                if not product:
                    errors.append(_('Row %d: Product "%s" not found') % (row_num, product_ref))
                    print(f"[IMPORT EXPEDITIONS] Row {row_num}: ERROR - Product '{product_ref}' not found")
                    continue
                print(f"[IMPORT EXPEDITIONS] Row {row_num}: product = {product.display_name} (id={product.id})")
                
                # Get quantity
                try:
                    quantity = float(row[col_idx['quantity']] or 0)
                    if quantity <= 0:
                        errors.append(_('Row %d: Invalid quantity') % row_num)
                        print(f"[IMPORT EXPEDITIONS] Row {row_num}: ERROR - Invalid quantity (<=0)")
                        continue
                except (ValueError, TypeError):
                    errors.append(_('Row %d: Invalid quantity') % row_num)
                    print(f"[IMPORT EXPEDITIONS] Row {row_num}: ERROR - Invalid quantity (not a number)")
                    continue
                print(f"[IMPORT EXPEDITIONS] Row {row_num}: quantity = {quantity}")
                
                # Optional price
                price = 0.0
                if 'price' in col_idx:
                    try:
                        price = float(row[col_idx['price']] or 0)
                    except (ValueError, TypeError):
                        price = 0.0
                print(f"[IMPORT EXPEDITIONS] Row {row_num}: price = {price}")
                
                # Destination address fields (optional)
                dest_name = str(row[col_idx.get('destination_name', -1)] or '').strip() if 'destination_name' in col_idx else ''
                dest_street = str(row[col_idx.get('destination_street', -1)] or '').strip() if 'destination_street' in col_idx else ''
                dest_city = str(row[col_idx.get('destination_city', -1)] or '').strip() if 'destination_city' in col_idx else ''
                dest_zip = str(row[col_idx.get('destination_zip', -1)] or '').strip() if 'destination_zip' in col_idx else ''
                dest_country_code = str(row[col_idx.get('destination_country', -1)] or '').strip() if 'destination_country' in col_idx else ''
                
                print(f"[IMPORT EXPEDITIONS] Row {row_num}: dest={dest_name}, {dest_street}, {dest_city}")
                
                # Group by reference
                if reference not in orders_data:
                    orders_data[reference] = {
                        'scheduled_date': scheduled_date,
                        'destination': {
                            'name': dest_name,
                            'street': dest_street,
                            'city': dest_city,
                            'zip': dest_zip,
                            'country_code': dest_country_code,
                        },
                        'lines': []
                    }
                
                orders_data[reference]['lines'].append({
                    'product': product,
                    'quantity': quantity,
                    'price': price
                })
                print(f"[IMPORT EXPEDITIONS] Row {row_num}: Added to reference '{reference}'")
            
            print(f"[IMPORT EXPEDITIONS] Total orders to create: {len(orders_data)}")
            print(f"[IMPORT EXPEDITIONS] Total errors: {len(errors)}")
            
            if errors:
                print(f"[IMPORT EXPEDITIONS] Returning errors: {errors}")
                return request.make_json_response({
                    'status': 'error',
                    'message': _('Import errors'),
                    'errors': errors
                })
            
            if not orders_data:
                print("[IMPORT EXPEDITIONS] ERROR: No valid data found")
                return request.make_json_response({
                    'status': 'error',
                    'message': _('No valid data found in file')
                })
            
            # Create sale orders
            created_count = 0
            
            for reference, data in orders_data.items():
                print(f"[IMPORT EXPEDITIONS] Creating sale order for reference: {reference}")
                
                # Convert date to UTC for commitment_date
                user_tz = pytz.timezone(request.env.user.tz or 'UTC')
                local_dt = user_tz.localize(data['scheduled_date'])
                utc_dt = local_dt.astimezone(pytz.UTC)
                commitment_date_str = utc_dt.strftime('%Y-%m-%d %H:%M:%S')
                print(f"[IMPORT EXPEDITIONS] Commitment date (UTC): {commitment_date_str}")
                
                # Find or create delivery partner if destination info provided
                delivery_partner_id = partner.commercial_partner_id.id
                dest = data['destination']
                
                if dest['name'] or dest['street'] or dest['city']:
                    # Search for existing delivery address
                    delivery_domain = [
                        ('parent_id', '=', partner.commercial_partner_id.id),
                        ('type', '=', 'delivery')
                    ]
                    if dest['name']:
                        delivery_domain.append(('name', 'ilike', dest['name']))
                    if dest['street']:
                        delivery_domain.append(('street', 'ilike', dest['street']))
                    
                    existing_delivery = ResPartner.search(delivery_domain, limit=1)
                    
                    if existing_delivery:
                        delivery_partner_id = existing_delivery.id
                        print(f"[IMPORT EXPEDITIONS] Found existing delivery partner: {existing_delivery.name} (id={existing_delivery.id})")
                    else:
                        # Create new delivery address
                        country_id = False
                        if dest['country_code']:
                            country = ResCountry.search([('code', '=ilike', dest['country_code'])], limit=1)
                            country_id = country.id if country else False
                        
                        new_delivery = ResPartner.create({
                            'parent_id': partner.commercial_partner_id.id,
                            'type': 'delivery',
                            'name': dest['name'] or _('Delivery Address'),
                            'street': dest['street'],
                            'city': dest['city'],
                            'zip': dest['zip'],
                            'country_id': country_id,
                        })
                        delivery_partner_id = new_delivery.id
                        print(f"[IMPORT EXPEDITIONS] Created new delivery partner: {new_delivery.name} (id={new_delivery.id})")
                
                # Create sale order
                print(f"[IMPORT EXPEDITIONS] Creating sale.order...")
                order_vals = {
                    'partner_id': partner.commercial_partner_id.id,
                    'partner_shipping_id': delivery_partner_id,
                    'account_partner_id': account_partner.id if account_partner else False,
                    'client_order_ref': reference,
                    'commitment_date': commitment_date_str,
                    'origin': f'Import: {reference}',
                }
                
                order = SaleOrder.create(order_vals)
                print(f"[IMPORT EXPEDITIONS] Sale order created: {order.name} (id={order.id})")
                
                # Create order lines
                for line_data in data['lines']:
                    product = line_data['product']
                    qty = line_data['quantity']
                    price = line_data['price']
                    
                    print(f"[IMPORT EXPEDITIONS] Creating order line: {product.display_name} x {qty}")
                    
                    line_vals = {
                        'order_id': order.id,
                        'product_id': product.id,
                        'product_uom_qty': qty,
                        'product_uom': product.uom_id.id,
                    }
                    
                    # Set price if provided, otherwise let Odoo use pricelist
                    if price > 0:
                        line_vals['price_unit'] = price
                    
                    line = SaleOrderLine.create(line_vals)
                    print(f"[IMPORT EXPEDITIONS] Order line created: id={line.id}")
                
                # Confirm the order (commented to leave as draft)
                # print(f"[IMPORT EXPEDITIONS] Confirming order...")
                # order.action_confirm()
                # print(f"[IMPORT EXPEDITIONS] Order {order.name} confirmed")
                
                print(f"[IMPORT EXPEDITIONS] Order {order.name} created (draft)")
                created_count += 1
            
            print(f"[IMPORT EXPEDITIONS] SUCCESS: {created_count} sale order(s) created")
            print("=" * 60)
            
            return request.make_json_response({
                'status': 'success',
                'message': _('%d sale order(s) created successfully') % created_count
            })
            
        except Exception as e:
            import traceback
            print(f"[IMPORT EXPEDITIONS] EXCEPTION: {str(e)}")
            print(f"[IMPORT EXPEDITIONS] Traceback:\n{traceback.format_exc()}")
            print("=" * 60)
            return request.make_json_response({
                'status': 'error',
                'message': str(e)
            })
