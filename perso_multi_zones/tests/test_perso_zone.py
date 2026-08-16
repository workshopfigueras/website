import base64

from odoo.tests import TransactionCase, tagged

PNG = ("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASs"
       "JTYQAAAAASUVORK5CYII=")


@tagged("post_install", "-at_install")
class TestPersoZone(TransactionCase):

    def setUp(self):
        super().setUp()
        self.partner = self.env["res.partner"].create({"name": "Test perso"})
        self.product = self.env["product.product"].create({
            "name": "T-shirt test", "list_price": 10.0, "sale_ok": True,
        })
        self.order = self.env["sale.order"].create({"partner_id": self.partner.id})
        self.line = self.env["sale.order.line"].create({
            "order_id": self.order.id, "product_id": self.product.id,
            "product_uom_qty": 10,
        })

    def _att(self, name):
        return self.env["ir.attachment"].create({
            "name": name, "datas": PNG, "res_model": "sale.order",
            "res_id": self.order.id, "type": "binary",
        })

    def test_price_includes_zones(self):
        """Le total HT de la ligne = article + somme des zones."""
        for zc, price, att, txt in [
            ("coeur_g", 1.25, self._att("c.png"), False),
            ("dos_complet", 2.50, self._att("d.png"), False),
            ("manche_g", 3.50, False, "CLUB X"),
        ]:
            self.env["perso.zone"].create({
                "sale_order_line_id": self.line.id, "zone": zc,
                "type_contenu": "texte" if txt else "logo",
                "technique": "dtf", "attachment_id": att and att.id,
                "texte": txt, "prix_unitaire_ht": price,
            })
        self.line.invalidate_recordset()
        expected = (10.0 + 1.25 + 2.50 + 3.50) * 10
        self.assertAlmostEqual(self.line.price_subtotal, expected, 2)
        self.assertEqual(self.line.perso_zone_count, 3)

    def test_same_visual_single_file(self):
        """Meme visuel sur 3 zones => 1 seul ir.attachment."""
        shared = self._att("logo_unique.png")
        for zc in ("coeur_g", "dos_complet", "manche_g"):
            self.env["perso.zone"].create({
                "sale_order_line_id": self.line.id, "zone": zc,
                "type_contenu": "logo", "technique": "dtf",
                "attachment_id": shared.id, "prix_unitaire_ht": 1.25,
            })
        atts = self.line.perso_zone_ids.mapped("attachment_id")
        self.assertEqual(len(self.line.perso_zone_ids), 3)
        self.assertEqual(len(atts), 1)

    def test_migration_idempotent(self):
        """Rejouer la migration ne cree aucun doublon."""
        r1 = self.env["perso.zone"]._migrate_studio_zones()
        before = self.env["perso.zone"].search_count([])
        r2 = self.env["perso.zone"]._migrate_studio_zones()
        after = self.env["perso.zone"].search_count([])
        self.assertEqual(before, after, "Le 2e passage a cree des doublons")
        self.assertEqual(
            r2.get("from_zone_file", 0) + r2.get("from_global_logo", 0), 0
        )
