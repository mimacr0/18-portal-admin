from odoo import models, fields, api

class PortalUserActivity(models.Model):
    _name = 'portal.user.activity'
    _description = 'Portal User Activity'

    user_id = fields.Many2one('res.users', string='User', required=True, ondelete='cascade')
    active = fields.Boolean(string='Active', default=True)
    activity = fields.Json(string='Activity')
