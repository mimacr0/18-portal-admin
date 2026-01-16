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

_logger = logging.getLogger(__name__)


class PortalDashboardExpeditionsController(PortalDashboardController):
    """Controller for expedition-related dashboard endpoints"""

    @http.route('/account/dashboard/kpis/expeditions/count', type='json', auth='user')
    def account_dashboard_kpis_expeditions_count(self, **kw):
        self._ensure_user_lang_context()
        StockPicking = request.env['stock.picking'].sudo()
        domain = self._get_expedition_domain()

        count = StockPicking.search_count(domain)

        return {
            'status': 'success',
            'count': count
        }

    @http.route('/account/dashboard/kpis/expeditions/chart', type='json', auth='user')
    def account_dashboard_kpis_expeditions_chart(self, period='7d', **kw):
        self._ensure_user_lang_context()
        partner_ids = self._get_partner_ids()

        # Get expedition type
        expedition_type = request.env.ref('stock.picking_type_out', raise_if_not_found=False)
        
        expedition_values = []
        sales_draft_values = []      # Cotizaciones (draft)
        sales_delivery_values = []   # Ventas con transporte (tienen picking)
        labels = []
        end_date = datetime.now().date()
        
        # Get user language for localized date formatting (Babel expects underscore, e.g. 'en_US')
        locale = request.env.user.lang or 'en_US'

        if period == '7d':
            interval = '7 days'
            date_trunc = 'DATE'
            
            # Expeditions query
            query_exp = f"""
                SELECT {date_trunc}(date) as period_date, COUNT(*) as count
                FROM stock_picking
                WHERE picking_type_id = %s AND partner_id IN %s AND state != 'draft'
                    AND date >= NOW() - INTERVAL '{interval}'
                GROUP BY {date_trunc}(date)
                ORDER BY period_date ASC;
            """
            request.cr.execute(query_exp, (expedition_type.id if expedition_type else 0, tuple(partner_ids)))
            exp_data = {item['period_date'].strftime('%Y-%m-%d'): item['count'] for item in request.cr.dictfetchall()}
            
            # Sales Draft (Cotizaciones sin confirmar)
            query_sales_draft = f"""
                SELECT {date_trunc}(date_order) as period_date, COUNT(*) as count
                FROM sale_order
                WHERE partner_id IN %s AND state = 'draft'
                    AND date_order >= NOW() - INTERVAL '{interval}'
                GROUP BY {date_trunc}(date_order)
                ORDER BY period_date ASC;
            """
            request.cr.execute(query_sales_draft, (tuple(partner_ids),))
            sales_draft_data = {item['period_date'].strftime('%Y-%m-%d'): item['count'] for item in request.cr.dictfetchall()}
            
            # Sales with Delivery (Ventas con transporte asociado)
            query_sales_delivery = f"""
                SELECT {date_trunc}(so.date_order) as period_date, COUNT(DISTINCT so.id) as count
                FROM sale_order so
                INNER JOIN stock_picking sp ON sp.sale_id = so.id
                WHERE so.partner_id IN %s AND so.state != 'cancel'
                    AND so.date_order >= NOW() - INTERVAL '{interval}'
                GROUP BY {date_trunc}(so.date_order)
                ORDER BY period_date ASC;
            """
            request.cr.execute(query_sales_delivery, (tuple(partner_ids),))
            sales_delivery_data = {item['period_date'].strftime('%Y-%m-%d'): item['count'] for item in request.cr.dictfetchall()}
            
            start_date = end_date - timedelta(days=6)
            current = start_date
            while current <= end_date:
                key = current.strftime('%Y-%m-%d')
                # Format: "lun 09" (localized day abbreviation + day number)
                labels.append(format_date(current, format='EEE d', locale=locale))
                expedition_values.append(exp_data.get(key, 0))
                sales_draft_values.append(sales_draft_data.get(key, 0))
                sales_delivery_values.append(sales_delivery_data.get(key, 0))
                current += timedelta(days=1)

        elif period == 'week':
            from dateutil.relativedelta import relativedelta
            interval = '4 weeks'
            
            query_exp = """
                SELECT DATE_TRUNC('week', date) as period_date, COUNT(*) as count
                FROM stock_picking
                WHERE picking_type_id = %s AND partner_id IN %s AND state != 'draft'
                    AND date >= NOW() - INTERVAL '4 weeks'
                GROUP BY DATE_TRUNC('week', date)
                ORDER BY period_date ASC;
            """
            request.cr.execute(query_exp, (expedition_type.id if expedition_type else 0, tuple(partner_ids)))
            exp_data = {item['period_date'].date(): item['count'] for item in request.cr.dictfetchall()}
            
            query_sales_draft = """
                SELECT DATE_TRUNC('week', date_order) as period_date, COUNT(*) as count
                FROM sale_order
                WHERE partner_id IN %s AND state = 'draft'
                    AND date_order >= NOW() - INTERVAL '4 weeks'
                GROUP BY DATE_TRUNC('week', date_order)
                ORDER BY period_date ASC;
            """
            request.cr.execute(query_sales_draft, (tuple(partner_ids),))
            sales_draft_data = {item['period_date'].date(): item['count'] for item in request.cr.dictfetchall()}
            
            query_sales_delivery = """
                SELECT DATE_TRUNC('week', so.date_order) as period_date, COUNT(DISTINCT so.id) as count
                FROM sale_order so
                INNER JOIN stock_picking sp ON sp.sale_id = so.id
                WHERE so.partner_id IN %s AND so.state != 'cancel'
                    AND so.date_order >= NOW() - INTERVAL '4 weeks'
                GROUP BY DATE_TRUNC('week', so.date_order)
                ORDER BY period_date ASC;
            """
            request.cr.execute(query_sales_delivery, (tuple(partner_ids),))
            sales_delivery_data = {item['period_date'].date(): item['count'] for item in request.cr.dictfetchall()}
            
            for i in range(3, -1, -1):
                week_start = end_date - timedelta(days=end_date.weekday()) - timedelta(weeks=i)
                labels.append(f"{_('Week')} {week_start.strftime('%d/%m')}")
                expedition_values.append(exp_data.get(week_start, 0))
                sales_draft_values.append(sales_draft_data.get(week_start, 0))
                sales_delivery_values.append(sales_delivery_data.get(week_start, 0))

        elif period == 'month':
            from dateutil.relativedelta import relativedelta
            
            query_exp = """
                SELECT DATE_TRUNC('month', date) as period_date, COUNT(*) as count
                FROM stock_picking
                WHERE picking_type_id = %s AND partner_id IN %s AND state != 'draft'
                    AND date >= NOW() - INTERVAL '12 months'
                GROUP BY DATE_TRUNC('month', date)
                ORDER BY period_date ASC;
            """
            request.cr.execute(query_exp, (expedition_type.id if expedition_type else 0, tuple(partner_ids)))
            exp_data = {item['period_date'].date(): item['count'] for item in request.cr.dictfetchall()}
            
            query_sales_draft = """
                SELECT DATE_TRUNC('month', date_order) as period_date, COUNT(*) as count
                FROM sale_order
                WHERE partner_id IN %s AND state = 'draft'
                    AND date_order >= NOW() - INTERVAL '12 months'
                GROUP BY DATE_TRUNC('month', date_order)
                ORDER BY period_date ASC;
            """
            request.cr.execute(query_sales_draft, (tuple(partner_ids),))
            sales_draft_data = {item['period_date'].date(): item['count'] for item in request.cr.dictfetchall()}
            
            query_sales_delivery = """
                SELECT DATE_TRUNC('month', so.date_order) as period_date, COUNT(DISTINCT so.id) as count
                FROM sale_order so
                INNER JOIN stock_picking sp ON sp.sale_id = so.id
                WHERE so.partner_id IN %s AND so.state != 'cancel'
                    AND so.date_order >= NOW() - INTERVAL '12 months'
                GROUP BY DATE_TRUNC('month', so.date_order)
                ORDER BY period_date ASC;
            """
            request.cr.execute(query_sales_delivery, (tuple(partner_ids),))
            sales_delivery_data = {item['period_date'].date(): item['count'] for item in request.cr.dictfetchall()}
            
            for i in range(11, -1, -1):
                month_start = (end_date.replace(day=1) - relativedelta(months=i))
                # Format: "dic 2025" (localized month abbreviation + year)
                labels.append(format_date(month_start, format='MMM yyyy', locale=locale))
                expedition_values.append(exp_data.get(month_start, 0))
                sales_draft_values.append(sales_draft_data.get(month_start, 0))
                sales_delivery_values.append(sales_delivery_data.get(month_start, 0))

        elif period == 'year':
            query_exp = """
                SELECT DATE_TRUNC('year', date) as period_date, COUNT(*) as count
                FROM stock_picking
                WHERE picking_type_id = %s AND partner_id IN %s AND state != 'draft'
                    AND date >= NOW() - INTERVAL '5 years'
                GROUP BY DATE_TRUNC('year', date)
                ORDER BY period_date ASC;
            """
            request.cr.execute(query_exp, (expedition_type.id if expedition_type else 0, tuple(partner_ids)))
            exp_data = {item['period_date'].year: item['count'] for item in request.cr.dictfetchall()}
            
            query_sales_draft = """
                SELECT DATE_TRUNC('year', date_order) as period_date, COUNT(*) as count
                FROM sale_order
                WHERE partner_id IN %s AND state = 'draft'
                    AND date_order >= NOW() - INTERVAL '5 years'
                GROUP BY DATE_TRUNC('year', date_order)
                ORDER BY period_date ASC;
            """
            request.cr.execute(query_sales_draft, (tuple(partner_ids),))
            sales_draft_data = {item['period_date'].year: item['count'] for item in request.cr.dictfetchall()}
            
            query_sales_delivery = """
                SELECT DATE_TRUNC('year', so.date_order) as period_date, COUNT(DISTINCT so.id) as count
                FROM sale_order so
                INNER JOIN stock_picking sp ON sp.sale_id = so.id
                WHERE so.partner_id IN %s AND so.state != 'cancel'
                    AND so.date_order >= NOW() - INTERVAL '5 years'
                GROUP BY DATE_TRUNC('year', so.date_order)
                ORDER BY period_date ASC;
            """
            request.cr.execute(query_sales_delivery, (tuple(partner_ids),))
            sales_delivery_data = {item['period_date'].year: item['count'] for item in request.cr.dictfetchall()}
            
            for i in range(4, -1, -1):
                year = end_date.year - i
                labels.append(str(year))
                expedition_values.append(exp_data.get(year, 0))
                sales_draft_values.append(sales_draft_data.get(year, 0))
                sales_delivery_values.append(sales_delivery_data.get(year, 0))

        return {
            'status': 'success',
            'labels': labels,
            'values': expedition_values,  # Mantener compatibilidad
            'expeditions': expedition_values,
            'sales_draft': sales_draft_values,
            'sales_delivery': sales_delivery_values,
            'translations': {
                'deliveries': _('Deliveries'),
                'quotes': _('Quotes'),
                'sales': _('Sales'),
                'period_labels': {
                    '7d': _('Last 7 days'),
                    'week': _('Last 4 weeks'),
                    'month': _('Last 12 months'),
                    'year': _('Last 5 years'),
                }
            }
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
            required_cols = ['reference', 'scheduled_date', 'product', 'quantity']
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
            
            SaleOrder = request.env['sale.order'].sudo()
            SaleOrderLine = request.env['sale.order.line'].sudo()
            ProductProduct = request.env['product.product'].sudo()
            AccountPartner = request.env['account.partner'].sudo()
            ResPartner = request.env['res.partner'].sudo()
            ResCountry = request.env['res.country'].sudo()
            
            account_partner = AccountPartner.search([
                ('partner_id', '=', partner.commercial_partner_id.id)
            ], limit=1)
            
            # Group rows by reference (each reference = one sale order)
            orders_data = {}
            errors = []
            row_num = 1
            
            for row in sheet.iter_rows(min_row=2, values_only=True):
                row_num += 1
                
                # Skip empty rows
                if not any(row):
                    continue
                
                
                reference = str(row[col_idx['reference']] or '').strip()
                if not reference:
                    errors.append(_('Row %d: Missing reference') % row_num)
                    continue
                
                # Parse scheduled date (commitment date)
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
                
                
                # Get product (replace non-breaking spaces and other unicode spaces)
                product_ref = str(row[col_idx['product']] or '').strip()
                # Replace non-breaking space (\xa0) with regular space
                product_ref = product_ref.replace('\xa0', ' ').replace('\u00a0', ' ')
                _logger.info("=== IMPORT EXPEDITIONS === Row %d: product_ref = '%s' (repr: %r)", row_num, product_ref, product_ref)
                if not product_ref:
                    errors.append(_('Row %d: Missing product') % row_num)
                    continue
                
                # Search by default_code (exact) or name (ilike)
                product = ProductProduct.search([
                    '|', ('default_code', '=', product_ref), ('name', 'ilike', product_ref)
                ], limit=1)
                _logger.info("=== IMPORT EXPEDITIONS === Row %d: search domain = ['|', ('default_code', '=', '%s'), ('name', 'ilike', '%s')]", row_num, product_ref, product_ref)
                _logger.info("=== IMPORT EXPEDITIONS === Row %d: product found = %s (id=%s, name=%s)", row_num, bool(product), product.id if product else None, product.display_name if product else None)
                if not product:
                    # Try additional search methods
                    _logger.info("=== IMPORT EXPEDITIONS === Row %d: Trying alternative searches...", row_num)
                    # Try exact name match
                    product = ProductProduct.search([('name', '=', product_ref)], limit=1)
                    _logger.info("=== IMPORT EXPEDITIONS === Row %d: Exact name search result = %s", row_num, product.display_name if product else None)
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
                
                # Optional price
                price = 0.0
                if 'price' in col_idx:
                    try:
                        price = float(row[col_idx['price']] or 0)
                    except (ValueError, TypeError):
                        price = 0.0
                
                # Destination address fields (optional)
                dest_name = str(row[col_idx.get('destination_name', -1)] or '').strip() if 'destination_name' in col_idx else ''
                dest_street = str(row[col_idx.get('destination_street', -1)] or '').strip() if 'destination_street' in col_idx else ''
                dest_city = str(row[col_idx.get('destination_city', -1)] or '').strip() if 'destination_city' in col_idx else ''
                dest_zip = str(row[col_idx.get('destination_zip', -1)] or '').strip() if 'destination_zip' in col_idx else ''
                dest_country_code = str(row[col_idx.get('destination_country', -1)] or '').strip() if 'destination_country' in col_idx else ''
                
                
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
            
            
            if errors:
                return request.make_json_response({
                    'status': 'error',
                    'message': _('Import errors'),
                    'errors': errors
                })
            
            if not orders_data:
                return request.make_json_response({
                    'status': 'error',
                    'message': _('No valid data found in file')
                })
            
            # Create sale orders
            created_count = 0
            
            for reference, data in orders_data.items():
                
                # Convert date to UTC for commitment_date
                user_tz = pytz.timezone(request.env.user.tz or 'UTC')
                local_dt = user_tz.localize(data['scheduled_date'])
                utc_dt = local_dt.astimezone(pytz.UTC)
                commitment_date_str = utc_dt.strftime('%Y-%m-%d %H:%M:%S')
                
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
                
                # Create sale order
                order_vals = {
                    'partner_id': partner.commercial_partner_id.id,
                    'partner_shipping_id': delivery_partner_id,
                    'account_partner_id': account_partner.id if account_partner else False,
                    'client_order_ref': reference,
                    'commitment_date': commitment_date_str,
                    'origin': f'Import: {reference}',
                }
                
                order = SaleOrder.create(order_vals)
                
                # Create order lines
                for line_data in data['lines']:
                    product = line_data['product']
                    qty = line_data['quantity']
                    price = line_data['price']
                    
                    
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
                
                # Confirm the order (commented to leave as draft)
                # print(f"[IMPORT EXPEDITIONS] Confirming order...")
                # order.action_confirm()
                # print(f"[IMPORT EXPEDITIONS] Order {order.name} confirmed")
                
                created_count += 1
            
            
            result_message = _('%d sale order(s) created successfully') % created_count
            if errors:
                result_message += '\n' + _('Warnings: %d rows skipped') % len(errors)
            
            # Send recent activity notification for imported expeditions
            if created_count > 0:
                user = request.env.user
                user.send_portal_user_recent_activity(
                    "%d expedition(s) imported from Excel",
                    "Expeditions imported",
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
            _logger.error('Import expeditions error: %s\n%s', str(e), error_traceback)
            return request.make_json_response({
                'status': 'error',
                'message': _('Import failed: %s') % str(e),
                'traceback': error_traceback
            })
