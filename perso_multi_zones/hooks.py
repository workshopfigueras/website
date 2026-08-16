import logging

_logger = logging.getLogger(__name__)

# Nom EXACT du website cible. On résout par NOM, jamais par id (l'id 2 est
# propre à cette base ; un autre environnement peut differer).
WORK_SHOP_WEBSITE_NAME = "WORK SHOP"


def _get_work_shop_website(env):
    website = env["website"].search([("name", "=", WORK_SHOP_WEBSITE_NAME)], limit=1)
    if not website:
        _logger.warning(
            "perso_multi_zones: website '%s' introuvable — le scoping "
            "multi-site n'a pas ete applique.", WORK_SHOP_WEBSITE_NAME
        )
    return website


def post_init_hook(env):
    """Scope les vues/rapports exposes au site sur WORK SHOP uniquement,
    et lance une premiere migration idempotente des donnees Studio."""
    website = _get_work_shop_website(env)
    if website:
        # Rattache la vue front (recap panier des zones) au site WORK SHOP.
        view = env.ref("perso_multi_zones.perso_zone_cart_recap", raise_if_not_found=False)
        if view and not view.website_id:
            view.website_id = website.id
        _logger.info(
            "perso_multi_zones: vues front scopees sur website '%s' (id=%s).",
            website.name, website.id,
        )

    # Migration Studio -> perso.zone (idempotente, cf. models/migration.py)
    env["perso.zone"]._migrate_studio_zones()
