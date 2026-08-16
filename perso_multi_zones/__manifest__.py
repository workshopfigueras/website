# -*- coding: utf-8 -*-
{
    "name": "Personnalisation multi-zones (WORK SHOP)",
    "version": "19.0.1.0.0",
    "summary": "Un visuel par zone marquée : N zones par ligne de commande, "
               "BAT de production, migration depuis le logo unique Studio.",
    "author": "WORK SHOP",
    "website": "https://www.workshoptextil.com",
    "license": "LGPL-3",
    "category": "Sales/Sales",
    "depends": [
        "sale_management",
        "website_sale",
    ],
    # NB: le website cible ("WORK SHOP") est résolu PAR SON NOM dans le
    # post_init_hook (voir hooks.py) — jamais par un id codé en dur, car
    # l'id 2 est spécifique à cette base.
    "data": [
        "security/ir.model.access.csv",
        "data/perso_config_data.xml",
        "views/perso_zone_views.xml",
        "views/sale_order_views.xml",
        "views/website_templates.xml",
        "report/bat_report.xml",
        "report/bat_templates.xml",
    ],
    "post_init_hook": "post_init_hook",
    "installable": True,
    "application": False,
}
