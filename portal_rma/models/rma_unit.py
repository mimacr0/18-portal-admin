from odoo import models, fields

class RmaUnit(models.Model):
    _inherit = 'rma.unit'

    account_product_map_id = fields.Many2one('account.product.map', string='Account Product Map')
    account_sku = fields.Char(related='account_product_map_id.account_sku', string='Account SKU')
    account_ean13 = fields.Char(related='account_product_map_id.account_ean13', string='EAN13')
    account_fnsku = fields.Char(related='account_product_map_id.account_fnsku', string='FNSKU')
    account_asin = fields.Char(related='account_product_map_id.account_asin', string='ASIN')
