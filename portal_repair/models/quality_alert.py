##############################################################################
#
# Copyright 2025 DaFe Solutions
#
##############################################################################

from odoo import models, fields, api, _


class BaseModel(models.Model):
    _name = 'quality.alert'
    _inherit = ['quality.alert', 'portal.mixin']
    
    def get_details_url(self):
        portal_url = self.get_portal_url()
        return portal_url.replace('#', f'/account/repair/details/{self.id}')

    @api.returns('mail.message', lambda value: value.id)
    def message_post(self, **kwargs):
        res = super().message_post(**kwargs)
        if self.env.context.get('skip_portal_follower_notify'):
            return res
        follower_partners = self.message_follower_ids.mapped('partner_id')
        users = follower_partners.mapped('user_ids') | follower_partners.mapped('portal_user_ids').mapped('user_ids')
        author_partner_id = self.env.context.get('portal_author_partner_id')
        if author_partner_id:
            users = users.filtered(lambda u: u.partner_id.id != author_partner_id)
        users = users.filtered(lambda u: u.active)
        for user in users:
            user._bus_send("portal_repair.portal_repair_details_reload_request", {'action': 'reload'})
            user.send_portal_user_notification(
                _("New message in repair: %(alert)s", alert=self.title),
                _("New message in repair: %(alert)s", alert=self.title),
                "fas fa-bell",
                "info",
            )
        return res

    def notify_portal_followers(self, author_partner_id=None):
        if 'portal.user.notification' not in self.env:
            return
        follower_partners = self.message_follower_ids.mapped('partner_id')
        users = follower_partners.mapped('user_ids') | follower_partners.mapped('portal_user_ids').mapped('user_ids')
        if author_partner_id:
            users = users.filtered(lambda u: u.partner_id.id != author_partner_id)
        users = users.filtered(lambda u: u.active)
        for user in users:
            user._bus_send("portal_repair.portal_repair_details_reload_request", {'action': 'reload'})
            user.send_portal_user_notification(
                _("New message in repair: %(alert)s", alert=self.title),
                _("New message in repair: %(alert)s", alert=self.title),
                "fas fa-bell",
                "info",
            )
