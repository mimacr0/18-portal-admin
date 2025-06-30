from odoo import models, fields, api
from datetime import datetime
import json

class PortalUserNotification(models.Model):
    _name = 'portal.user.notification'
    _description = 'Portal User Notification'
    _order = 'create_date desc'

    user_id = fields.Many2one('res.users', string='User', required=True, ondelete='cascade')
    active = fields.Boolean(string='Active', default=True)
    notification = fields.Json(string='Notification')
    create_date = fields.Datetime('Created on', readonly=True)

    def icon(self):
        """Return the icon name for the notification"""
        self.ensure_one()
        if not self.notification:
            return 'bell'

        try:
            data = json.loads(self.notification) if isinstance(self.notification, str) else self.notification
            return data.get('icon', 'bell')
        except:
            return 'bell'

    def title(self):
        """Return the title of the notification"""
        self.ensure_one()
        if not self.notification:
            return 'Notification'

        try:
            data = json.loads(self.notification) if isinstance(self.notification, str) else self.notification
            return data.get('title', 'Notification')
        except:
            return 'Notification'

    def message(self):
        """Return the message of the notification"""
        self.ensure_one()
        if not self.notification:
            return ''

        try:
            data = json.loads(self.notification) if isinstance(self.notification, str) else self.notification
            return data.get('message', '')
        except:
            return ''

    def time_ago(self):
        """Return a human-readable time since the notification was created"""
        self.ensure_one()
        if not self.create_date:
            return 'Recently'

        now = datetime.now()
        diff = now - self.create_date

        # Calculate the time difference
        seconds = diff.total_seconds()
        if seconds < 60:
            return 'Just now'
        elif seconds < 3600:
            minutes = int(seconds / 60)
            return f'{minutes} minute{"s" if minutes > 1 else ""} ago'
        elif seconds < 86400:
            hours = int(seconds / 3600)
            return f'{hours} hour{"s" if hours > 1 else ""} ago'
        elif seconds < 604800:
            days = int(seconds / 86400)
            return f'{days} day{"s" if days > 1 else ""} ago'
        else:
            return self.create_date.strftime('%b %d, %Y')

    @api.model
    def create_notification(self, user_id, title, message, icon='bell'):
        """Create a new notification for a user

        Args:
            user_id (int): User ID to create notification for
            title (str): Title of the notification
            message (str): Message content of the notification
            icon (str, optional): FontAwesome icon name without the fa- prefix. Defaults to 'bell'.

        Returns:
            record: The created notification record
        """
        notification_data = {
            'title': title,
            'message': message,
            'icon': icon,
            'created_at': fields.Datetime.now()
        }

        return self.create({
            'user_id': user_id,
            'notification': notification_data,
        })

    @api.model
    def clear_all_notifications(self, user_id):
        """Clear all notifications for a specific user

        Args:
            user_id (int): User ID to clear notifications for

        Returns:
            bool: True if notifications were cleared
        """
        notifications = self.search([('user_id', '=', user_id)])
        return notifications.unlink()

    def remove_notification(self):
        """Remove this notification

        Returns:
            bool: True if notification was removed
        """
        self.ensure_one()
        return self.unlink()
