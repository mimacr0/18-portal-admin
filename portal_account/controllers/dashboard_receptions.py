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


class PortalDashboardReceptionsController(PortalDashboardController):
    """Controller for reception-related dashboard endpoints"""

    @http.route('/account/dashboard/kpis/receptions/count', type='json', auth='user')
    def account_dashboard_kpis_receptions_count(self, **kw):
        self._ensure_user_lang_context()
        StockPicking = request.env['stock.picking'].sudo()
        reception_type = request.env.ref('stock.picking_type_in')
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

        domain = [
            ('picking_type_id', '=', reception_type.id),
            ('partner_id', 'in', partner_ids),
            ('state', '!=', 'draft')
        ]

        count = StockPicking.search_count(domain)

        return {
            'status': 'success',
            'count': count
        }

    @http.route('/account/dashboard/kpis/receptions/chart', type='json', auth='user')
    def account_dashboard_kpis_receptions_chart(self, **kw):
        self._ensure_user_lang_context()
        StockPicking = request.env['stock.picking'].sudo()
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

        # Get reception type
        reception_type = request.env.ref('stock.picking_type_in')

        # Query for receptions by day (last 7 days)
        query_receptions = """
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
        request.cr.execute(query_receptions, (reception_type.id, tuple(partner_ids)))
        receptions_data = request.cr.dictfetchall()

        # Format data for charts
        reception_values = []
        dates = []

        # Get last 7 days
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=6)
        current_date = start_date

        # Create a date-indexed dict for easy lookup
        reception_by_date = {item['date'].strftime('%Y-%m-%d'): item['count'] for item in receptions_data}

        # Fill in data for all 7 days
        while current_date <= end_date:
            date_str = current_date.strftime('%Y-%m-%d')
            dates.append(date_str)
            reception_values.append(reception_by_date.get(date_str, 0))
            current_date += timedelta(days=1)

        return {
            'status': 'success',
            'dates': dates,
            'values': reception_values
        }

    @http.route('/account/dashboard/import_receptions', type='http', auth='user', methods=['POST'], csrf=False)
    def account_dashboard_import_receptions(self, file=None, **kw):
        """Import receptions from Excel (XLSX) file.
        
        Expected columns:
        - tracking_number: Tracking number (required)
        - scheduled_date: Date in format DD/MM/YYYY HH:MM (required)
        - package_type: Package type name (required)
        - product: Product reference or name (required)
        - quantity: Quantity (required)
        - carrier_name: Carrier name (optional)
        - weight: Weight (optional)
        - package_num: Package number for grouping (optional, default 1)
        """
        print("=" * 60)
        print("[IMPORT RECEPTIONS] Starting import process...")
        print(f"[IMPORT RECEPTIONS] File received: {file}")
        print(f"[IMPORT RECEPTIONS] Extra kwargs: {kw}")
        
        self._ensure_user_lang_context()
        
        if not openpyxl:
            print("[IMPORT RECEPTIONS] ERROR: openpyxl not installed")
            return request.make_json_response({
                'status': 'error',
                'message': _('Excel import not available. Please install openpyxl.')
            })
        
        if not file:
            print("[IMPORT RECEPTIONS] ERROR: No file provided")
            return request.make_json_response({
                'status': 'error',
                'message': _('No file provided')
            })
        
        try:
            # Read Excel file
            print("[IMPORT RECEPTIONS] Reading Excel file...")
            workbook = openpyxl.load_workbook(file, data_only=True)
            sheet = workbook.active
            print(f"[IMPORT RECEPTIONS] Sheet loaded: {sheet.title}, rows: {sheet.max_row}, cols: {sheet.max_column}")
            
            # Get headers from first row
            headers = [cell.value.lower().strip() if cell.value else '' for cell in sheet[1]]
            print(f"[IMPORT RECEPTIONS] Headers found: {headers}")
            
            # Required columns
            required_cols = ['tracking_number', 'scheduled_date', 'package_type', 'product', 'quantity']
            missing_cols = [col for col in required_cols if col not in headers]
            
            if missing_cols:
                print(f"[IMPORT RECEPTIONS] ERROR: Missing columns: {missing_cols}")
                return request.make_json_response({
                    'status': 'error',
                    'message': _('Missing required columns: %s') % ', '.join(missing_cols)
                })
            
            # Get column indices
            col_idx = {header: idx for idx, header in enumerate(headers)}
            print(f"[IMPORT RECEPTIONS] Column indices: {col_idx}")
            
            # Get models
            partner = request.env.user.partner_id
            print(f"[IMPORT RECEPTIONS] User partner: {partner.name} (id={partner.id})")
            print(f"[IMPORT RECEPTIONS] Commercial partner: {partner.commercial_partner_id.name} (id={partner.commercial_partner_id.id})")
            
            StockPicking = request.env['stock.picking'].sudo()
            ProductProduct = request.env['product.product'].sudo()
            AccountPartner = request.env['account.partner'].sudo()
            StockPackageType = request.env['stock.package.type'].sudo()
            StockQuantPackage = request.env['stock.quant.package'].sudo()
            reception_type = request.env.ref('stock.picking_type_in').sudo()
            print(f"[IMPORT RECEPTIONS] Reception type: {reception_type.name} (id={reception_type.id})")
            
            account_partner = AccountPartner.search([
                ('partner_id', '=', partner.commercial_partner_id.id)
            ], limit=1)
            print(f"[IMPORT RECEPTIONS] Account partner: {account_partner.name if account_partner else 'NOT FOUND'}")
            
            # Group rows by tracking_number (each tracking_number = one picking)
            pickings_data = {}
            errors = []
            row_num = 1
            
            print("[IMPORT RECEPTIONS] Processing rows...")
            for row in sheet.iter_rows(min_row=2, values_only=True):
                row_num += 1
                
                # Skip empty rows
                if not any(row):
                    print(f"[IMPORT RECEPTIONS] Row {row_num}: Empty, skipping")
                    continue
                
                print(f"[IMPORT RECEPTIONS] Row {row_num}: {row}")
                
                tracking_number = str(row[col_idx['tracking_number']] or '').strip()
                if not tracking_number:
                    errors.append(_('Row %d: Missing tracking number') % row_num)
                    print(f"[IMPORT RECEPTIONS] Row {row_num}: ERROR - Missing tracking number")
                    continue
                
                # Parse scheduled date
                scheduled_date_val = row[col_idx['scheduled_date']]
                print(f"[IMPORT RECEPTIONS] Row {row_num}: scheduled_date_val = {scheduled_date_val} (type: {type(scheduled_date_val)})")
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
                            print(f"[IMPORT RECEPTIONS] Row {row_num}: ERROR - Invalid date format")
                            continue
                else:
                    errors.append(_('Row %d: Missing scheduled date') % row_num)
                    print(f"[IMPORT RECEPTIONS] Row {row_num}: ERROR - Missing scheduled date")
                    continue
                
                print(f"[IMPORT RECEPTIONS] Row {row_num}: scheduled_date = {scheduled_date}")
                
                # Get package type
                package_type_name = str(row[col_idx['package_type']] or '').strip()
                if not package_type_name:
                    errors.append(_('Row %d: Missing package type') % row_num)
                    print(f"[IMPORT RECEPTIONS] Row {row_num}: ERROR - Missing package type")
                    continue
                
                package_type = StockPackageType.search([('name', 'ilike', package_type_name)], limit=1)
                if not package_type:
                    errors.append(_('Row %d: Package type "%s" not found') % (row_num, package_type_name))
                    print(f"[IMPORT RECEPTIONS] Row {row_num}: ERROR - Package type '{package_type_name}' not found")
                    continue
                print(f"[IMPORT RECEPTIONS] Row {row_num}: package_type = {package_type.name} (id={package_type.id})")
                
                # Get product
                product_ref = str(row[col_idx['product']] or '').strip()
                if not product_ref:
                    errors.append(_('Row %d: Missing product') % row_num)
                    print(f"[IMPORT RECEPTIONS] Row {row_num}: ERROR - Missing product")
                    continue
                
                product = ProductProduct.search([
                    '|', ('default_code', '=', product_ref), ('name', 'ilike', product_ref)
                ], limit=1)
                if not product:
                    errors.append(_('Row %d: Product "%s" not found') % (row_num, product_ref))
                    print(f"[IMPORT RECEPTIONS] Row {row_num}: ERROR - Product '{product_ref}' not found")
                    continue
                print(f"[IMPORT RECEPTIONS] Row {row_num}: product = {product.display_name} (id={product.id})")
                
                # Get quantity
                try:
                    quantity = float(row[col_idx['quantity']] or 0)
                    if quantity <= 0:
                        errors.append(_('Row %d: Invalid quantity') % row_num)
                        print(f"[IMPORT RECEPTIONS] Row {row_num}: ERROR - Invalid quantity (<=0)")
                        continue
                except (ValueError, TypeError):
                    errors.append(_('Row %d: Invalid quantity') % row_num)
                    print(f"[IMPORT RECEPTIONS] Row {row_num}: ERROR - Invalid quantity (not a number)")
                    continue
                print(f"[IMPORT RECEPTIONS] Row {row_num}: quantity = {quantity}")
                
                # Optional fields
                carrier_name = str(row[col_idx.get('carrier_name', -1)] or '').strip() if 'carrier_name' in col_idx else ''
                weight = float(row[col_idx.get('weight', -1)] or 0) if 'weight' in col_idx else 0
                package_num = str(row[col_idx.get('package_num', -1)] or '1').strip() if 'package_num' in col_idx else '1'
                print(f"[IMPORT RECEPTIONS] Row {row_num}: carrier_name={carrier_name}, weight={weight}, package_num={package_num}")
                
                # Group by tracking number
                if tracking_number not in pickings_data:
                    pickings_data[tracking_number] = {
                        'scheduled_date': scheduled_date,
                        'package_type': package_type,
                        'carrier_name': carrier_name,
                        'weight': weight,
                        'packages': {}
                    }
                
                if package_num not in pickings_data[tracking_number]['packages']:
                    pickings_data[tracking_number]['packages'][package_num] = []
                
                pickings_data[tracking_number]['packages'][package_num].append({
                    'product': product,
                    'quantity': quantity
                })
                print(f"[IMPORT RECEPTIONS] Row {row_num}: Added to tracking '{tracking_number}', package '{package_num}'")
            
            print(f"[IMPORT RECEPTIONS] Total pickings to create: {len(pickings_data)}")
            print(f"[IMPORT RECEPTIONS] Total errors: {len(errors)}")
            
            if errors:
                print(f"[IMPORT RECEPTIONS] Returning errors: {errors}")
                return request.make_json_response({
                    'status': 'error',
                    'message': _('Import errors'),
                    'errors': errors
                })
            
            if not pickings_data:
                print("[IMPORT RECEPTIONS] ERROR: No valid data found")
                return request.make_json_response({
                    'status': 'error',
                    'message': _('No valid data found in file')
                })
            
            # Create pickings
            created_count = 0
            
            for tracking_number, data in pickings_data.items():
                print(f"[IMPORT RECEPTIONS] Creating picking for tracking: {tracking_number}")
                
                # Convert date to UTC
                user_tz = pytz.timezone(request.env.user.tz or 'UTC')
                local_dt = user_tz.localize(data['scheduled_date'])
                utc_dt = local_dt.astimezone(pytz.UTC)
                scheduled_date_str = utc_dt.strftime('%Y-%m-%d %H:%M:%S')
                print(f"[IMPORT RECEPTIONS] Scheduled date (UTC): {scheduled_date_str}")
                
                # Create packages
                package_map = {}
                package_names = []
                
                for package_num in data['packages'].keys():
                    print(f"[IMPORT RECEPTIONS] Creating package #{package_num}...")
                    package_name = StockQuantPackage.set_name_based_on_account(account_partner)
                    package_names.append(package_name)
                    print(f"[IMPORT RECEPTIONS] Package name generated: {package_name}")
                    
                    package = StockQuantPackage.create({
                        'name': package_name,
                        'package_type_id': data['package_type'].id,
                        'account_partner_id': account_partner.id,
                        'owner_id': partner.commercial_partner_id.id,
                        'location_id': reception_type.default_location_dest_id.id,
                        'pack_date': fields.Date.today(),
                        'global_tracking_ref': tracking_number,
                        'carrier_name': data['carrier_name'],
                        'shipping_weight': data['weight'] or data['package_type'].base_weight,
                    })
                    package_map[package_num] = package
                    print(f"[IMPORT RECEPTIONS] Package created: {package.name} (id={package.id})")
                
                # Create picking
                print(f"[IMPORT RECEPTIONS] Creating stock.picking...")
                picking = StockPicking.create({
                    'picking_type_id': reception_type.id,
                    'account_partner_id': account_partner.id,
                    'owner_id': partner.commercial_partner_id.id,
                    'partner_id': partner.commercial_partner_id.id,
                    'carrier_tracking_ref': tracking_number,
                    'origin': ', '.join(package_names) if package_names else f'Import: {tracking_number}',
                    'location_id': reception_type.default_location_src_id.id,
                    'location_dest_id': reception_type.default_location_dest_id.id,
                    'move_type': 'direct',
                    'scheduled_date': scheduled_date_str,
                })
                print(f"[IMPORT RECEPTIONS] Picking created: {picking.name} (id={picking.id})")
                
                # Create moves
                total_weight = 0
                
                for package_num, products_list in data['packages'].items():
                    package = package_map.get(package_num)
                    
                    for prod_data in products_list:
                        product = prod_data['product']
                        qty = prod_data['quantity']
                        
                        print(f"[IMPORT RECEPTIONS] Creating move: {product.display_name} x {qty}")
                        move = request.env['stock.move'].sudo().create({
                            'name': product.display_name,
                            'product_id': product.id,
                            'product_uom_qty': qty,
                            'product_uom': product.uom_id.id,
                            'picking_id': picking.id,
                            'location_id': picking.location_id.id,
                            'location_dest_id': picking.location_dest_id.id,
                            'state': 'draft',
                        })
                        print(f"[IMPORT RECEPTIONS] Move created: id={move.id}")
                        
                        if package:
                            print(f"[IMPORT RECEPTIONS] Creating move line for package {package.name}...")
                            request.env['stock.move.line'].sudo().create({
                                'move_id': move.id,
                                'product_id': product.id,
                                'product_uom_id': product.uom_id.id,
                                'location_id': picking.location_id.id,
                                'location_dest_id': picking.location_dest_id.id,
                                'qty_done': qty,
                                'result_package_id': package.id,
                                'owner_id': partner.commercial_partner_id.id,
                                'picking_id': picking.id,
                            })
                            print(f"[IMPORT RECEPTIONS] Move line created")
                        
                        total_weight += product.weight * qty
                
                picking.write({'shipping_weight': total_weight})
                print(f"[IMPORT RECEPTIONS] Confirming picking...")
                picking.action_confirm()
                print(f"[IMPORT RECEPTIONS] Assigning picking...")
                picking.action_assign()
                print(f"[IMPORT RECEPTIONS] Picking {picking.name} confirmed and assigned")
                
                created_count += 1
            
            print(f"[IMPORT RECEPTIONS] SUCCESS: {created_count} reception(s) created")
            print("=" * 60)
            
            return request.make_json_response({
                'status': 'success',
                'message': _('%d reception(s) created successfully') % created_count
            })
            
        except Exception as e:
            import traceback
            print(f"[IMPORT RECEPTIONS] EXCEPTION: {str(e)}")
            print(f"[IMPORT RECEPTIONS] Traceback:\n{traceback.format_exc()}")
            print("=" * 60)
            return request.make_json_response({
                'status': 'error',
                'message': str(e)
            })

