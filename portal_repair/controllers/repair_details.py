##############################################################################
#
# Copyright 2025 DaFe Solutions
#
##############################################################################

import math
import json
import pytz
from datetime import datetime
from functools import lru_cache

from odoo import fields, http, _
from odoo.addons.portal_admin_theme.controllers.admin import PortalAdminController
from odoo.http import request
from odoo.osv import expression


class PortalRepairController(PortalAdminController):
    @http.route('/account/repair/details/<int:alert_id>', type='http', auth="user", website=True)
    def account_repair_details_action(self, alert_id, access_token=None, **post):
        QualityAlert = request.env['quality.alert'].sudo()

        # Dominio base según el account.partner del usuario actual
        base_domain = self._get_account_partner_domain()

        # Añadir condición del alert_id
        base_domain = expression.AND([base_domain, [('id', '=', alert_id)]])

        # Buscar la alerta
        alert = QualityAlert.search(base_domain, limit=1)

        if not alert:
            return request.redirect('/account/repair')
            
        values = self._get_admin_layout_values()
        values.update({
            'page_name': 'reception_details',
            'alert': alert,
            'page_title': _('Reception Details'),
            'page_url': '/account/repair/details/%s' % alert_id,
        })

        return request.render("portal_repair.portal_repair_details_page", values)

    def _setup_portal_message_fetch_extra_domain(self, data):
        return []

    @http.route('/portal_repair/repair/details/chatter/fetch', type='json', auth='public', website=True)
    def portal_repair_details_chatter_fetch(self, alert_id=None, limit=10, after=None, before=None, **kw):
        """Add compatible route matching the JS client call pattern"""
        if not alert_id:
            return {
                'data': {'mail.message': []},
                'status': 'success'
            }

        # Only search into website_message_ids, so apply the same domain to perform only one search
        # extract domain from the 'website_message_ids' field
        model = request.env['quality.alert']
        field = model._fields['website_message_ids']
        domain = [
            ('res_id', '=', int(alert_id)),
            ('model', '=', 'quality.alert'),
            ('subtype_id', '=', request.env.ref('mail.mt_comment').id),
            '|',
            ('body', '!=', ''),
            ('attachment_ids', '!=', False)
        ]

        # Check access
        Message = request.env['mail.message']
        QualityAlert = request.env['quality.alert'].sudo()
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

        # Verify user has access to this repair
        alert = QualityAlert.search([
            ('id', '=', int(alert_id)),
            ('partner_id', 'in', partner_ids)
        ], limit=1)

        if not alert:
            return {
                'data': {'mail.message': []},
                'status': 'error',
                'message': 'Access denied'
            }

        # Non-employee see only messages with not internal subtype
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

    @http.route('/portal_repair/repair/details/chatter/post', type='http', auth="user", methods=['POST'])
    def portal_repair_details_chatter_post(self, alert_id, access_token=None, **post):
        """Add compatible route for posting messages from JS client"""
        if not str(alert_id).isdigit():
            return json.dumps({'status': 'error', 'message': 'Invalid repair ID'})

        QualityAlert = request.env['quality.alert'].sudo()
        partner_id = request.env.user.partner_id
        partner_ids = list(set([partner_id.id] + partner_id.commercial_partner_id.ids))

        # Get the repair
        alert = QualityAlert.search([
            ('id', '=', int(alert_id)),
            ('partner_id', 'in', partner_ids)
        ], limit=1)

        if not alert:
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
                    "res_id": int(alert_id),
                    "res_model": 'quality.alert',
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
            message = alert.sudo().with_user(request.env.user).message_post(
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