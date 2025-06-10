##############################################################################
#
# Copyright 2025-Today DaFe Solutions
#
##############################################################################

import logging

from odoo import fields, models, _

_logger = logging.getLogger(__name__)


class ResUsersInh(models.Model):
    _inherit = 'res.users'

    client_account_id = fields.Many2one(string='Client Account', comodel_name='res.partner')

    def js_update_portal_base_data_action(self):
        connection = self.env.company.portal_customer_connection_id

        if not connection:
            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': _('Error'),
                    'type': 'danger',
                    'message': 'No connection to the portal',
                    'next': { 'type': 'ir.actions.act_window_close' }
                }
            }

        res = connection.request_post('/portal/users/data/clean/action')

        if res.get('status') != 'success':
            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': _('Error'),
                    'type': 'danger',
                    'message': res.get('message'),
                    'next': { 'type': 'ir.actions.act_window_close' }
                }
            }

        limit = 100
        offset = 0
        total = self.search_count([('share', '=', True)])

        _logger.debug('Registering %s users', f'{total:,}')

        while offset < total:
            portal_users = self.search([('share', '=', True)], limit=limit, offset=offset)
            users = []

            for user in portal_users:
                self.env.cr.execute("SELECT password FROM res_users WHERE id = %s", (user.id,))
                password = self.env.cr.fetchone()[0]
                users.append({
                    'id': user.id,
                    'name': user.name,
                    'login': user.login,
                    'partner_id': user.partner_id.id,
                    'image': user.image_1920 and user.image_1920.decode('utf-8'),
                    'password': password,
                    'lang': user.lang
                })

            res = connection.request_post('/portal/users/data/register/action', {
                'model': 'res.users',
                'data': users
            })

            if res.get('status') != 'success':
                return {
                    'type': 'ir.actions.client',
                    'tag': 'display_notification',
                    'params': {
                        'title': _('Error'),
                        'type': 'danger',
                        'message': res.get('message'),
                        'next': { 'type': 'ir.actions.act_window_close' }
                    }
                }

            offset += limit
            _logger.debug('Registered %s users', f'{min(offset, total):,}')

        ResUsers = self.sudo()
        ClientAccount = self.env['res.partner'].sudo()
        ResCountry = self.env['res.country'].sudo()
        ResCountryState = self.env['res.country.state'].sudo()
        ResCityZip = self.env['res.city.zip'].sudo()

        limit = 100
        offset = 0
        total = ClientAccount.search_count([('account','!=', False)])

        _logger.debug('Registering %s accounts', f'{total:,}')

        while offset < total:
            accounts = ClientAccount.search([('account','!=', False)], limit=limit, offset=offset)
            data = []

            for account in accounts:
                user = self.search([('partner_id', '=', account.id)], limit=1)
                data.append({
                    'id': account.id,
                    'name': account.name,
                    'user_id': user.id,
                    'ref': account.account
                })

            res = connection.request_post('/portal/users/data/register/action', {
                'model': 'client.account',
                'data': data
            })

            if res.get('status') != 'success':
                return {
                    'type': 'ir.actions.client',
                    'tag': 'display_notification',
                    'params': {
                        'title': _('Error'),
                        'type': 'danger',
                        'message': res.get('message'),
                        'next': { 'type': 'ir.actions.act_window_close' }
                    }
                }

            offset += limit

            _logger.debug('Registered %s accounts', f'{offset:,}')

        offset = 0
        all_users_count = ResUsers.search_count([])

        _logger.debug('Registering %s users', f'{all_users_count:,}')

        while offset < all_users_count:
            users = ResUsers.search([], limit=limit, offset=offset)
            data = []

            for user in users:
                data.append({
                    'id': user.id,
                    'name': user.name,
                    'login': user.login,
                    'email': user.email,
                    'partner_id': user.partner_id.id,
                    'image': user.image_1920 and user.image_1920.decode('utf-8')
                })

            res = connection.request_post('/portal/users/data/register/action', {
                'model': 'system.res.users',
                'data': data
            })

            if res.get('status') != 'success':
                return {
                    'type': 'ir.actions.client',
                    'tag': 'display_notification',
                    'params': {
                        'title': _('Error'),
                        'type': 'danger',
                        'message': res.get('message'),
                        'next': { 'type': 'ir.actions.act_window_close' }
                    }
                }

            offset += limit

            _logger.debug('Registered %s users', f'{offset:,}')

        offset = 0
        total = ResCountry.search_count([])

        _logger.debug('Registering %s countries', f'{total:,}')

        while offset < total:
            countries = ResCountry.search([], limit=limit, offset=offset)
            data = []

            for country in countries:
                data.append({
                    'id': country.id,
                    'name': country.name,
                    'ref': country.code
                })

            res = connection.request_post('/portal/users/data/register/action', {
                'model': 'res.country',
                'data': data
            })

            if res.get('status') != 'success':
                return {
                    'type': 'ir.actions.client',
                    'tag': 'display_notification',
                    'params': {
                        'title': _('Error'),
                        'type': 'danger',
                        'message': res.get('message'),
                        'next': { 'type': 'ir.actions.act_window_close' }
                    }
                }

            offset += limit

            _logger.debug('Registered %s countries', f'{offset:,}')

        offset = 0
        total = ResCountryState.search_count([])

        _logger.debug('Registering %s states', f'{total:,}')

        while offset < total:
            states = ResCountryState.search([], limit=limit, offset=offset)
            data = []

            for state in states:
                data.append({
                    'id': state.id,
                    'name': state.name,
                    'country_id': state.country_id.id,
                    'ref': f'STATE{state.id}'
                })

            res = connection.request_post('/portal/users/data/register/action', {
                'model': 'res.country.state',
                'data': data
            })

            if res.get('status') != 'success':
                return {
                    'type': 'ir.actions.client',
                    'tag': 'display_notification',
                    'params': {
                        'title': _('Error'),
                        'type': 'danger',
                        'message': res.get('message'),
                        'next': { 'type': 'ir.actions.act_window_close' }
                    }
                }

            offset += limit

            _logger.debug('Registered %s states', f'{offset:,}')

        offset = 0
        limit = 5000
        total = ResCityZip.search_count([])

        _logger.debug('Registering %s zips', f'{total:,}')

        while offset < total:
            zips = ResCityZip.search([], limit=limit, offset=offset)
            data = []

            for z in zips:
                data.append({
                    'id': z.id,
                    'name': z.name,
                    'city': (z.city_id.name or '').strip(),
                    'state': z.city_id.state_id.name,
                    'country': z.country_id.name,
                    'state_id': z.city_id.state_id.id,
                    'country_id': z.country_id.id,
                    'ref': f'ZIP{z.id}'
                })

            res = connection.request_post('/portal/users/data/register/action', {
                'model': 'res.country.zip',
                'data': data
            })

            if res.get('status') != 'success':
                return {
                    'type': 'ir.actions.client',
                    'tag': 'display_notification',
                    'params': {
                        'title': _('Error'),
                        'type': 'danger',
                        'message': res.get('message'),
                        'next': { 'type': 'ir.actions.act_window_close' }
                    }
                }

            offset += limit

            _logger.debug('Registered %s zips', f'{offset:,}')

        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': 'Success',
                'type': 'success',
                'sticky': True,
                'message': 'System data updated successfully',
                'next': { 'type': 'ir.actions.act_window_close' }
            }
        }

    def action_open_user_portal(self):
        connection = self.env.company.portal_customer_connection_id

        if not connection:
            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': _('Error'),
                    'type': 'danger',
                    'message': 'No connection to the portal',
                    'next': { 'type': 'ir.actions.act_window_close' }
                }
            }

        user = self.sudo()
        res = connection.request_post('/portal/users/request/access/action', {
            'user_id': user.id
        })

        if res.get('status') != 'success':
            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': _('Error'),
                    'type': 'danger',
                    'message': res.get('message'),
                    'next': { 'type': 'ir.actions.act_window_close' }
                }
            }

        token = res.get('data').get('token')

        if not token:
            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': _('Error'),
                    'type': 'danger',
                    'message': 'Token not found',
                    'next': { 'type': 'ir.actions.act_window_close' }
                }
            }

        return {
            'type': 'ir.actions.act_url',
            'url': '%s/portal/users/access/action/%s' % (connection.url, token),
            'target': 'new'
        }

    def action_sync_user_portal_data(self):
        connection = self.env.company.portal_customer_connection_id

        if not connection:
            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': _('Error'),
                    'type': 'danger',
                    'message': 'No connection to the portal',
                    'next': { 'type': 'ir.actions.act_window_close' }
                }
            }

        user = self.sudo()
        res = connection.request_post('/portal/users/sync/data/action', {
            'user_id': user.id
        })

        if res.get('status') != 'success':
            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': _('Error'),
                    'type': 'danger',
                    'message': res.get('message'),
                    'next': { 'type': 'ir.actions.act_window_close' }
                }
            }

        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': 'Success',
                'type': 'success',
                'message': 'System data updated successfully',
                'next': { 'type': 'ir.actions.act_window_close' }
            }
        }
