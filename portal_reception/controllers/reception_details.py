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

    def _get_portal_reception_record(self, picking_id):
        StockPicking = request.env['stock.picking'].sudo()
        reception_type = request.env.ref('stock.picking_type_in')
        partner_ids = self._get_portal_user_partner_ids()

        domain = [
            ('id', '=', int(picking_id)),
            ('picking_type_id', '=', reception_type.id),
            ('partner_id', 'in', partner_ids),
        ]

        return StockPicking.search(domain, limit=1)

    @http.route('/account/reception/details/<int:reception_id>', type='http', auth="user", website=True)
    def account_reception_details_action(self, reception_id, access_token=None, **post):
        self._ensure_user_lang_context()
        StockPicking = request.env['stock.picking'].sudo()
        reception_type = request.env.ref('stock.picking_type_in')
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

        picking = StockPicking.search([
            ('id', '=', reception_id),
            ('picking_type_id', '=', reception_type.id),
            ('partner_id', 'in', partner_ids)
        ], limit=1)

        if not picking:
            return request.redirect('/account/reception')

        values = self._get_admin_layout_values()
        values.update({
            'page_name': 'reception_details',
            'picking': picking,
            'page_title': _('Reception Details'),
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

        model = request.env['stock.picking']
        domain = [
            ('res_id', '=', int(reception_id)),
            ('model', '=', 'stock.picking'),
            ('subtype_id', '=', request.env.ref('mail.mt_comment').id),
            '|',
            ('body', '!=', ''),
            ('attachment_ids', '!=', False)
        ]

        Message = request.env['mail.message']
        StockPicking = request.env['stock.picking'].sudo()
        reception_type = request.env.ref('stock.picking_type_in')
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

        picking = StockPicking.search([
            ('id', '=', int(reception_id)),
            ('picking_type_id', '=', reception_type.id),
            ('partner_id', 'in', partner_ids)
        ], limit=1)

        if not picking:
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

        StockPicking = request.env['stock.picking'].sudo()
        reception_type = request.env.ref('stock.picking_type_in')
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

        picking = StockPicking.search([
            ('id', '=', int(reception_id)),
            ('picking_type_id', '=', reception_type.id),
            ('partner_id', 'in', partner_ids)
        ], limit=1)

        if not picking:
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
                    "res_model": 'stock.picking',
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
            message = picking.sudo().with_user(request.env.user).message_post(
                body=message_content,
                message_type='comment',
                subtype_xmlid='mail.mt_comment',
                attachment_ids=attachment_ids,
                author_id=request.env.user.partner_id.id
            )

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

        picking = self._get_portal_reception_record(int(reception_id))
        if not picking:
            return {'status': 'error', 'message': _('Reception not found or cannot be cancelled')}

        picking.action_cancel()
        return {'status': 'success'}

    @http.route('/account/reception/update/note', type='json', auth='user')
    def account_reception_update_note(self, reception_id=None, note='', **kw):
        """Update the note field of a reception."""
        self._ensure_user_lang_context()
        if not reception_id or not str(reception_id).isdigit():
            return {'status': 'error', 'message': _('Invalid reception ID')}

        picking = self._get_portal_reception_record(int(reception_id))
        if not picking:
            return {'status': 'error', 'message': _('Reception not found')}

        picking.sudo().write({'note': note})
        return {'status': 'success'}

    @http.route('/account/reception/get', type='json', auth='user')
    def account_reception_get(self, reception_id=None, **kw):
        """Fetch minimal editable data for a reception to prefill the edit modal."""
        self._ensure_user_lang_context()
        if not reception_id or not str(reception_id).isdigit():
            return {'status': 'error', 'message': _('Invalid reception ID')}

        picking = self._get_portal_reception_record(int(reception_id))
        if not picking:
            return {'status': 'error', 'message': _('Reception not found')}

        packages = picking.get_packages()
        package_type = packages.mapped('package_type_id')[:1]
        package_type = package_type and package_type[0] or request.env['stock.package.type']
        carrier_tracking_ref = (packages.mapped('global_tracking_ref')[:1] or [''])[0]
        optional_tracking_ref = (packages.mapped('optional_tracking_ref')[:1] or [''])[0]

        formatted_scheduled_date = ''
        try:
            if picking.scheduled_date:
                user_tz = pytz.timezone(request.env.user.tz or 'UTC')
                scheduled_dt = pytz.UTC.localize(datetime.strptime(picking.scheduled_date.strftime('%Y-%m-%d %H:%M:%S'), '%Y-%m-%d %H:%M:%S')) if isinstance(picking.scheduled_date, datetime) else None
                if not scheduled_dt and isinstance(picking.scheduled_date, str):
                    scheduled_dt = pytz.UTC.localize(datetime.strptime(picking.scheduled_date, '%Y-%m-%d %H:%M:%S'))
                if scheduled_dt:
                    local_dt = scheduled_dt.astimezone(user_tz)
                    formatted_scheduled_date = local_dt.strftime('%d-%m-%Y %H:%M')
        except Exception:
            formatted_scheduled_date = ''

        return {
            'status': 'success',
            'data': {
                'id': picking.id,
                'package_type_id': package_type and {'id': package_type.id, 'name': package_type.name} or None,
                'width': package_type and package_type.width or 0,
                'height': package_type and package_type.height or 0,
                'length': package_type and package_type.packaging_length or 0,
                'weight': picking.shipping_weight,
                'scheduled_date': formatted_scheduled_date,
                'tracking_number': carrier_tracking_ref,
                'tracking_number_optional': optional_tracking_ref,
                'carrier': picking.carrier_id and {
                    'id': picking.carrier_id.id,
                    'name': picking.carrier_id.name,
                } or None,
                'carrier_name': picking.carrier_id.name if picking.carrier_id else '',
                'products': picking.mapped('move_line_ids').mapped(lambda l: {
                    'product_id': l.product_id.id,
                    'product_quantity': getattr(l, 'quantity_product_uom', l.qty_done)
                })
            }
        }

    @http.route('/account/reception/update', type='json', auth='user')
    def account_reception_update(self, reception_id=None, scheduled_date=None, carrier_id=None, carrier_name=None, tracking_number=None, tracking_number_optional=None, **kw):
        """Update editable header fields of a reception."""
        self._ensure_user_lang_context()
        if not reception_id or not str(reception_id).isdigit():
            return {'status': 'error', 'message': _('Invalid reception ID')}

        picking = self._get_portal_reception_record(int(reception_id))
        if not picking:
            return {'status': 'error', 'message': _('Reception not found or access denied')}

        if picking.state in ('done', 'cancel'):
            return {'status': 'error', 'message': _('Cannot update a completed or cancelled reception')}

        vals = {}

        if scheduled_date:
            try:
                user_tz = request.env.user.tz or 'UTC'
                tz = pytz.timezone(user_tz)
                local_dt = tz.localize(datetime.strptime(scheduled_date, '%d-%m-%Y %H:%M'))
                utc_dt = local_dt.astimezone(pytz.UTC)
                vals['scheduled_date'] = utc_dt.strftime('%Y-%m-%d %H:%M:%S')
            except Exception:
                return {'status': 'error', 'message': _('Invalid scheduled date')}

        if carrier_id:
            try:
                vals['carrier_id'] = int(carrier_id)
            except Exception:
                return {'status': 'error', 'message': _('Invalid carrier')}

        if tracking_number is not None:
            vals['carrier_tracking_ref'] = tracking_number

        try:
            if vals:
                picking.sudo().write(vals)

            packages = picking.move_line_ids.mapped('result_package_id')
            if packages:
                package_vals = {}
                if carrier_name is not None:
                    package_vals['carrier_name'] = carrier_name
                if tracking_number is not None:
                    package_vals['global_tracking_ref'] = tracking_number
                if tracking_number_optional is not None:
                    package_vals['optional_tracking_ref'] = tracking_number_optional
                if package_vals:
                    packages.sudo().write(package_vals)

            return {'status': 'success', 'message': _('Reception updated successfully')}
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

