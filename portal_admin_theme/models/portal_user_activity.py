from datetime import datetime

from odoo import models, fields, api


class PortalUserActivity(models.Model):
    _name = 'portal.user.activity'
    _description = 'Portal User Activity'
    _order = 'create_date desc'

    user_id = fields.Many2one('res.users', string='User', required=True, ondelete='cascade')
    active = fields.Boolean(string='Active', default=True)
    activity = fields.Json(string='Activity')
    icon = fields.Char(string='Icon', compute='_compute_icon')
    title = fields.Char(string='Title', compute='_compute_title')
    message = fields.Char(string='Message', compute='_compute_message')
    time_ago = fields.Char(string='Time Ago', compute='_compute_time_ago')

    @api.depends('activity')
    def _compute_icon(self):
        for record in self:
            record.icon = record.activity.get('icon', 'fas fa-info')

    @api.depends('activity')
    def _compute_title(self):
        for record in self:
            record.title = record.activity.get('title')

    @api.depends('activity')
    def _compute_message(self):
        for record in self:
            record.message = record.activity.get('message')

    @api.depends('create_date')
    def _compute_time_ago(self):
        for record in self:
            if not record.create_date:
                record.time_ago = 'Recently'
                continue

            now = datetime.now()
            diff = now - record.create_date

            # Calculate the time difference
            seconds = diff.total_seconds()
            if seconds < 60:
                record.time_ago = 'Just now'
            elif seconds < 3600:
                minutes = int(seconds / 60)
                record.time_ago = f'{minutes} minute{"s" if minutes > 1 else ""} ago'
            elif seconds < 86400:
                hours = int(seconds / 3600)
                record.time_ago = f'{hours} hour{"s" if hours > 1 else ""} ago'
            elif seconds < 604800:
                days = int(seconds / 86400)
                record.time_ago = f'{days} day{"s" if days > 1 else ""} ago'
            else:
                record.time_ago = record.create_date.strftime('%b %d, %Y')
