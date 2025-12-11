##############################################################################
#
# Copyright 2025-Today DaFe Solutions
#
##############################################################################

from datetime import datetime, timedelta
import logging

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
        domain = self._get_reception_domain()

        count = StockPicking.search_count(domain)

        return {
            'status': 'success',
            'count': count
        }

    @http.route('/account/dashboard/kpis/receptions/chart', type='json', auth='user')
    def account_dashboard_kpis_receptions_chart(self, period='7d', **kw):
        self._ensure_user_lang_context()
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

        # Get reception type
        reception_type = request.env.ref('stock.picking_type_in')
        
        values = []
        labels = []
        end_date = datetime.now().date()

        if period == '7d':
            # Last 7 days - group by day
            query = """
                SELECT DATE(date) as period_date, COUNT(*) as count
                FROM stock_picking
                WHERE picking_type_id = %s AND partner_id IN %s AND state != 'draft'
                    AND date >= NOW() - INTERVAL '7 days'
                GROUP BY DATE(date)
                ORDER BY period_date ASC;
            """
            request.cr.execute(query, (reception_type.id, tuple(partner_ids)))
            data = {item['period_date'].strftime('%Y-%m-%d'): item['count'] for item in request.cr.dictfetchall()}
            
            start_date = end_date - timedelta(days=6)
            current = start_date
            while current <= end_date:
                key = current.strftime('%Y-%m-%d')
                labels.append(current.strftime('%a %d'))  # "Mon 09"
                values.append(data.get(key, 0))
                current += timedelta(days=1)

        elif period == 'week':
            # Last 4 weeks - group by week
            query = """
                SELECT DATE_TRUNC('week', date) as period_date, COUNT(*) as count
                FROM stock_picking
                WHERE picking_type_id = %s AND partner_id IN %s AND state != 'draft'
                    AND date >= NOW() - INTERVAL '4 weeks'
                GROUP BY DATE_TRUNC('week', date)
                ORDER BY period_date ASC;
            """
            request.cr.execute(query, (reception_type.id, tuple(partner_ids)))
            data = {item['period_date'].date(): item['count'] for item in request.cr.dictfetchall()}
            
            # Generate last 4 weeks
            from dateutil.relativedelta import relativedelta
            for i in range(3, -1, -1):
                week_start = end_date - timedelta(days=end_date.weekday()) - timedelta(weeks=i)
                labels.append(f"Week {week_start.strftime('%d/%m')}")
                values.append(data.get(week_start, 0))

        elif period == 'month':
            # Last 12 months - group by month
            query = """
                SELECT DATE_TRUNC('month', date) as period_date, COUNT(*) as count
                FROM stock_picking
                WHERE picking_type_id = %s AND partner_id IN %s AND state != 'draft'
                    AND date >= NOW() - INTERVAL '12 months'
                GROUP BY DATE_TRUNC('month', date)
                ORDER BY period_date ASC;
            """
            request.cr.execute(query, (reception_type.id, tuple(partner_ids)))
            data = {item['period_date'].date(): item['count'] for item in request.cr.dictfetchall()}
            
            # Generate last 12 months
            from dateutil.relativedelta import relativedelta
            for i in range(11, -1, -1):
                month_start = (end_date.replace(day=1) - relativedelta(months=i))
                labels.append(month_start.strftime('%b %Y'))  # "Dec 2025"
                values.append(data.get(month_start, 0))

        elif period == 'year':
            # Last 5 years - group by year
            query = """
                SELECT DATE_TRUNC('year', date) as period_date, COUNT(*) as count
                FROM stock_picking
                WHERE picking_type_id = %s AND partner_id IN %s AND state != 'draft'
                    AND date >= NOW() - INTERVAL '5 years'
                GROUP BY DATE_TRUNC('year', date)
                ORDER BY period_date ASC;
            """
            request.cr.execute(query, (reception_type.id, tuple(partner_ids)))
            data = {item['period_date'].year: item['count'] for item in request.cr.dictfetchall()}
            
            # Generate last 5 years
            for i in range(4, -1, -1):
                year = end_date.year - i
                labels.append(str(year))
                values.append(data.get(year, 0))

        return {
            'status': 'success',
            'labels': labels,
            'values': values
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
            
            # Get headers from first row
            headers = [cell.value.lower().strip() if cell.value else '' for cell in sheet[1]]
            
            # Required columns
            required_cols = ['tracking_number', 'scheduled_date', 'package_type', 'product', 'quantity']
            missing_cols = [col for col in required_cols if col not in headers]
            
            if missing_cols:
                return request.make_json_response({
                    'status': 'error',
                    'message': _('Missing required columns: %s') % ', '.join(missing_cols)
                })
            
            # Get column indices
            col_idx = {header: idx for idx, header in enumerate(headers)}
            
            # Get models
            partner = request.env.user.partner_id
            
            StockPicking = request.env['stock.picking'].sudo()
            ProductProduct = request.env['product.product'].sudo()
            AccountPartner = request.env['account.partner'].sudo()
            StockPackageType = request.env['stock.package.type'].sudo()
            StockQuantPackage = request.env['stock.quant.package'].sudo()
            reception_type = request.env.ref('stock.picking_type_in').sudo()
            
            account_partner = AccountPartner.search([
                ('partner_id', '=', partner.commercial_partner_id.id)
            ], limit=1)
            
            # Group rows by tracking_number (each tracking_number = one picking)
            pickings_data = {}
            errors = []
            row_num = 1
            
            for row in sheet.iter_rows(min_row=2, values_only=True):
                row_num += 1
                
                # Skip empty rows
                if not any(row):
                    continue
                
                
                tracking_number = str(row[col_idx['tracking_number']] or '').strip()
                if not tracking_number:
                    errors.append(_('Row %d: Missing tracking number') % row_num)
                    continue
                
                # Parse scheduled date
                scheduled_date_val = row[col_idx['scheduled_date']]
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
                            continue
                else:
                    errors.append(_('Row %d: Missing scheduled date') % row_num)
                    continue
                
                
                # Get package type
                package_type_name = str(row[col_idx['package_type']] or '').strip()
                if not package_type_name:
                    errors.append(_('Row %d: Missing package type') % row_num)
                    continue
                
                package_type = StockPackageType.search([('name', 'ilike', package_type_name)], limit=1)
                if not package_type:
                    errors.append(_('Row %d: Package type "%s" not found') % (row_num, package_type_name))
                    continue
                
                # Get product
                product_ref = str(row[col_idx['product']] or '').strip()
                if not product_ref:
                    errors.append(_('Row %d: Missing product') % row_num)
                    continue
                
                product = ProductProduct.search([
                    '|', ('default_code', '=', product_ref), ('name', 'ilike', product_ref)
                ], limit=1)
                if not product:
                    errors.append(_('Row %d: Product "%s" not found') % (row_num, product_ref))
                    continue
                
                # Get quantity
                try:
                    quantity = float(row[col_idx['quantity']] or 0)
                    if quantity <= 0:
                        errors.append(_('Row %d: Invalid quantity') % row_num)
                        continue
                except (ValueError, TypeError):
                    errors.append(_('Row %d: Invalid quantity') % row_num)
                    continue
                
                # Optional fields
                carrier_name = str(row[col_idx.get('carrier_name', -1)] or '').strip() if 'carrier_name' in col_idx else ''
                weight = float(row[col_idx.get('weight', -1)] or 0) if 'weight' in col_idx else 0
                package_num = str(row[col_idx.get('package_num', -1)] or '1').strip() if 'package_num' in col_idx else '1'
                
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
            
            
            if errors:
                return request.make_json_response({
                    'status': 'error',
                    'message': _('Import errors'),
                    'errors': errors
                })
            
            if not pickings_data:
                return request.make_json_response({
                    'status': 'error',
                    'message': _('No valid data found in file')
                })
            
            # Create pickings
            created_count = 0
            
            for tracking_number, data in pickings_data.items():
                
                # Convert date to UTC
                user_tz = pytz.timezone(request.env.user.tz or 'UTC')
                local_dt = user_tz.localize(data['scheduled_date'])
                utc_dt = local_dt.astimezone(pytz.UTC)
                scheduled_date_str = utc_dt.strftime('%Y-%m-%d %H:%M:%S')
                
                # Create packages
                package_map = {}
                package_names = []
                
                for package_num in data['packages'].keys():
                    package_name = StockQuantPackage.set_name_based_on_account(account_partner)
                    package_names.append(package_name)
                    
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
                
                # Create picking
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
                
                # Create moves
                total_weight = 0
                
                for package_num, products_list in data['packages'].items():
                    package = package_map.get(package_num)
                    
                    for prod_data in products_list:
                        product = prod_data['product']
                        qty = prod_data['quantity']
                        
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
                        
                        if package:
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
                        
                        total_weight += product.weight * qty
                
                picking.write({'shipping_weight': total_weight})
                picking.action_confirm()
                picking.action_assign()
                
                created_count += 1
            
            
            result_message = _('%d reception(s) created successfully') % created_count
            if errors:
                result_message += '\n' + _('Warnings: %d rows skipped') % len(errors)
            
            return request.make_json_response({
                'status': 'success',
                'message': result_message,
                'created': created_count,
                'errors': errors[:10] if errors else []  # Return first 10 warnings
            })
            
        except Exception as e:
            import traceback
            error_traceback = traceback.format_exc()
            _logger = logging.getLogger(__name__)
            _logger.error('Import receptions error: %s\n%s', str(e), error_traceback)
            return request.make_json_response({
                'status': 'error',
                'message': _('Import failed: %s') % str(e),
                'traceback': error_traceback
            })

