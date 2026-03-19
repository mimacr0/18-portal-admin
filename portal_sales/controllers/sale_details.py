##############################################################################
#
# Copyright 2025-Today DaFe Solutions
#
##############################################################################

import json
import pytz
from datetime import datetime

from odoo import http, _
from odoo.http import request
from odoo.osv import expression
from odoo.addons.portal_sales.controllers.sale_list import PortalSaleListController


class PortalSaleDetailsController(PortalSaleListController):
    """Controller for sale details view and update operations"""

    def _get_portal_user_partner_ids(self):
        partner_id = request.env.user.partner_id
        return list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

    def _get_portal_sales_record(self, order_id):
        StockPackage = request.env['sale.order'].sudo()
        partner_ids = self._get_portal_user_partner_ids()

        domain = [
            ('id', '=', int(order_id)),
            ('type', '=', 'return'),
            # ('owner_id', 'in', partner_ids),
        ]

        return StockPackage.search(domain, limit=1)

    @http.route('/account/sale/details/<int:sale_id>', type='http', auth="user", website=True)
    def account_sale_details_action(self, sale_id, access_token=None, **post):
        self._ensure_user_lang_context()
        StockPackage = request.env['sale.order'].sudo()
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

        order = StockPackage.search([
            ('id', '=', sale_id),
            ('type', '=', 'return'),
            # ('owner_id', 'in', partner_ids)
        ], limit=1)

        if not order:
            return request.redirect('/account/sale')

        values = self._get_admin_layout_values()
        values.update({
            'page_name': 'sale_details',
            'order': order,
            'page_title': _('Package Details'),
            'page_url': '/account/sale/details/%s' % sale_id,
        })

        return request.render("portal_sales.portal_sales_details_page", values)

    def _setup_portal_message_fetch_extra_domain(self, data):
        return []

    @http.route('/portal_sales/sale/details/chatter/fetch', type='json', auth='public', website=True)
    def portal_sales_details_chatter_fetch(self, sale_id=None, limit=10, after=None, before=None, **kw):
        """Add compatible route matching the JS client call pattern"""
        self._ensure_user_lang_context()
        if not sale_id:
            return {
                'data': {'mail.message': []},
                'status': 'success'
            }

        model = request.env['sale.order']
        domain = [
            ('res_id', '=', int(sale_id)),
            ('model', '=', 'sale.order'),
            ('subtype_id', '=', request.env.ref('mail.mt_comment').id),
            '|',
            ('body', '!=', ''),
            ('attachment_ids', '!=', False)
        ]

        Message = request.env['mail.message']
        StockPackage = request.env['sale.order'].sudo()
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

        order = StockPackage.search([
            ('id', '=', int(sale_id)),
            ('type', '=', 'return'),
            # ('owner_id', 'in', partner_ids)
        ], limit=1)

        if not order:
            return {
                'data': {'mail.message': []},
                'status': 'error',
                'message': 'Access denied'
            }

        if not request.env.user._is_internal():
            domain = expression.AND([Message._get_search_domain_share(), domain])

        messages = Message.sudo().search(domain, limit=limit, order='date ASC, id ASC')
        formatted_messages = messages.portal_message_format() if messages else []

        return {
            'data': {
                'mail.message': formatted_messages
            },
            'status': 'success'
        }

    @http.route('/portal_sales/sale/details/chatter/post', type='http', auth="user", methods=['POST'])
    def portal_sales_details_chatter_post(self, sale_id, access_token=None, **post):
        """Add compatible route for posting messages from JS client"""
        self._ensure_user_lang_context()
        if not str(sale_id).isdigit():
            return json.dumps({'status': 'error', 'message': 'Invalid sale ID'})

        StockPackage = request.env['sale.order'].sudo()
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

        order = StockPackage.search([
            ('id', '=', int(sale_id)),
            ('type', '=', 'return'),
            # ('owner_id', 'in', partner_ids)
        ], limit=1)

        if not order:
            return json.dumps({'status': 'error', 'message': 'Access denied'})

        attachment_id = False
        attachment_data = post.get('attachment')
        if attachment_data and hasattr(attachment_data, 'filename'):
            ufile = attachment_data
            if ufile:
                vals = {
                    "name": ufile.filename,
                    "raw": ufile.read(),
                    "res_id": int(sale_id),
                    "res_model": 'sale.order',
                }

                if request.env.user.share:
                    vals["access_token"] = request.env["ir.attachment"]._generate_access_token()

                try:
                    attachment = request.env["ir.attachment"].sudo().create(vals)
                    attachment_id = attachment.id
                except Exception:
                    return json.dumps({"status": "error", "message": _("You are not allowed to upload an attachment here.")})

        message_content = post.get('message', '')
        attachment_ids = [attachment_id] if attachment_id else []

        try:
            message = order.sudo().with_user(request.env.user).with_context(
                skip_portal_follower_notify=True,
                portal_author_partner_id=request.env.user.partner_id.id,
            ).message_post(
                body=message_content,
                message_type='comment',
                subtype_xmlid='mail.mt_comment',
                attachment_ids=attachment_ids,
                author_id=request.env.user.partner_id.id
            )
            order.sudo().notify_portal_followers(author_partner_id=request.env.user.partner_id.id)

            return json.dumps({
                'status': 'success',
                'message_id': message.id
            })
        except Exception as e:
            return json.dumps({
                'status': 'error',
                'message': str(e)
            })

    # =============================
    # Update/Delete API Endpoints
    # =============================

    @http.route('/account/sale/delete', type='json', auth='user')
    def account_sale_delete(self, sale_id=None, **kw):
        """Cancel a single sale."""
        self._ensure_user_lang_context()
        if not sale_id or not str(sale_id).isdigit():
            return {'status': 'error', 'message': _('Invalid sale ID')}

        order = self._get_portal_sales_record(int(sale_id))
        if not order:
            return {'status': 'error', 'message': _('Package not found or cannot be cancelled')}

        order.unlink() # Or cancel if state allows
        return {'status': 'success'}

    @http.route('/account/sale/update/note', type='json', auth='user')
    def account_sale_update_note(self, sale_id=None, note='', **kw):
        """Update the note field of a sale."""
        self._ensure_user_lang_context()
        if not sale_id or not str(sale_id).isdigit():
            return {'status': 'error', 'message': _('Invalid sale ID')}

        order = self._get_portal_sales_record(int(sale_id))
        if not order:
            return {'status': 'error', 'message': _('Package not found')}

        order.sudo().write({'notes': note})
        return {'status': 'success'}

    @http.route('/account/sale/get', type='json', auth='user')
    def account_sale_get(self, sale_id=None, **kw):
        """Fetch minimal editable data for a sale to prefill the edit modal."""
        self._ensure_user_lang_context()
        if not sale_id or not str(sale_id).isdigit():
            return {'status': 'error', 'message': _('Invalid sale ID')}

        order = self._get_portal_sales_record(int(sale_id))
        if not order:
            return {'status': 'error', 'message': _('Package not found')}

        order_type = order.order_type_id
        carrier_tracking_ref = order.name
        optional_tracking_ref = "" # Not used in simple order model yet

        formatted_scheduled_date = ''
        try:
            if order.pack_date:
                formatted_scheduled_date = str(order.pack_date)
        except Exception:
            formatted_scheduled_date = ''

        return {
            'status': 'success',
            'data': {
                'id': order.id,
                'order_type_id': order_type and {'id': order_type.id, 'name': order_type.name} or None,
                'width': order_type and order_type.width or 0,
                'height': order_type and order_type.height or 0,
                'length': order_type and order_type.packaging_length or 0,
                'weight': order.shipping_weight,
                'scheduled_date': formatted_scheduled_date,
                'tracking_number': carrier_tracking_ref,
                'tracking_number_optional': optional_tracking_ref,
                'carrier': order.carrier_id and {
                    'id': order.carrier_id.id,
                    'name': order.carrier_id.name,
                } or None,
                'carrier_name': order.carrier_id.name if order.carrier_id else '',
                'products': order.order_products_line_ids.mapped(lambda l: {
                    'product_id': l.product_map_id.id,
                    'product_quantity': l.quantity
                })
            }
        }

    @http.route('/account/sale/update', type='json', auth='user')
    def account_sale_update(self, sale_id=None, scheduled_date=None, carrier_id=None, **kw):
        """Update editable header fields of a sale."""
        self._ensure_user_lang_context()
        if not sale_id or not str(sale_id).isdigit():
            return {'status': 'error', 'message': _('Invalid sale ID')}

        order = self._get_portal_sales_record(int(sale_id))
        if not order:
            return {'status': 'error', 'message': _('Package not found or access denied')}

        if order.rma_state in ('done'):
            return {'status': 'error', 'message': _('Cannot update a completed sale')}

        vals = {}

        if scheduled_date:
            vals['pack_date'] = scheduled_date

        if carrier_id:
            try:
                vals['carrier_id'] = int(carrier_id)
            except Exception:
                return {'status': 'error', 'message': _('Invalid carrier')}

        try:
            if vals:
                order.sudo().write(vals)

            return {'status': 'success', 'message': _('Sale updated successfully')}
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

    @http.route('/account/sale/print/<int:order_id>', type='http', auth='user')
    def account_sale_print(self, order_id, **kw):
        """Print the order label."""
        order = self._get_portal_sales_record(order_id)
        if not order:
            return request.not_found()

        # Assuming the report is 'stock.report_order_barcode' or similar
        # Since rma_label doesn't specify one, we might need to check if there's a custom rma label report.
        # For now, let's try to use the standard order barcode one if available.
        report = request.env.ref('stock.action_report_quant_order_barcode_small').sudo()
        pdf_content, content_type = report._render_qweb_pdf(order.id)

        pdfhttpheaders = [
            ('Content-Type', 'application/pdf'),
            ('Content-Length', len(pdf_content)),
            ('Content-Disposition', f'attachment; filename="Label_{order.name}.pdf"')
        ]
        return request.make_response(pdf_content, headers=pdfhttpheaders)

