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
from odoo.addons.portal_reception.controllers.reception_list import PortalReceptionListController


class PortalReceptionDetailsController(PortalReceptionListController):
    """Controller for reception details view and update operations"""

    def _get_portal_user_partner_ids(self):
        partner_id = request.env.user.partner_id
        return list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

    def _get_portal_reception_record(self, package_id):
        StockPackage = request.env['stock.quant.package'].sudo()
        partner_ids = self._get_portal_user_partner_ids()

        domain = [
            ('id', '=', int(package_id)),
            ('type', '=', 'return'),
            # ('owner_id', 'in', partner_ids),
        ]

        return StockPackage.search(domain, limit=1)

    @http.route('/account/reception/details/<int:reception_id>', type='http', auth="user", website=True)
    def account_reception_details_action(self, reception_id, access_token=None, **post):
        self._ensure_user_lang_context()
        StockPackage = request.env['stock.quant.package'].sudo()
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

        package = StockPackage.search([
            ('id', '=', reception_id),
            ('type', '=', 'return'),
            # ('owner_id', 'in', partner_ids)
        ], limit=1)

        if not package:
            return request.redirect('/account/reception')

        values = self._get_admin_layout_values()
        values.update({
            'page_name': 'reception_details',
            'package': package,
            'page_title': _('Package Details'),
            'page_url': '/account/reception/details/%s' % reception_id,
        })

        return request.render("portal_reception.portal_reception_details_page", values)

    def _setup_portal_message_fetch_extra_domain(self, data):
        return []

    @http.route('/portal_reception/reception/details/chatter/fetch', type='json', auth='public', website=True)
    def portal_reception_details_chatter_fetch(self, reception_id=None, limit=10, after=None, before=None, **kw):
        """Add compatible route matching the JS client call pattern"""
        self._ensure_user_lang_context()
        if not reception_id:
            return {
                'data': {'mail.message': []},
                'status': 'success'
            }

        model = request.env['stock.quant.package']
        domain = [
            ('res_id', '=', int(reception_id)),
            ('model', '=', 'stock.quant.package'),
            ('subtype_id', '=', request.env.ref('mail.mt_comment').id),
            '|',
            ('body', '!=', ''),
            ('attachment_ids', '!=', False)
        ]

        Message = request.env['mail.message']
        StockPackage = request.env['stock.quant.package'].sudo()
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

        package = StockPackage.search([
            ('id', '=', int(reception_id)),
            ('type', '=', 'return'),
            # ('owner_id', 'in', partner_ids)
        ], limit=1)

        if not package:
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

    @http.route('/portal_reception/reception/details/chatter/post', type='http', auth="user", methods=['POST'])
    def portal_reception_details_chatter_post(self, reception_id, access_token=None, **post):
        """Add compatible route for posting messages from JS client"""
        self._ensure_user_lang_context()
        if not str(reception_id).isdigit():
            return json.dumps({'status': 'error', 'message': 'Invalid reception ID'})

        StockPackage = request.env['stock.quant.package'].sudo()
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

        package = StockPackage.search([
            ('id', '=', int(reception_id)),
            ('type', '=', 'return'),
            # ('owner_id', 'in', partner_ids)
        ], limit=1)

        if not package:
            return json.dumps({'status': 'error', 'message': 'Access denied'})

        attachment_id = False
        attachment_data = post.get('attachment')
        if attachment_data and hasattr(attachment_data, 'filename'):
            ufile = attachment_data
            if ufile:
                vals = {
                    "name": ufile.filename,
                    "raw": ufile.read(),
                    "res_id": int(reception_id),
                    "res_model": 'stock.quant.package',
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
            message = package.sudo().with_user(request.env.user).with_context(
                skip_portal_follower_notify=True,
                portal_author_partner_id=request.env.user.partner_id.id,
            ).message_post(
                body=message_content,
                message_type='comment',
                subtype_xmlid='mail.mt_comment',
                attachment_ids=attachment_ids,
                author_id=request.env.user.partner_id.id
            )
            package.sudo().notify_portal_followers(author_partner_id=request.env.user.partner_id.id)

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

    @http.route('/account/reception/delete', type='json', auth='user')
    def account_reception_delete(self, reception_id=None, **kw):
        """Cancel a single reception."""
        self._ensure_user_lang_context()
        if not reception_id or not str(reception_id).isdigit():
            return {'status': 'error', 'message': _('Invalid reception ID')}

        package = self._get_portal_reception_record(int(reception_id))
        if not package:
            return {'status': 'error', 'message': _('Package not found or cannot be cancelled')}

        package.unlink() # Or cancel if state allows
        return {'status': 'success'}

    @http.route('/account/reception/update/note', type='json', auth='user')
    def account_reception_update_note(self, reception_id=None, note='', **kw):
        """Update the note field of a reception."""
        self._ensure_user_lang_context()
        if not reception_id or not str(reception_id).isdigit():
            return {'status': 'error', 'message': _('Invalid reception ID')}

        package = self._get_portal_reception_record(int(reception_id))
        if not package:
            return {'status': 'error', 'message': _('Package not found')}

        package.sudo().write({'notes': note})
        return {'status': 'success'}

    @http.route('/account/reception/get', type='json', auth='user')
    def account_reception_get(self, reception_id=None, **kw):
        """Fetch minimal editable data for a reception to prefill the edit modal."""
        self._ensure_user_lang_context()
        if not reception_id or not str(reception_id).isdigit():
            return {'status': 'error', 'message': _('Invalid reception ID')}

        package = self._get_portal_reception_record(int(reception_id))
        if not package:
            return {'status': 'error', 'message': _('Package not found')}

        package_type = package.package_type_id
        carrier_tracking_ref = package.name
        optional_tracking_ref = "" # Not used in simple package model yet

        formatted_scheduled_date = ''
        try:
            if package.pack_date:
                formatted_scheduled_date = str(package.pack_date)
        except Exception:
            formatted_scheduled_date = ''

        return {
            'status': 'success',
            'data': {
                'id': package.id,
                'package_type_id': package_type and {'id': package_type.id, 'name': package_type.name} or None,
                'width': package_type and package_type.width or 0,
                'height': package_type and package_type.height or 0,
                'length': package_type and package_type.packaging_length or 0,
                'weight': package.shipping_weight,
                'scheduled_date': formatted_scheduled_date,
                'tracking_number': carrier_tracking_ref,
                'tracking_number_optional': optional_tracking_ref,
                'carrier': package.carrier_id and {
                    'id': package.carrier_id.id,
                    'name': package.carrier_id.name,
                } or None,
                'carrier_name': package.carrier_id.name if package.carrier_id else '',
                'products': package.rma_products_line_ids.mapped(lambda l: {
                    'product_id': l.product_map_id.id,
                    'product_quantity': l.quantity
                })
            }
        }

    @http.route('/account/reception/update', type='json', auth='user')
    def account_reception_update(self, reception_id=None, scheduled_date=None, carrier_id=None, **kw):
        """Update editable header fields of a reception."""
        self._ensure_user_lang_context()
        if not reception_id or not str(reception_id).isdigit():
            return {'status': 'error', 'message': _('Invalid reception ID')}

        package = self._get_portal_reception_record(int(reception_id))
        if not package:
            return {'status': 'error', 'message': _('Package not found or access denied')}

        if package.rma_state in ('done'):
            return {'status': 'error', 'message': _('Cannot update a completed reception')}

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
                package.sudo().write(vals)

            return {'status': 'success', 'message': _('Reception updated successfully')}
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

    @http.route('/account/reception/print/<int:package_id>', type='http', auth='user')
    def account_reception_print(self, package_id, **kw):
        """Print the package label."""
        package = self._get_portal_reception_record(package_id)
        if not package:
            return request.not_found()

        # Assuming the report is 'stock.report_package_barcode' or similar
        # Since rma_label doesn't specify one, we might need to check if there's a custom rma label report.
        # For now, let's try to use the standard package barcode one if available.
        report = request.env.ref('stock.action_report_quant_package_barcode_small').sudo()
        pdf_content, content_type = report._render_qweb_pdf(package.id)

        pdfhttpheaders = [
            ('Content-Type', 'application/pdf'),
            ('Content-Length', len(pdf_content)),
            ('Content-Disposition', f'attachment; filename="Label_{package.name}.pdf"')
        ]
        return request.make_response(pdf_content, headers=pdfhttpheaders)

