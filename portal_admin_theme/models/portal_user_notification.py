
from odoo import models, fields, api

class PortalUserNotification(models.Model):
    _name = 'portal.user.notification'
    _description = 'Portal User Notification'

    user_id = fields.Many2one('res.users', string='User', required=True, ondelete='cascade')
    active = fields.Boolean(string='Active', default=True)
    notification = fields.Json(string='Notification')


