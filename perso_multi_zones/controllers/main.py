import base64
import logging

from odoo import http
from odoo.http import request

_logger = logging.getLogger(__name__)

VALID_TECHNIQUES = {"broderie", "dtf"}
VALID_CONTENT = {"logo", "texte"}


class PersoMultiZonesController(http.Controller):
    """Endpoints appeles par le configurateur front (perso2_engine.js / Vercel).
    Contrat fige : voir CONTRACT.md a la racine du module.
    Tous les prix sont en HT (prix_unitaire_ht)."""

    # ------------------------------------------------------------------
    #  1) Upload d'un fichier -> file_ref reutilisable (cas "meme visuel")
    #     POST /perso2/upload   (multipart ou json base64)
    #     -> {"file_ref": <ir.attachment id>, "filename": "..."}
    # ------------------------------------------------------------------
    @http.route("/perso2/upload", type="json", auth="public", website=True,
                methods=["POST"], csrf=False)
    def perso_upload(self, filename=None, data_b64=None, **kw):
        if not data_b64:
            return {"error": "missing_file", "message": "data_b64 est obligatoire."}
        order = request.website.sale_get_order(force_create=True)
        try:
            raw = base64.b64decode(data_b64)
        except Exception:
            return {"error": "bad_file", "message": "data_b64 invalide (base64 attendu)."}
        att = request.env["perso.zone"].sudo()._get_or_create_shared_attachment(
            order, filename, base64.b64encode(raw)
        )
        return {"file_ref": att.id, "filename": att.name}

    # ------------------------------------------------------------------
    #  2) Ajout au panier : produit + N zones
    #     POST /perso2/add_to_cart  (json, cf. CONTRACT.md)
    #     -> {"order_line_id", "zone_ids", "line_total_ht"}
    # ------------------------------------------------------------------
    @http.route("/perso2/add_to_cart", type="json", auth="public", website=True,
                methods=["POST"], csrf=False)
    def perso_add_to_cart(self, product_id=None, quantity=1, zones=None, **kw):
        zones = zones or []
        if not product_id:
            return {"error": "missing_product", "message": "product_id obligatoire."}
        if not zones:
            return {"error": "no_zone", "message": "Au moins une zone est requise."}

        order = request.website.sale_get_order(force_create=True)
        Zone = request.env["perso.zone"].sudo()

        # Ajout du produit au panier (cree la sale.order.line)
        res = order._cart_update(
            product_id=int(product_id),
            add_qty=float(quantity),
        )
        line = request.env["sale.order.line"].sudo().browse(res.get("line_id"))
        if not line:
            return {"error": "cart_failed", "message": "Ajout au panier impossible."}

        created = []
        errors = []
        for idx, z in enumerate(zones):
            zone_code = (z.get("zone") or "").strip()
            content = z.get("type_contenu") or "logo"
            tech = (z.get("technique") or "dtf").lower()
            if not zone_code:
                errors.append({"index": idx, "error": "zone_invalide"})
                continue
            if content not in VALID_CONTENT or tech not in VALID_TECHNIQUES:
                errors.append({"index": idx, "error": "type_ou_technique_invalide"})
                continue

            attachment = request.env["ir.attachment"].sudo()
            if content == "logo":
                if z.get("file_ref"):
                    attachment = request.env["ir.attachment"].sudo().browse(int(z["file_ref"]))
                    if not attachment.exists():
                        errors.append({"index": idx, "error": "file_ref_introuvable"})
                        continue
                elif z.get("file") and z["file"].get("data_b64"):
                    attachment = Zone._get_or_create_shared_attachment(
                        order, z["file"].get("filename"), z["file"]["data_b64"]
                    )
                else:
                    errors.append({"index": idx, "error": "fichier_manquant"})
                    continue

            zone_rec = Zone.create({
                "sale_order_line_id": line.id,
                "sequence": (idx + 1) * 10,
                "zone": zone_code,
                "zone_label": z.get("zone_label") or zone_code,
                "type_contenu": content,
                "attachment_id": attachment.id or False,
                "texte": z.get("texte") or False,
                "technique": tech,
                "largeur_mm": int(z.get("largeur_mm") or 0),
                "hauteur_mm": int(z.get("hauteur_mm") or 0),
                "nb_couleurs": int(z.get("nb_couleurs") or 0),
                "prix_unitaire_ht": float(z.get("prix_unitaire_ht") or 0.0),
                "commentaire_atelier": z.get("commentaire_atelier") or False,
            })
            created.append(zone_rec.id)

        line.invalidate_recordset()  # force recalcul du total (perso inclus)
        return {
            "order_line_id": line.id,
            "zone_ids": created,
            "errors": errors,
            "line_total_ht": line.price_subtotal,
        }
