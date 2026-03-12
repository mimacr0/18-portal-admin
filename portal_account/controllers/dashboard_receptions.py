##############################################################################
#
# Copyright 2025-Today DaFe Solutions
#
##############################################################################

from datetime import datetime, timedelta
import logging

import pytz
from babel.dates import format_date

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
        
        # Get user language for localized date formatting (Babel expects underscore, e.g. 'en_US')
        locale = request.env.user.lang or 'en_US'

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
                # Format: "lun 09" (localized day abbreviation + day number)
                labels.append(format_date(current, format='EEE d', locale=locale))
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
                labels.append(f"{_('Week')} {week_start.strftime('%d/%m')}")
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
                # Format: "dic 2025" (localized month abbreviation + year)
                labels.append(format_date(month_start, format='MMM yyyy', locale=locale))
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
            'values': values,
            'translations': {
                'series_name': _('Receptions'),
                'period_labels': {
                    '7d': _('Last 7 days'),
                    'week': _('Last 4 weeks'),
                    'month': _('Last 12 months'),
                    'year': _('Last 5 years'),
                }
            }
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
            
            # Get headers from first row (remove asterisks and extra spaces)
            def clean_header(value):
                if not value:
                    return ''
                # Remove asterisks and extra whitespace
                return value.lower().replace('*', '').strip()
            
            headers = [clean_header(cell.value) for cell in sheet[1]]
            
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
                
                # Get product (replace non-breaking spaces and other unicode spaces)
                product_ref = str(row[col_idx['product']] or '').strip()
                # Replace non-breaking space (\xa0) with regular space
                product_ref = product_ref.replace('\xa0', ' ').replace('\u00a0', ' ')
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
            
            # Send recent activity notification for imported receptions
            if created_count > 0:
                user = request.env.user
                user.send_portal_user_recent_activity(
                    "%d reception(s) imported from Excel",
                    "Receptions imported",
                    "fas fa-file-import",
                    "success",
                    message_args=[created_count]
                )
            
            return request.make_json_response({
                'status': 'success',
                'message': result_message,
                'created': created_count,
                'errors': errors[:10] if errors else [],  # Return first 10 warnings
                'reload': True  # Signal frontend to reload page
            })
            
        except Exception as e:
            import traceback
            error_traceback = traceback.format_exc()
            _logger.error('Import receptions error: %s\n%s', str(e), error_traceback)
            return request.make_json_response({
                'status': 'error',
                'message': _('Import failed: %s') % str(e),
                'traceback': error_traceback
            })

    @http.route('/account/dashboard/download_receptions_template', type='http', auth='user', methods=['GET'])
    def download_receptions_template(self, **kw):
        """Generate and download receptions import template with package types sheet."""
        import io
        
        try:
            import openpyxl
            from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
        except ImportError:
            return request.make_response(
                'Excel generation not available. Please install openpyxl.',
                headers=[('Content-Type', 'text/plain')]
            )
        
        try:
            workbook = openpyxl.Workbook()
            
            # ============================================
            # Sheet 1: Receptions Template
            # ============================================
            sheet1 = workbook.active
            sheet1.title = 'Receptions'
            
            # Define headers
            headers = ['tracking_number*', 'scheduled_date*', 'package_type*', 'package_number', 'product*', 'quantity*', 'carrier_name', 'weight']
            
            # Header styles
            header_font = Font(bold=True, color='FFFFFF')
            required_fill = PatternFill(start_color='4472C4', end_color='4472C4', fill_type='solid')
            optional_fill = PatternFill(start_color='70AD47', end_color='70AD47', fill_type='solid')
            thin_border = Border(
                left=Side(style='thin'),
                right=Side(style='thin'),
                top=Side(style='thin'),
                bottom=Side(style='thin')
            )
            
            # Write headers
            for col, header in enumerate(headers, 1):
                cell = sheet1.cell(row=1, column=col, value=header)
                cell.font = header_font
                cell.border = thin_border
                cell.alignment = Alignment(horizontal='center')
                cell.fill = required_fill if header.endswith('*') else optional_fill
            
            # Add example rows
            example_data = [
                ['TRACK001', '20/01/2026 10:00', 'Box', 1, 'Product A', 5, 'DHL', 2.5],
                ['TRACK001', '20/01/2026 10:00', 'Box', 1, 'Product B', 3, 'DHL', 2.5],
                ['TRACK001', '20/01/2026 10:00', 'Box', 2, 'Product C', 10, 'DHL', 1.2],
            ]
            
            for row_idx, row_data in enumerate(example_data, 2):
                for col_idx, value in enumerate(row_data, 1):
                    cell = sheet1.cell(row=row_idx, column=col_idx, value=value)
                    cell.border = thin_border
            
            # Set column widths
            for col in range(1, len(headers) + 1):
                sheet1.column_dimensions[openpyxl.utils.get_column_letter(col)].width = 18
            
            # ============================================
            # Sheet 2: Instructions
            # ============================================
            sheet2 = workbook.create_sheet('Instructions')
            
            instructions = [
                ['RECEPTIONS IMPORT TEMPLATE INSTRUCTIONS'],
                [''],
                ['REQUIRED COLUMNS (Blue):'],
                ['tracking_number*', 'Tracking number for the shipment'],
                ['scheduled_date*', 'Expected date in format DD/MM/YYYY HH:MM'],
                ['package_type*', 'Package type (see "Package Types" sheet)'],
                ['product*', 'Product name or SKU'],
                ['quantity*', 'Quantity of product'],
                [''],
                ['OPTIONAL COLUMNS (Green):'],
                ['package_number', 'Package number within shipment (1, 2, 3...)'],
                ['carrier_name', 'Carrier/courier name'],
                ['weight', 'Package weight in kg'],
                [''],
                ['NOTES:'],
                ['- Rows with same tracking_number are grouped into one reception'],
                ['- Rows with same package_number within a tracking go into the same package'],
            ]
            
            for row_idx, row_data in enumerate(instructions, 1):
                for col_idx, value in enumerate(row_data, 1):
                    cell = sheet2.cell(row=row_idx, column=col_idx, value=value)
                    if row_idx == 1:
                        cell.font = Font(bold=True, size=14)
                    elif value and value.endswith(':'):
                        cell.font = Font(bold=True)
            
            sheet2.column_dimensions['A'].width = 20
            sheet2.column_dimensions['B'].width = 50
            
            # ============================================
            # Sheet 3: Package Types
            # ============================================
            sheet3 = workbook.create_sheet('Package Types')
            
            StockPackageType = request.env['stock.package.type'].sudo()
            package_types = StockPackageType.search([], order='name')
            
            # Headers
            pt_headers = ['Name', 'Barcode', 'Length (mm)', 'Width (mm)', 'Height (mm)', 'Base Weight (kg)', 'Max Weight (kg)']
            for col, header in enumerate(pt_headers, 1):
                cell = sheet3.cell(row=1, column=col, value=header)
                cell.font = Font(bold=True, color='FFFFFF')
                cell.fill = PatternFill(start_color='ED7D31', end_color='ED7D31', fill_type='solid')
                cell.border = thin_border
                cell.alignment = Alignment(horizontal='center')
            
            # Data
            for row_idx, pt in enumerate(package_types, 2):
                sheet3.cell(row=row_idx, column=1, value=pt.name).border = thin_border
                sheet3.cell(row=row_idx, column=2, value=pt.barcode or '').border = thin_border
                sheet3.cell(row=row_idx, column=3, value=pt.packaging_length or 0).border = thin_border
                sheet3.cell(row=row_idx, column=4, value=pt.width or 0).border = thin_border
                sheet3.cell(row=row_idx, column=5, value=pt.height or 0).border = thin_border
                sheet3.cell(row=row_idx, column=6, value=pt.base_weight or 0).border = thin_border
                sheet3.cell(row=row_idx, column=7, value=pt.max_weight or 0).border = thin_border
            
            # Set column widths
            for col in range(1, len(pt_headers) + 1):
                sheet3.column_dimensions[openpyxl.utils.get_column_letter(col)].width = 15
            
            # Save to bytes
            output = io.BytesIO()
            workbook.save(output)
            output.seek(0)
            
            return request.make_response(
                output.read(),
                headers=[
                    ('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
                    ('Content-Disposition', 'attachment; filename=receptions_template.xlsx')
                ]
            )
            
        except Exception as e:
            import traceback
            error_msg = f'Error generating template: {str(e)}\n{traceback.format_exc()}'
            return request.make_response(
                error_msg,
                headers=[('Content-Type', 'text/plain')]
            )

