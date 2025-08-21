
import json

from odoo.http import request
from odoo.addons.portal.controllers.portal import CustomerPortal


class PortalAdminController(CustomerPortal):

    def _ensure_user_lang_context(self):
        """Ensure the request rendering context uses the current user's lang.

        This aligns QWeb/template translations and any _() calls with
        the user's language preference instead of the website default.
        """
        try:
            user_lang = request.env.user.sudo().lang or 'en_US'
            if request.env.context.get('lang') != user_lang:
                request.update_context(lang=user_lang)
        except Exception:
            # Do not block request rendering on context update issues
            pass

    def _get_admin_layout_menus(self):
        return []

    def _get_admin_layout_values(self):
        # Make sure translations render with the user's language
        self._ensure_user_lang_context()

        user = request.env.user.sudo()
        company = user.company_id
        menus = self._get_admin_layout_menus()
        menus.sort(key=lambda x: x.get('order', 0))
        return {
            'lang': user.lang,
            'menus': menus,
            'batch_actions': [],
            'list_actions': [],
            'tools_actions': [],
            'list_filters': [],
            'list_columns': [],
            'user': user,
            'company': company,
            'json': json
        }
