##############################################################################
#
# Copyright 2025 DaFe Solutions
#
##############################################################################

import json
from functools import lru_cache

from odoo import http, _
from odoo.addons.portal_admin_theme.controllers.admin import PortalAdminController
from odoo.http import request
from odoo.osv import expression
from datetime import datetime
##############################################################################

class PortalExpeditionController(PortalAdminController):
 
    @http.route('/account/expedition/carrier-search', type='json', auth='user')
    def account_expedition_carrier_search(self, term='', **kw):
        """Search carriers based on term for select2"""
        DeliveryCarrier = request.env['delivery.carrier'].sudo()
        domain = []

        if term:
            domain = expression.OR([
                [('name', 'ilike', term)],
                [('delivery_type', 'ilike', term)]
            ])

        carriers = DeliveryCarrier.search(domain, limit=10)

        # Prepare carrier data
        result_items = []
        for carrier in carriers:
            result_items.append({
                'id': carrier.id,
                'text': carrier.name,
                'delivery_type': carrier.delivery_type
            })
        print(f"Carriers found: {len(result_items)}")
        return {
            'items': result_items
        }

    # @http.route('/account/expedition/address-search', type='json', auth='user')
    # def account_expedition_address_search(self, term='', **kw):
    #     """Search carriers based on term for select2"""
    #     ResCityZip = request.env['res.city.zip'].sudo()
    #     ResCountry = request.env['res.country'].sudo()
    #     ResCountryState = request.env['res.country.state'].sudo()
    #     domain = []

    #     if term:
    #         domain = expression.OR([
    #             [('name', 'ilike', term)],
    #         ])

    #     cities_zip = ResCityZip.search(domain, limit=10)

    #     # Prepare carrier data
    #     result_items = []
    #     for city_zip in cities_zip:
    #         result_items.append({
    #             'id': city_zip.id,
    #             'text': city_zip.name,
    #         })
    #     print(f"Cities Zip found: {len(result_items)}")
    #     return {
    #         'items': result_items
    #     }

    @http.route('/account/expedition/address-search', type='json', auth='user')
    def address_search(self, term='', **kwargs):
        ResZip = request.env['res.city.zip'].sudo()
        ResCity = request.env['res.city'].sudo()
        ResState = request.env['res.country.state'].sudo()
        ResCountry = request.env['res.country'].sudo()

        term = term.strip()
        fragments = [f.strip() for f in term.split(',') if f.strip()]
        results = []

        def format_result(zip_rec=None, city=None, state=None, country=None):
            zip_val = zip_rec.name if zip_rec else ''
            city_val = city.name if city else (zip_rec.city_id.name if zip_rec and zip_rec.city_id else '')
            state_val = state.name if state else (
                zip_rec.city_id.state_id.name if zip_rec and zip_rec.city_id and zip_rec.city_id.state_id else
                city.state_id.name if city and city.state_id else ''
            )
            country_val = country.name if country else (
                zip_rec.city_id.country_id.name if zip_rec and zip_rec.city_id and zip_rec.city_id.country_id else
                city.country_id.name if city and city.country_id else
                state.country_id.name if state and state.country_id else ''
            )

            full_text = ', '.join(filter(None, [zip_val, city_val, state_val, country_val]))

            return {
                'id': f"{zip_rec.id if zip_rec else city.id if city else state.id if state else country.id}",
                'text': full_text,
                'zip': zip_val,
                'city_name': city_val,
                'state_name': state_val,
                'country_name': country_val
            }

        for fragment in fragments:
            # Buscar ZIPs
            zip_matches = ResZip.search([('name', 'ilike', fragment)], limit=10)
            for zip_rec in zip_matches:
                results.append(format_result(zip_rec=zip_rec))

            if results:
                break

            # Buscar Ciudades
            city_matches = ResCity.search([('name', 'ilike', fragment)], limit=10)
            for city in city_matches:
                results.append(format_result(city=city, state=city.state_id, country=city.country_id))

            if results:
                break

            # Buscar Estados
            state_matches = ResState.search([('name', 'ilike', fragment)], limit=10)
            for state in state_matches:
                results.append(format_result(state=state, country=state.country_id))

            if results:
                break

            # Buscar Países
            country_matches = ResCountry.search([('name', 'ilike', fragment)], limit=10)
            for country in country_matches:
                results.append(format_result(country=country))

            if results:
                break

        return {'items': results}