from odoo import api, fields, models


class SaleOrderLine(models.Model):
    _inherit = "sale.order.line"

    perso_zone_ids = fields.One2many(
        "perso.zone", "sale_order_line_id", string="Zones de personnalisation"
    )
    perso_zone_count = fields.Integer(
        compute="_compute_perso_total", store=True
    )
    perso_zones_total_ht = fields.Monetary(
        string="Total marquage HT", compute="_compute_perso_total",
        store=True, currency_field="currency_id",
        help="Somme HT des zones de perso de la ligne. Integre au sous-total "
             "HT de la ligne (CA), pas un frais annexe.",
    )

    @api.depends("perso_zone_ids.prix_unitaire_ht")
    def _compute_perso_total(self):
        for line in self:
            line.perso_zones_total_ht = sum(
                line.perso_zone_ids.mapped("prix_unitaire_ht")
            )
            line.perso_zone_count = len(line.perso_zone_ids)

    # Le prix des zones (HT) doit remonter DANS le total de la ligne.
    # On etend le calcul standard : base additionnelle = somme des zones * qty,
    # taxee exactement comme la ligne (donc 0 % en intracom FR, 21 % en ES).
    @api.depends(
        "product_uom_qty", "discount", "price_unit", "tax_id",
        "perso_zones_total_ht",
    )
    def _compute_amount(self):
        super()._compute_amount()
        for line in self:
            perso = line.perso_zones_total_ht
            if not perso:
                continue
            taxes = line.tax_id.compute_all(
                perso,
                line.order_id.currency_id or line.currency_id,
                line.product_uom_qty,
                product=line.product_id,
                partner=line.order_id.partner_shipping_id,
            )
            line.price_subtotal += taxes["total_excluded"]
            line.price_total += taxes["total_included"]
            line.price_tax += taxes["total_included"] - taxes["total_excluded"]


class SaleOrder(models.Model):
    _inherit = "sale.order"

    perso_zone_ids = fields.One2many(
        "perso.zone", "order_id", string="Toutes les zones de perso"
    )
    perso_zone_count = fields.Integer(compute="_compute_perso_zone_count")
    # Repris du champ Studio x_bat_status (migre par le hook).
    perso_bat_status = fields.Selection(
        [
            ("a_preparer", "A preparer"),
            ("envoye", "BAT envoye"),
            ("valide", "BAT valide"),
        ],
        string="Statut BAT", default="a_preparer",
    )

    def _compute_perso_zone_count(self):
        for order in self:
            order.perso_zone_count = len(order.perso_zone_ids)

    def action_print_bat(self):
        self.ensure_one()
        return self.env.ref("perso_multi_zones.action_report_bat").report_action(self)
