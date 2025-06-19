
import json
from functools import lru_cache

from odoo import http, _
from odoo.addons.portal_admin_theme.controllers.admin import PortalAdminController
from odoo.http import request
from odoo.osv import expression
from datetime import datetime
##############################################################################

class PortalExpeditionController(PortalAdminController):
    
    @http.route('/portal_expedition/expedition/details/chatter/fetch', type='json', auth='public', website=True)
    def portal_expedition_details_chatter_fetch(self, expedition_id=None, limit=10, after=None, before=None, **kw):
        """Add compatible route matching the JS client call pattern"""
        if not expedition_id:
            return {
                'data': {'mail.message': []},
                'status': 'success'
            }

        # SaleOrder = request.env['sale.order'].sudo()
        domain = [
            ('res_id', '=', int(expedition_id)),
            ('model', '=', 'sale.order'),
            ('message_type', '=', 'comment'),
            ('subtype_id', '=', request.env.ref('mail.mt_comment').id),
            '|', ('body', '!=', ''), ('attachment_ids', '!=', False)
        ]

        # Fetch the messages
        Message = request.env['mail.message']
        # Non-employee see only messages with not internal subtype
        if not request.env.user._is_internal():
            domain = expression.AND([Message._get_search_domain_share(), domain])

        messages = Message.sudo().search(domain, limit=limit, order='date DESC, id DESC')
        formatted_messages = messages.portal_message_format() if messages else []
        print(f"Fetched {len(formatted_messages)} messages for expedition ID: {expedition_id}")
        return {
            'data': {
                'mail.message': formatted_messages
            },
            'status': 'success'
        }
    @http.route('/portal_expedition/expedition/details/chatter/post', type='http', auth="user", methods=['POST'])
    def portal_expedition_details_chatter_post(self, expedition_id, access_token=None, **post):
        """Add compatible route for posting messages from JS client"""
        if not str(expedition_id).isdigit():
            return json.dumps({'status': 'error', 'message': 'Invalid expedition ID'})
        SaleOrder = request.env['sale.order'].sudo()
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

        # Get the expedition
        expedition = SaleOrder.search([
            ('id', '=', int(expedition_id)),
            ('partner_id', 'in', partner_ids)
        ], limit=1)

        if not expedition:
            return json.dumps({'status': 'error', 'message': 'Access denied'})

        # Process attachment if provided
        attachment_id = False
        attachment_data = post.get('attachment')
        if attachment_data and hasattr(attachment_data, 'filename'):
            ufile = attachment_data
            if ufile:
                # Create attachment
                vals = {
                    "name": ufile.filename,
                    "raw": ufile.read(),
                    "res_id": int(expedition_id),
                    "res_model": 'sale.order',
                }

                if request.env.user.share:
                    # Generate access token for shared users
                    vals["access_token"] = request.env["ir.attachment"]._generate_access_token()

                try:
                    attachment = request.env["ir.attachment"].sudo().create(vals)
                    attachment_id = attachment.id
                except AccessError:
                    return json.dumps({"status": "error", "message": _("You are not allowed to upload an attachment here.")})

        # Post message
        message_content = post.get('message', '')
        attachment_ids = [attachment_id] if attachment_id else []

        try:
            message = expedition.sudo().with_user(request.env.user).message_post(
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
