
import json

from odoo import http
from odoo.http import request
from odoo.addons.portal.controllers.portal import CustomerPortal


class PortalAdminController(CustomerPortal):

    # Theme colors - can be overridden in child classes
    BASE_COLOR = '#A8A800'
    HOVER_COLOR = '#8A8A00'
    LIGHT_BG_COLOR = '#f0f0e0'
    # Dark mode colors
    DARK_BASE_COLOR = '#FF1414'
    DARK_HOVER_COLOR = '#FF1414'
    DARK_LIGHT_BG_COLOR = '#3a3a1a'

    @http.route('/account/history/translate', type='json', auth='user')
    def translate_history_titles(self, paths=None, **kw):
        """Translate history titles based on current user's language.
        
        Receives a list of paths and returns a mapping of path -> translated title.
        """
        self._ensure_user_lang_context()
        
        if not paths:
            return {}
        
        # Get all menus with their translated names
        menus = self._get_admin_layout_menus()
        
        # Build a mapping of url -> translated name
        url_to_title = {}
        for menu in menus:
            url = menu.get('url', '')
            name = menu.get('name', '')
            if url and name:
                url_to_title[url] = name
        
        # Return translated titles for the requested paths
        result = {}
        for path in paths:
            if path in url_to_title:
                result[path] = url_to_title[path]
        
        return result

    def _ensure_user_lang_context(self):
        """Ensure the request rendering context uses the current user's lang.

        This aligns QWeb/template translations and any _() calls with
        the user's language preference instead of the website default.
        Always sets the user's language in the context.
        """
        try:
            # Obtener el idioma del usuario (por defecto español si no está configurado)
            user_lang = request.env.user.sudo().lang or 'en_US'
            # Siempre actualizar el contexto con el idioma del usuario
            request.update_context(lang=user_lang)
        except Exception:
            # Do not block request rendering on context update issues
            pass

    def _sudo_with_lang(self, model_name):
        """Returns a model recordset with sudo and user's language context.
        
        Use this instead of request.env[model].sudo() when you need
        translatable fields (Selection, related names) to respect user's language.
        
        Example:
            QualityAlert = self._sudo_with_lang('quality.alert')
            alerts = QualityAlert.search(domain)
        """
        user_lang = request.env.user.lang or 'en_US'
        return request.env[model_name].with_context(lang=user_lang).sudo()

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
            'json': json,
            # Theme colors
            'base_color': self.BASE_COLOR,
            'hover_color': self.HOVER_COLOR,
            'light_bg_color': self.LIGHT_BG_COLOR,
            # Dark mode colors
            'dark_base_color': self.DARK_BASE_COLOR,
            'dark_hover_color': self.DARK_HOVER_COLOR,
            'dark_light_bg_color': self.DARK_LIGHT_BG_COLOR,
        }
