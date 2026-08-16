import base64
import hashlib
import logging

from odoo import api, fields, models

_logger = logging.getLogger(__name__)

TECHNIQUES = [
    ("broderie", "Broderie"),
    ("dtf", "DTF"),
]

CONTENT_TYPES = [
    ("logo", "Logo / Fichier"),
    ("texte", "Texte"),
]


class PersoZone(models.Model):
    _name = "perso.zone"
    _description = "Zone de personnalisation (1 visuel par zone)"
    _order = "sale_order_line_id, sequence, id"

    sequence = fields.Integer(default=10)

    sale_order_line_id = fields.Many2one(
        "sale.order.line",
        string="Ligne de commande",
        required=True,
        ondelete="cascade",
        index=True,
    )
    order_id = fields.Many2one(
        related="sale_order_line_id.order_id", store=True, index=True
    )
    company_id = fields.Many2one(
        related="sale_order_line_id.company_id", store=True
    )
    currency_id = fields.Many2one(
        related="sale_order_line_id.currency_id", store=True
    )

    # --- Zone (catalogue data-driven, cf. data/perso_config_data.xml) ---
    zone = fields.Char(
        string="Code zone", required=True,
        help="Ex: coeur_g, poitrine, dos_complet, manche_g, manche_d, casquette...",
    )
    zone_label = fields.Char(string="Zone (libelle)")

    # --- Contenu : logo (fichier) OU texte ---
    type_contenu = fields.Selection(
        CONTENT_TYPES, string="Type de contenu", required=True, default="logo"
    )
    # Fichier partage : plusieurs zones peuvent pointer le MEME ir.attachment
    # (cas "meme visuel partout") => aucune duplication du binaire en base.
    attachment_id = fields.Many2one(
        "ir.attachment", string="Fichier client", ondelete="restrict"
    )
    file_name = fields.Char(related="attachment_id.name", string="Nom du fichier")
    texte = fields.Char(string="Texte a marquer")

    technique = fields.Selection(
        TECHNIQUES, string="Technique", required=True, default="dtf"
    )

    # --- Dimensions & couleurs ---
    largeur_mm = fields.Integer(string="Largeur (mm)")
    hauteur_mm = fields.Integer(string="Hauteur (mm)")
    nb_couleurs = fields.Integer(
        string="Nb couleurs (broderie)",
        help="Nombre de couleurs de fil. Pertinent seulement en broderie.",
    )

    # --- Prix : c'est du CA (HT), remonte dans le total de la ligne ---
    prix_unitaire_ht = fields.Monetary(
        string="Prix unitaire HT (zone)", currency_field="currency_id",
        help="Prix HT du marquage de CETTE zone, par article. "
             "Additionne au prix HT de la ligne (ce n'est PAS un frais annexe).",
    )

    commentaire_atelier = fields.Text(string="Commentaire atelier")

    # Tracabilite de migration (idempotence)
    studio_source_ref = fields.Char(
        string="Source Studio (migration)", index=True,
        help="Reference de l'enregistrement Studio migre (x_zone_file id ou "
             "token commande). Sert a rendre la migration idempotente.",
    )

    _sql_constraints = [
        (
            "studio_source_uniq",
            "unique(studio_source_ref)",
            "Cette source Studio a deja ete migree (migration idempotente).",
        ),
    ]

    @api.onchange("type_contenu")
    def _onchange_type_contenu(self):
        if self.type_contenu == "texte":
            self.attachment_id = False
        elif self.type_contenu == "logo":
            self.texte = False

    def name_get(self):
        res = []
        for z in self:
            label = z.zone_label or z.zone or "?"
            content = z.file_name if z.type_contenu == "logo" else (z.texte or "texte")
            res.append((z.id, "%s · %s · %s" % (label, dict(TECHNIQUES).get(z.technique, ""), content)))
        return res

    # ------------------------------------------------------------------
    #  Fichier partage (cas "meme visuel sur toutes les zones")
    # ------------------------------------------------------------------
    @api.model
    def _get_or_create_shared_attachment(self, order, filename, b64data):
        """Retourne un ir.attachment reutilisable pour ce binaire.
        Dedoublonne par checksum : si le meme fichier est deja rattache a la
        commande, on renvoie l'attachment existant (0 duplication)."""
        if not b64data:
            return self.env["ir.attachment"]
        try:
            raw = base64.b64decode(b64data)
        except Exception:
            raw = b64data if isinstance(b64data, bytes) else b64data.encode()
        checksum = hashlib.sha1(raw).hexdigest()
        Attachment = self.env["ir.attachment"].sudo()
        existing = Attachment.search([
            ("res_model", "=", "sale.order"),
            ("res_id", "=", order.id),
            ("checksum", "=", checksum),
        ], limit=1)
        if existing:
            return existing
        return Attachment.create({
            "name": filename or "logo.png",
            "datas": base64.b64encode(raw),
            "res_model": "sale.order",
            "res_id": order.id,
            "type": "binary",
        })

    # ------------------------------------------------------------------
    #  MIGRATION Studio -> perso.zone  (idempotente)
    # ------------------------------------------------------------------
    @api.model
    def _migrate_studio_zones(self):
        """Transforme l'existant Studio en enregistrements perso.zone.

        Regle metier : "1 fichier + N zones" -> "N zones pointant vers le
        MEME fichier". Idempotent : `studio_source_ref` empeche tout doublon
        au 2e passage.

        Sources reprises (cf. rapport d'audit) :
          A) modele Studio `x_zone_file` (fichier + zone + technique, lie par
             le token `x_ref` present dans la description de la ligne).
          B) champ global `sale.order.x_logo` (+ x_logo_filename) quand aucune
             `x_zone_file` n'existe pour la commande : 1 zone "coeur" par
             defaut pointant vers ce logo unique.
        """
        migrated = {"from_zone_file": 0, "from_global_logo": 0, "skipped": 0}
        Zone = self.sudo()

        # ---- A) x_zone_file -> perso.zone ----------------------------
        ZoneFile = self.env.get("x_zone_file")
        if ZoneFile is not None:
            for zf in self.env["x_zone_file"].sudo().search([]):
                src = "zf-%s" % zf.id
                if Zone.search_count([("studio_source_ref", "=", src)]):
                    migrated["skipped"] += 1
                    continue
                line = self._find_order_line_by_token(zf.x_ref)
                if not line:
                    migrated["skipped"] += 1
                    continue
                att = self._get_or_create_shared_attachment(
                    line.order_id, zf.x_filename, zf.x_file
                )
                Zone.create(self._zone_vals_from_zonefile(line, zf, att, src))
                migrated["from_zone_file"] += 1

        # ---- B) x_logo global -> perso.zone (si pas deja couvert) ----
        SaleOrder = self.env["sale.order"].sudo()
        if "x_logo" in SaleOrder._fields:
            orders = SaleOrder.search([("x_logo", "!=", False)])
            for order in orders:
                # lignes personnalisables (produit vendable, quantite > 0)
                for line in order.order_line.filtered(lambda l: l.product_id and l.product_uom_qty):
                    src = "logo-%s-%s" % (order.id, line.id)
                    if Zone.search_count([("studio_source_ref", "=", src)]):
                        migrated["skipped"] += 1
                        continue
                    # si la ligne a deja des zones (venant de A), on ne recree pas
                    if line.perso_zone_ids:
                        continue
                    att = self._get_or_create_shared_attachment(
                        order, order.x_logo_filename, order.x_logo
                    )
                    Zone.create({
                        "sale_order_line_id": line.id,
                        "zone": "coeur",
                        "zone_label": "Cœur (par defaut migration)",
                        "type_contenu": "logo",
                        "attachment_id": att.id,
                        "technique": "dtf",
                        "commentaire_atelier": order.x_perso_comment or False,
                        "prix_unitaire_ht": 0.0,
                        "studio_source_ref": src,
                    })
                    migrated["from_global_logo"] += 1

        _logger.info("perso_multi_zones migration Studio: %s", migrated)
        return migrated

    @api.model
    def _zone_vals_from_zonefile(self, line, zf, attachment, src):
        tech = (zf.x_tech or "").lower()
        technique = "broderie" if "brod" in tech else "dtf"
        return {
            "sale_order_line_id": line.id,
            "zone": zf.x_zone or "coeur",
            "zone_label": zf.x_zone or False,
            "type_contenu": "logo",
            "attachment_id": attachment.id if attachment else False,
            "technique": technique,
            "prix_unitaire_ht": 0.0,  # a affiner via price_matrix cote atelier
            "studio_source_ref": src,
        }

    @api.model
    def _find_order_line_by_token(self, token):
        """Retrouve la ligne de commande portant ce token perso (present dans
        la description de la ligne ou dans une product.attribute.custom.value)."""
        if not token:
            return self.env["sale.order.line"]
        SOL = self.env["sale.order.line"].sudo()
        line = SOL.search([("name", "ilike", token)], limit=1)
        if line:
            return line
        cav = self.env["product.attribute.custom.value"].sudo().search(
            [("custom_value", "ilike", token)], limit=1
        )
        return cav.sale_order_line_id if cav else self.env["sale.order.line"]
