from werkzeug.exceptions import Forbidden
import json

from odoo import http, _
from odoo.http import request
from odoo.osv import expression
from odoo.addons.mail.tools.discuss import Store
from odoo.addons.portal_admin_theme.controllers.admin import PortalAdminController
from odoo.exceptions import AccessError, MissingError


class PortalInvoicesController(PortalAdminController):

    def _get_admin_layout_menus(self):
        menus = super()._get_admin_layout_menus()
        menus.extend([
            {
                'name': _('Invoices'),
                'url': '/account/account/invoices',
                'icon': 'fas fa-file-invoice'
            }
        ])
        return menus

    @http.route('/account/account/invoices', type='http', auth="user", website=True)
    def account_account_invoices_action(self, **post):
        user = request.env.user
        partner = user.partner_id
        partner_ids = partner.ids + partner.child_ids.ids
        invoices = request.env['account.move'].sudo().search([('partner_id', 'in', partner_ids)])
        values = self._get_admin_layout_values()

        list_filters = [
            {
                'id': 'status',
                'placeholder': _('All Status'),
                'values': [
                    ('draft', _('Draft')),
                    ('posted', _('Posted')),
                    ('paid', _('Paid')),
                    ('cancel', _('Cancelled'))
                ]
            }
        ]

        list_columns = [
            {
                'id': 'name',
                'label': _('Name'),
                'sortable': True
            },
            {
                'id': 'date',
                'label': _('Date'),
                'sortable': True
            },
            {
                'id': 'date_due',
                'label': _('Due Date'),
                'sortable': True
            },
            {
                'id': 'amount',
                'label': _('Amount'),
                'sortable': True
            },
            {
                'id': 'status',
                'label': _('Status'),
                'sortable': True
            },
            {
                'id': 'actions',
                'label': _('Actions'),
                'sortable': False,
                'right': True
            }
        ]

        values.update({
            'page_name': 'invoices',
            'invoices': invoices,
            'page_title': _('Invoices'),
            'page_url': '/account/account/invoices',
            'list_filters': list_filters,
            'list_columns': list_columns
        })

        return request.render("portal_customer.portal_invoices_page", values)

    @http.route('/account/account/invoice/details/<int:invoice_id>', type='http', auth="user")
    def account_account_invoice_details_action(self, invoice_id, access_token=None, **post):
        try:
            invoice_sudo = self._document_check_access('account.move', invoice_id, access_token)
        except (AccessError, MissingError):
            return request.redirect('/account/account/invoices')

        values = self._get_admin_layout_values()
        values.update({
            'page_name': 'invoice_details',
            'page_title': _('Invoice Details'),
            'page_url': '/account/account/invoices',
            'invoice': invoice_sudo
        })

        return request.render("portal_customer.portal_invoice_details_page", values)

    @http.route('/portal_customer/invoice/details/chatter/post', type='http', auth="user", methods=['POST'])
    def account_account_invoice_details_chatter_post(self, invoice_id, access_token=None, **post):
        if not str(invoice_id).isdigit():
            return json.dumps({ 'status': 'error', 'message': 'Invalid invoice ID' })

        try:
            invoice_sudo = self._document_check_access('account.move', int(invoice_id), access_token)
        except (AccessError, MissingError):
            return json.dumps({ 'status': 'error', 'message': 'Access denied' })

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
                    "res_id": int(invoice_id),
                    "res_model": 'account.move',
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
            message = invoice_sudo.sudo().with_user(request.env.user).message_post(
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

    def _setup_portal_message_fetch_extra_domain(self, data):
        return []

    @http.route('/portal_customer/invoice/details/chatter/fetch', type='json', auth='public', website=True)
    def portal_invoice_details_chatter_fetch(self, invoice_id, limit=10, after=None, before=None, **kw):
        # Only search into website_message_ids, so apply the same domain to perform only one search
        # extract domain from the 'website_message_ids' field
        model = request.env['account.move']
        field = model._fields['website_message_ids']
        domain = expression.AND([
            self._setup_portal_message_fetch_extra_domain(kw),
            field.get_domain_list(model),
            [('res_id', '=', invoice_id), '|', ('body', '!=', ''), ('attachment_ids', '!=', False),
             ("subtype_id", "=", request.env.ref("mail.mt_comment").id)]
        ])

        # Check access
        Message = request.env['mail.message']
        if kw.get('token'):
            access_as_sudo = request.env['account.move']._get_thread_with_access(
                invoice_id, token=kw.get("token")
            )
            if not access_as_sudo:  # if token is not correct, raise Forbidden
                raise Forbidden()
            # Non-employee see only messages with not internal subtype (aka, no internal logs)
            if not request.env.user._is_internal():
                domain = expression.AND([Message._get_search_domain_share(), domain])
            Message = request.env["mail.message"].sudo()
        res = Message._message_fetch(domain, None, before, after, None, limit)
        messages = res.pop("messages")
        messages = messages.sorted('id', reverse=False)
        return {
            **res,
            "data": {"mail.message": messages.portal_message_format(options=kw)},
            "messages": Store.many_ids(messages),
        }

    @http.route('/portal_customer/invoice/details/chatter/test', type='json', auth='public', website=True)
    def portal_invoice_details_chatter_test(self, **kw):
        user = self.env.user
        user._bus_send( "portal_customer.send_chat_request", { "invoice_id": 12345 } )
        return { 'status': 'success' }
