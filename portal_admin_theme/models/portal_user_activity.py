from datetime import datetime

from odoo import models, fields, api, _


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
            title = record.activity.get('title', '')
            # Translate the title using _() - it will use the current user's language
            record.title = _(title) if title else ''

    @api.depends('activity')
    def _compute_message(self):
        for record in self:
            message = record.activity.get('message', '')
            message_args = record.activity.get('message_args', [])
            
            if not message:
                record.message = ''
                continue
            
            # Translate the message using _() - it will use the current user's language
            translated_message = _(message)
            
            # Apply arguments if provided (e.g. "Reception '%s' created" % name)
            if message_args:
                try:
                    record.message = translated_message % tuple(message_args)
                except (TypeError, ValueError):
                    record.message = translated_message
            else:
                record.message = translated_message

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
                record.time_ago = _('Just now')
            elif seconds < 3600:
                minutes = int(seconds / 60)
                if minutes == 1:
                    record.time_ago = _('1 minute ago')
                else:
                    record.time_ago = _('%d minutes ago') % minutes
            elif seconds < 86400:
                hours = int(seconds / 3600)
                if hours == 1:
                    record.time_ago = _('1 hour ago')
                else:
                    record.time_ago = _('%d hours ago') % hours
            elif seconds < 604800:
                days = int(seconds / 86400)
                if days == 1:
                    record.time_ago = _('1 day ago')
                else:
                    record.time_ago = _('%d days ago') % days
            else:
                record.time_ago = record.create_date.strftime('%b %d, %Y')
