(function(){
"use strict";
if(window.__pt2Init) return; window.__pt2Init=1;
function boot(){
try{
 if(window.top!==window.self) return;
 var b=document.body.classList;
 if(b.contains('editor_enable')||b.contains('o_wysiwyg_edition')) return;
 var data=document.getElementById('pt2-data'); if(!data) return;
 var jsp=document.querySelector('.js_product'); if(!jsp) return;
 if(document.getElementById('pt2-open')) return;

 /* ===================== CONFIG ===================== */
 var TMPL=parseInt(data.getAttribute('data-tmpl'))||0;
 var PNAME=data.getAttribute('data-name')||'';
 var IMG='/web/image/product.image/';
 // Mockup par vêtement : lu depuis data-mock-* de la fiche produit (défaut = t-shirt).
 // T-shirt 497/498/499/522 · Polo 611/609/610/612 · Sweat 614/613/614/614
 function mkImg(v,def){return IMG+((v&&parseInt(v))||def)+'/image_1920';}
 var MOCK={
   face:   mkImg(data.getAttribute('data-mock-face'),   497),
   dos:    mkImg(data.getAttribute('data-mock-dos'),    498),
   mancheD:mkImg(data.getAttribute('data-mock-manche-d'),499),
   mancheG:mkImg(data.getAttribute('data-mock-manche-g'),522)
 };

 // ⚠️ PHASE 0 ODOO — variantes de marquage DTF (à renseigner après création dans Odoo).
 //   full = 1re position (plein tarif) · disc = positions suivantes (-20%).
 //   'label_ptav' = id de la valeur d'attribut custom TEXTE du produit marquage
 //   (permet d'afficher "Marquage DTF — <zone>" sur chaque ligne panier).
 var MK={
   small:{full:{tmpl:45738,variant:141892}, disc:{tmpl:45950,variant:143320}}, /* small -20% = 1,20 € */
   large:{full:{tmpl:45739,variant:141893}, disc:{tmpl:45951,variant:143321}}, /* large -20% = 2,32 € */
   label_ptav:0 /* (option) id d'un attribut texte pour afficher "Marquage DTF — <zone>" par ligne ; 0 = désactivé */
 };
 var RECAP={tmpl:45627,variant:134677,ptav:15812};

 // 6 zones : box en % de l'image (top,left,width,height). small=1,50 large=2,90
 var ZONES=[
  {key:'coeur',   labelKey:'z_coeur',   view:'face',   size:'small', box:{t:30,l:54,w:14,h:11}},
  {key:'poitrine',labelKey:'z_poitrine',view:'face',   size:'large', box:{t:34,l:34,w:32,h:26}},
  {key:'pecto_d', labelKey:'z_pecto_d', view:'face',   size:'small', box:{t:30,l:32,w:14,h:11}},
  {key:'manche_d',labelKey:'z_manche_d',view:'mancheD',size:'small', box:{t:38,l:38,w:16,h:12}},
  {key:'manche_g',labelKey:'z_manche_g',view:'mancheG',size:'small', box:{t:38,l:46,w:16,h:12}},
  {key:'dos',     labelKey:'z_dos',     view:'dos',    size:'large', box:{t:30,l:33,w:34,h:34}}
 ];
 var VIEWS=[{k:'face',lk:'v_face'},{k:'dos',lk:'v_dos'},{k:'mancheD',lk:'v_mancheD'},{k:'mancheG',lk:'v_mancheG'}];
 var TECHS=[
  {key:'impression', labelKey:'t_impression', mode:'pay'},
  {key:'broderie',   labelKey:'t_broderie',   mode:'devis'},
  {key:'serigraphie',labelKey:'t_serigraphie',mode:'devis'}
 ];
 var PRICE={small:1.50,large:2.90};
 var DISCOUNT=0.20; // -20% dès la 2e position
 var ACCEPT='.png,.jpg,.jpeg,.pdf,.svg,.ai,.eps,image/png,image/jpeg,application/pdf,image/svg+xml,application/postscript,application/illustrator';
 // Charte
 var C={jaune:'#F5C518',noir:'#1A1A1A'};

 var mdata=document.getElementById('moq-data');
 // MOQ par vêtement (détecté via data-mock-face du div #pt2-data) : Sweat=10 ; T-shirt & Polo=20
 var __pd=document.getElementById('pt2-data');
 var __mf=__pd?__pd.getAttribute('data-mock-face'):null;
 var MOQ=(__mf==='614')?10:20;
 function langCode(){var m=location.pathname.match(/^\/(fr|es_ES|ca_ES)(\/|$)/);if(!m)return 'fr';return m[1]==='es_ES'?'es':(m[1]==='ca_ES'?'ca':'fr');}
 function langPfx(){var m=location.pathname.match(/^\/(fr|es_ES|ca_ES)(\/|$)/);return m?('/'+m[1]):'';}
 function csrfTok(){return (window.odoo&&window.odoo.csrf_token)||(document.querySelector('input[name=csrf_token]')||{}).value||'';}

 /* ===================== i18n (FR / ES / CA) ===================== */
 var I18N={
  fr:{
   open:'🎨 Commencer la personnalisation',
   title:'Personnaliser votre t-shirt',
   s_zone:'Zones',s_logo:'Logos',s_tech:'Technique',s_valid:'Validation',
   note:"La personnalisation est présentée sur un mockup blanc pour faciliter le placement. Le rendu est une prévisualisation indicative. Un BAT final vous sera envoyé pour validation avant production.",
   h_zones:'1. Emplacements du marquage',h_logos:'2. Vos logos',h_tech:'3. Technique',h_valid:'4. Validation',
   zones_hint:'Sélectionnez une ou plusieurs zones (elles s’ajoutent).',
   up:'⬆ Importer un logo',reco:'PNG à fond transparent, PDF vectoriel ou SVG recommandé.',
   use_others:'Utiliser ce logo sur mes autres positions',
   lib:'Vos logos importés :',apply:'Appliquer',remove:'Retirer',
   noselzone:'Choisissez d’abord une zone.',assign:'Cliquez une zone puis un logo pour l’y placer.',
   size:'Taille',face:'Face',
   marking:'Marquage',per_piece:'/pièce',total_marking:'Total marquage',for_n:'pour',pieces:'pièces',
   textile:'Textile',mark_line:'Marquage',and_total:'Total HT',
   disc_badge:'2e marquage -20%',full_badge:'1re position',
   pay_now:'Paiement immédiat',on_quote:'Demande de devis',
   devis_note:'Cette technique nécessite un chiffrage personnalisé. Aucun paiement maintenant.',
   c_name:'Nom / société',c_email:'Email',c_phone:'Téléphone',
   bat:'Je comprends que cet aperçu est indicatif et qu’un BAT final me sera envoyé pour validation avant production.',
   cta_add:'VALIDER ET AJOUTER AU PANIER',cta_devis:'DEMANDER UN DEVIS',processing:'Traitement…',
   moq_sel:'Tailles sélectionnées',minimum:'minimum',pick_color:'choisissez une couleur sur la fiche',
   complete:'complétez la répartition sur la fiche produit',
   gate:'Ajoutez encore %n pièce%s pour commencer la personnalisation.',
   err:'⚠ Un problème est survenu (%w). Aucune ligne incohérente n’a été laissée. Réessayez.',
   devis_ok:'✅ Demande de devis enregistrée',devis_ok_txt:'Aucun paiement demandé. Nous revenons vers vous avec un chiffrage et un BAT. Réf. : %r.',
   see_other:'Voir d’autres textiles',back_shop:'Retour à la boutique',
   z_coeur:'Cœur',z_poitrine:'Poitrine',z_pecto_d:'Pectoral droit',z_manche_d:'Bas manche droite',z_manche_g:'Bas manche gauche',z_dos:'Central dos',
   v_face:'Face',v_dos:'Dos',v_mancheD:'Manche droite',v_mancheG:'Manche gauche',
   t_impression:'Impression numérique (DTF)',t_broderie:'Broderie',t_serigraphie:'Sérigraphie',
   big:'grande zone',small_z:'petite zone',color_ordered:'Couleur commandée :',preview_white:'prévisualisation sur blanc pour faciliter le placement'
  },
  es:{
   open:'🎨 Empezar la personalización',
   title:'Personaliza tu camiseta',
   s_zone:'Zonas',s_logo:'Logos',s_tech:'Técnica',s_valid:'Validación',
   note:"La personalización se muestra sobre una maqueta blanca para facilitar la colocación. La imagen es una previsualización indicativa. Recibirás un BAT final para su validación antes de la producción.",
   h_zones:'1. Ubicaciones del marcaje',h_logos:'2. Tus logos',h_tech:'3. Técnica',h_valid:'4. Validación',
   zones_hint:'Selecciona una o varias zonas (se acumulan).',
   up:'⬆ Subir un logo',reco:'PNG con fondo transparente, PDF vectorial o SVG recomendado.',
   use_others:'Usar este logo en mis otras posiciones',
   lib:'Tus logos subidos:',apply:'Aplicar',remove:'Quitar',
   noselzone:'Elige primero una zona.',assign:'Haz clic en una zona y luego en un logo para colocarlo.',
   size:'Tamaño',face:'Frente',
   marking:'Marcaje',per_piece:'/pieza',total_marking:'Total marcaje',for_n:'para',pieces:'piezas',
   textile:'Textil',mark_line:'Marcaje',and_total:'Total sin IVA',
   disc_badge:'2º marcaje -20%',full_badge:'1ª posición',
   pay_now:'Pago inmediato',on_quote:'Solicitar presupuesto',
   devis_note:'Esta técnica requiere un presupuesto personalizado. Ningún pago ahora.',
   c_name:'Nombre / empresa',c_email:'Email',c_phone:'Teléfono',
   bat:'Entiendo que esta vista es indicativa y que recibiré un BAT final para validar antes de la producción.',
   cta_add:'VALIDAR Y AÑADIR AL CARRITO',cta_devis:'SOLICITAR PRESUPUESTO',processing:'Procesando…',
   moq_sel:'Tallas seleccionadas',minimum:'mínimo',pick_color:'elige un color en la ficha',
   complete:'completa el reparto en la ficha del producto',
   gate:'Añade %n pieza%s más para empezar la personalización.',
   err:'⚠ Ha ocurrido un problema (%w). No se ha dejado ninguna línea incoherente. Inténtalo de nuevo.',
   devis_ok:'✅ Solicitud de presupuesto registrada',devis_ok_txt:'Ningún pago solicitado. Te enviaremos un presupuesto y un BAT. Ref.: %r.',
   see_other:'Ver otros textiles',back_shop:'Volver a la tienda',
   z_coeur:'Corazón',z_poitrine:'Pecho',z_pecto_d:'Pectoral derecho',z_manche_d:'Bajo manga derecha',z_manche_g:'Bajo manga izquierda',z_dos:'Espalda central',
   v_face:'Frente',v_dos:'Espalda',v_mancheD:'Manga derecha',v_mancheG:'Manga izquierda',
   t_impression:'Impresión digital (DTF)',t_broderie:'Bordado',t_serigraphie:'Serigrafía',
   big:'zona grande',small_z:'zona pequeña',color_ordered:'Color pedido:',preview_white:'previsualización en blanco para facilitar la colocación'
  },
  ca:{
   open:'🎨 Comença la personalització',
   title:'Personalitza la teva samarreta',
   s_zone:'Zones',s_logo:'Logos',s_tech:'Tècnica',s_valid:'Validació',
   note:"La personalització es mostra sobre una maqueta blanca per facilitar la col·locació. La imatge és una previsualització indicativa. Rebràs un BAT final per validar-lo abans de la producció.",
   h_zones:'1. Ubicacions del marcatge',h_logos:'2. Els teus logos',h_tech:'3. Tècnica',h_valid:'4. Validació',
   zones_hint:'Selecciona una o diverses zones (s’acumulen).',
   up:'⬆ Puja un logo',reco:'PNG amb fons transparent, PDF vectorial o SVG recomanat.',
   use_others:'Fes servir aquest logo a les meves altres posicions',
   lib:'Els teus logos pujats:',apply:'Aplica',remove:'Treu',
   noselzone:'Tria primer una zona.',assign:'Fes clic en una zona i després en un logo per col·locar-lo.',
   size:'Mida',face:'Davant',
   marking:'Marcatge',per_piece:'/peça',total_marking:'Total marcatge',for_n:'per a',pieces:'peces',
   textile:'Tèxtil',mark_line:'Marcatge',and_total:'Total sense IVA',
   disc_badge:'2n marcatge -20%',full_badge:'1a posició',
   pay_now:'Pagament immediat',on_quote:'Sol·licitar pressupost',
   devis_note:'Aquesta tècnica necessita un pressupost personalitzat. Cap pagament ara.',
   c_name:'Nom / empresa',c_email:'Email',c_phone:'Telèfon',
   bat:'Entenc que aquesta vista és indicativa i que rebré un BAT final per validar abans de la producció.',
   cta_add:'VALIDA I AFEGEIX A LA CISTELLA',cta_devis:'SOL·LICITA PRESSUPOST',processing:'Processant…',
   moq_sel:'Talles seleccionades',minimum:'mínim',pick_color:'tria un color a la fitxa',
   complete:'completa el repartiment a la fitxa del producte',
   gate:'Afegeix %n peça%s més per començar la personalització.',
   err:'⚠ Hi ha hagut un problema (%w). No s’ha deixat cap línia incoherent. Torna-ho a provar.',
   devis_ok:'✅ Sol·licitud de pressupost registrada',devis_ok_txt:'Cap pagament sol·licitat. Et farem arribar un pressupost i un BAT. Ref.: %r.',
   see_other:'Veure altres tèxtils',back_shop:'Torna a la botiga',
   z_coeur:'Cor',z_poitrine:'Pit',z_pecto_d:'Pectoral dret',z_manche_d:'Sota màniga dreta',z_manche_g:'Sota màniga esquerra',z_dos:'Esquena central',
   v_face:'Davant',v_dos:'Esquena',v_mancheD:'Màniga dreta',v_mancheG:'Màniga esquerra',
   t_impression:'Impressió digital (DTF)',t_broderie:'Brodat',t_serigraphie:'Serigrafia',
   big:'zona gran',small_z:'zona petita',color_ordered:'Color demanat:',preview_white:'previsualització en blanc per facilitar la col·locació'
  }
 };
 var LANG=langCode();
 function T(k){var d=I18N[LANG]||I18N.fr;return (k in d)?d[k]:(I18N.fr[k]||k);}
 function money(n){return n.toFixed(2).replace('.',',')+' €';}

 /* ===================== STATE ===================== */
 // logos: [{id, file, name, previewUrl, isImg, isVector}]
 // marks: [{id, zone, logoId, pos:{x,y}, scale}]  (ordre = ordre d'ajout = rang tarifaire)
 var uid=0; function nid(p){return (p||'i')+(++uid)+'_'+Math.random().toString(36).slice(2,6);}
 var state={technique:null, logos:[], marks:[], bat:false, view:'face', activeMark:null, ref:null};

 function zoneObj(k){for(var i=0;i<ZONES.length;i++)if(ZONES[i].key===k)return ZONES[i];return null;}
 function techObj(k){for(var i=0;i<TECHS.length;i++)if(TECHS[i].key===k)return TECHS[i];return null;}
 function logoObj(id){for(var i=0;i<state.logos.length;i++)if(state.logos[i].id===id)return state.logos[i];return null;}
 function markForZone(zk){for(var i=0;i<state.marks.length;i++)if(state.marks[i].zone===zk)return state.marks[i];return null;}
 function isPay(){var t=state.technique?techObj(state.technique):null;return !!(t&&t.mode==='pay');}

 // Prix marquage d'une position selon son rang (0 = plein, >=1 = -20%)
 function markUnitPrice(rank,zone){var base=PRICE[zone.size];return rank===0?base:+(base*(1-DISCOUNT)).toFixed(2);}
 // Total marquage par pièce (somme des positions) — seulement si technique payante
 function markPerPiece(){if(!isPay())return 0;var s=0;state.marks.forEach(function(m,i){s+=markUnitPrice(i,zoneObj(m.zone));});return +s.toFixed(2);}

 /* ===================== CSS ===================== */
 var css=document.createElement('style');css.id='pt2-css';
 css.textContent=[
 '#pt2-open{display:inline-flex;align-items:center;gap:10px;width:100%;justify-content:center;background:'+C.jaune+';color:'+C.noir+';border:0;border-radius:14px;padding:17px;font:800 16.5px Poppins,system-ui,sans-serif;cursor:pointer;margin:12px 0;box-shadow:0 4px 14px rgba(245,197,24,.45);transition:transform .15s,box-shadow .15s}',
 '#pt2-open:hover:not(:disabled){transform:translateY(-2px) scale(1.01);box-shadow:0 9px 24px rgba(245,197,24,.6)}',
 '#pt2-open:disabled{background:#e6e4dd;color:#9a9891;cursor:not-allowed;box-shadow:none;transform:none}',
 '#moq-add{display:none!important}',
 '#pt2-gate{display:none;margin:12px 0;padding:13px 15px;border-radius:12px;background:#f4f4f2;color:#6c6f76;font:600 13px Poppins,sans-serif;text-align:center}',
 '#pt2-gate.show{display:block}',
 '.pt2-steps{display:flex;align-items:center;justify-content:center;gap:5px;flex-wrap:wrap;background:#faf9f6;padding:10px 12px;border-bottom:1px solid #eee}',
 '.pt2-steps .stp{display:flex;align-items:center;gap:6px;font:700 11.5px Poppins,sans-serif;color:#9a9891}',
 '.pt2-steps .stp b{display:inline-flex;width:21px;height:21px;border-radius:50%;background:#e6e4dd;color:#7a7870;align-items:center;justify-content:center;font-size:11px;font-weight:800}',
 '.pt2-steps .stp.on{color:'+C.noir+'}.pt2-steps .stp.on b{background:'+C.jaune+';color:'+C.noir+'}',
 '.pt2-steps .stp.done b{background:#1e9d57;color:#fff}',
 '.pt2-steps .sep{color:#ccc;font-size:13px}',
 '@media(max-width:520px){.pt2-steps .stp span{display:none}.pt2-steps{gap:8px}}',
 '#pt2-ov{position:fixed;inset:0;z-index:2147483000;background:rgba(26,26,26,.72);display:none;align-items:flex-start;justify-content:center;overflow:auto;padding:18px;font-family:Poppins,system-ui,sans-serif}',
 '#pt2-ov.on{display:flex}',
 '#pt2-modal{background:#fff;width:100%;max-width:1080px;border-radius:18px;overflow:hidden;margin:auto;box-shadow:0 20px 60px rgba(0,0,0,.4)}',
 '.pt2-hd{display:flex;align-items:center;justify-content:space-between;background:'+C.noir+';color:#fff;padding:14px 18px}',
 '.pt2-hd h3{margin:0;font:800 17px Poppins;color:'+C.jaune+'}',
 '.pt2-x{background:none;border:0;color:#fff;font-size:26px;line-height:1;cursor:pointer}',
 '.pt2-note{background:#FFF8CC;border-left:4px solid '+C.jaune+';padding:10px 14px;font-size:12.5px;color:#4a4a20;margin:0}',
 '.pt2-body{display:grid;grid-template-columns:1fr 1fr;gap:18px;padding:18px}',
 '.pt2-stage-wrap{position:relative}',
 '.pt2-color{font:600 12.5px Poppins;color:'+C.noir+';margin-bottom:6px}',
 '.pt2-color small{color:#6c6f76;font-weight:500}',
 '.pt2-views{display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap}',
 '.pt2-vw{border:2px solid #e5e5e5;border-radius:8px;padding:5px 10px;font:700 11px Poppins;cursor:pointer;background:#fff;color:#6c6f76;position:relative}',
 '.pt2-vw.on{border-color:'+C.noir+';background:'+C.noir+';color:'+C.jaune+'}',
 '.pt2-vw .cnt{display:inline-block;min-width:16px;height:16px;line-height:16px;text-align:center;background:'+C.jaune+';color:'+C.noir+';border-radius:50%;font-size:10px;margin-left:5px}',
 '.pt2-stage{position:relative;width:100%;aspect-ratio:1279/1920;background:#f4f4f2;border:1px solid #e5e5e5;border-radius:10px;overflow:hidden;touch-action:none}',
 '.pt2-stage img.pt2-mk{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none;user-select:none}',
 '.pt2-mark{position:absolute;border:1px dashed rgba(245,197,24,.7);overflow:visible;box-sizing:border-box}',
 '.pt2-mark.on{border:2px solid '+C.jaune+';z-index:5}',
 '.pt2-mark img{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);cursor:move;touch-action:none;user-select:none;max-width:none}',
 '.pt2-mark .rz{position:absolute;right:-8px;bottom:-8px;width:18px;height:18px;background:'+C.jaune+';border:2px solid '+C.noir+';border-radius:50%;cursor:nwse-resize;touch-action:none;display:none}',
 '.pt2-mark.on .rz{display:block}',
 '.pt2-mark .del{position:absolute;left:-8px;top:-8px;width:18px;height:18px;background:'+C.noir+';color:#fff;border:0;border-radius:50%;cursor:pointer;font-size:12px;line-height:1;display:none}',
 '.pt2-mark.on .del{display:block}',
 '.pt2-ctr{display:flex;flex-direction:column;gap:16px}',
 '.pt2-step h4{margin:0 0 8px;font:800 12px Poppins;text-transform:uppercase;letter-spacing:.04em;color:'+C.noir+'}',
 '.pt2-hint{font-size:11.5px;color:#6c6f76;margin:0 0 8px}',
 '.pt2-zones{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px}',
 '.pt2-zc{border:2px solid #e5e5e5;border-radius:10px;padding:7px 5px;cursor:pointer;text-align:center;background:#fff;transition:.12s;position:relative}',
 '.pt2-zc:hover{border-color:#bbb}',
 '.pt2-zc.on{border-color:'+C.noir+';background:'+C.noir+';color:'+C.jaune+'}',
 '.pt2-zc .chk{position:absolute;top:5px;right:5px;width:18px;height:18px;border-radius:50%;background:'+C.jaune+';color:'+C.noir+';font-size:12px;line-height:18px;display:none}',
 '.pt2-zc.on .chk{display:block}',
 '.pt2-zc .pt2-th{width:100%;height:52px;object-fit:contain;background:#f4f4f2;border-radius:6px;margin-bottom:4px}',
 '.pt2-zc span.nm{font:600 10.5px Poppins;display:block;line-height:1.15}',
 '.pt2-zc span.pr{font:700 10px Poppins;display:block;margin-top:2px;color:#1e9d57}',
 '.pt2-zc.on span.pr{color:'+C.jaune+'}',
 '.pt2-up{display:block;border:2px dashed #dad7cf;border-radius:10px;padding:14px;text-align:center;cursor:pointer;color:'+C.noir+';font-weight:600;font-size:13px}',
 '.pt2-up input{display:none}',
 '.pt2-reco{font-size:11px;color:#6c6f76;margin:6px 0 0}',
 '.pt2-useall{display:flex;align-items:center;gap:8px;font-size:12px;margin:8px 0 0;color:'+C.noir+'}',
 '.pt2-lib{margin-top:10px}',
 '.pt2-lib .cap{font:700 11px Poppins;color:#6c6f76;margin-bottom:5px}',
 '.pt2-logos{display:flex;gap:8px;flex-wrap:wrap}',
 '.pt2-lg{width:64px;border:2px solid #e5e5e5;border-radius:8px;padding:4px;text-align:center;cursor:pointer;background:#fff;position:relative}',
 '.pt2-lg.on{border-color:'+C.noir+'}',
 '.pt2-lg img{width:100%;height:42px;object-fit:contain}',
 '.pt2-lg .nm{font-size:9px;color:#6c6f76;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
 '.pt2-lg .rm{position:absolute;top:-7px;right:-7px;width:17px;height:17px;background:'+C.noir+';color:#fff;border:0;border-radius:50%;font-size:11px;cursor:pointer;line-height:1}',
 '.pt2-size{display:flex;align-items:center;gap:8px;margin-top:8px}',
 '.pt2-size input[type=range]{flex:1}',
 '.pt2-techs{display:flex;flex-direction:column;gap:6px}',
 '.pt2-tc{display:flex;align-items:center;gap:9px;border:2px solid #e5e5e5;border-radius:10px;padding:9px 11px;cursor:pointer;font:600 13px Poppins}',
 '.pt2-tc.on{border-color:'+C.noir+'}',
 '.pt2-badge{margin-left:auto;font:700 10.5px Poppins;padding:3px 8px;border-radius:20px}',
 '.pt2-badge.pay{background:#1e9d57;color:#fff}',
 '.pt2-badge.devis{background:#e78a00;color:#fff}',
 '.pt2-recap{background:#faf9f6;border:1px solid #eee;border-radius:10px;padding:11px 13px;font-size:12.5px;color:'+C.noir+'}',
 '.pt2-recap .row{display:flex;justify-content:space-between;margin:3px 0}',
 '.pt2-recap .row.tot{border-top:1px solid #e5e5e5;margin-top:7px;padding-top:7px;font-weight:800}',
 '.pt2-recap .disc{color:#1e9d57;font-weight:700;font-size:11.5px}',
 '.pt2-recap .pos{font-size:11.5px;color:#555;display:flex;justify-content:space-between;margin:2px 0}',
 '.pt2-moq{font:600 12.5px Poppins;padding:8px 10px;border-radius:8px;background:#f2f2f0;margin:8px 0}',
 '.pt2-moq.ok{background:#eaf7ef;color:#14663a}.pt2-moq.ko{background:#fdecec;color:#7a1f16}',
 '#pt2-devisbox{display:none;flex-direction:column;gap:7px;margin-bottom:8px}',
 '.pt2-devis-note{background:#fff3e0;border-left:4px solid #e78a00;padding:9px 11px;font-size:12px;color:#6a4a10;border-radius:6px}',
 '#pt2-devisbox input{border:1px solid #dad7cf;border-radius:8px;padding:10px;font-size:13px;font-family:Poppins}',
 '.pt2-bat{display:flex;gap:9px;align-items:flex-start;font-size:12.5px;color:#333;background:#f7f7f5;border-radius:10px;padding:11px}',
 '.pt2-bat input{margin-top:2px}',
 '#pt2-cta{width:100%;background:'+C.jaune+';color:'+C.noir+';border:0;border-radius:12px;padding:15px;font:800 15px Poppins;cursor:pointer}',
 '#pt2-cta.devis{background:'+C.noir+';color:'+C.jaune+'}',
 '#pt2-cta:disabled{background:#e6e4dd;color:#9a9891;cursor:not-allowed}',
 '.pt2-done{background:#eaf7ef;border:1px solid #1e9d57;color:#14663a;border-radius:10px;padding:12px;font-size:13px;display:none}',
 '.pt2-confirm{padding:26px 22px;text-align:center}',
 '.pt2-confirm h3{font:800 20px Poppins;color:'+C.noir+';margin:0 0 8px}',
 '.pt2-confirm .num{display:inline-block;background:'+C.jaune+';color:'+C.noir+';font-weight:800;padding:6px 14px;border-radius:20px;margin:6px 0 14px}',
 '.pt2-confirm a{display:inline-block;margin:6px;background:'+C.noir+';color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;font-size:14px}',
 '.pt2-confirm a.y{background:'+C.jaune+';color:'+C.noir+'}',
 '@media(max-width:820px){.pt2-body{grid-template-columns:1fr}.pt2-stage{max-width:420px;margin:0 auto}.pt2-zones{grid-template-columns:1fr 1fr}}'
 ].join('\n');
 document.head.appendChild(css);

 /* ===================== MOQ (répartition tailles / couleur / variantes) ===================== */
 function isSize(a){return /taille|size|talla|pointure|gr[oö]sse|n[uú]mero/i.test(a);}
 function isColor(a){return /couleur|colou?r|color/i.test(a);}
 function readMoq(){
   var res={color:null,sizes:{},total:0,vmap:{}};
   var VAR=[]; try{VAR=JSON.parse((document.getElementById('moq-variants')||{}).textContent||'[]')||[];}catch(e){}
   var vmap={};
   VAR.forEach(function(v){var col=null,sz=null;(v.c||[]).forEach(function(a){if(isColor(a.a))col=a.v;else if(isSize(a.a))sz=a.v;});if(col===null&&sz===null&&v.c&&v.c.length===1)sz=v.c[0].v;if(col===null)col='__';if(sz!==null){if(!vmap[col])vmap[col]={};vmap[col][sz]=v.id;}});
   res.vmap=vmap;
   var hasSw=!!document.querySelector('.moq-sw');
   if(!hasSw){res.color='__';}else{var on=document.querySelector('.moq-sw.on');res.color=on?on.getAttribute('data-c'):null;}
   [].forEach.call(document.querySelectorAll('.moq-table [data-i]'),function(inp){var sname=inp.getAttribute('data-i');var q=parseInt(inp.value,10)||0;if(q>0){res.sizes[sname]=q;res.total+=q;}});
   return res;
 }

 /* ===================== bouton + gate ===================== */
 var open=document.createElement('button');open.type='button';open.id='pt2-open';open.textContent=T('open');
 var gate=document.createElement('div');gate.id='pt2-gate';
 var anchor=document.getElementById('o_wsale_product_cta_section')||jsp;
 if(anchor&&anchor.parentNode){anchor.parentNode.insertBefore(open,anchor);anchor.parentNode.insertBefore(gate,anchor);} else {jsp.appendChild(open);jsp.appendChild(gate);}

 /* ===================== modale ===================== */
 var ov=document.createElement('div');ov.id='pt2-ov';
 ov.innerHTML=''
 +'<div id="pt2-modal" role="dialog" aria-modal="true">'
 +'<div class="pt2-hd"><h3>'+T('title')+'</h3><button type="button" class="pt2-x" aria-label="x">&times;</button></div>'
 +'<div class="pt2-steps" id="pt2-steps"><span class="stp" data-s="1"><b>1</b><span>'+T('s_zone')+'</span></span><span class="sep">&#8594;</span><span class="stp" data-s="2"><b>2</b><span>'+T('s_logo')+'</span></span><span class="sep">&#8594;</span><span class="stp" data-s="3"><b>3</b><span>'+T('s_tech')+'</span></span><span class="sep">&#8594;</span><span class="stp" data-s="4"><b>4</b><span>'+T('s_valid')+'</span></span></div>'
 +'<div id="pt2-main">'
 +'<p class="pt2-note">'+T('note')+'</p>'
 +'<div class="pt2-body">'
 +'<div class="pt2-stage-wrap">'
 +'<div class="pt2-color" id="pt2-color"></div>'
 +'<div class="pt2-views" id="pt2-views"></div>'
 +'<div class="pt2-stage" id="pt2-stage"><img class="pt2-mk" id="pt2-mk" alt="mockup"/></div>'
 +'</div>'
 +'<div class="pt2-ctr">'
 +'<div class="pt2-step"><h4>'+T('h_zones')+'</h4><p class="pt2-hint">'+T('zones_hint')+'</p><div class="pt2-zones" id="pt2-zones"></div></div>'
 +'<div class="pt2-step"><h4>'+T('h_logos')+'</h4><label class="pt2-up">'+T('up')+'<input type="file" id="pt2-file" accept="'+ACCEPT+'"/></label><p class="pt2-reco">'+T('reco')+'</p><label class="pt2-useall"><input type="checkbox" id="pt2-useall"/><span>'+T('use_others')+'</span></label><div class="pt2-lib" id="pt2-lib"></div><div class="pt2-size" id="pt2-sizerow" style="display:none"><span>'+T('size')+'</span><input type="range" id="pt2-scale" min="20" max="140" value="60"/></div></div>'
 +'<div class="pt2-step"><h4>'+T('h_tech')+'</h4><div class="pt2-techs" id="pt2-techs"></div></div>'
 +'<div class="pt2-step"><h4>'+T('h_valid')+'</h4>'
 +'<div class="pt2-recap" id="pt2-recap"></div>'
 +'<div class="pt2-moq" id="pt2-moq"></div>'
 +'<div id="pt2-devisbox"><div class="pt2-devis-note">'+T('devis_note')+'</div><input id="pt2-cname" placeholder="'+T('c_name')+'"/><input id="pt2-cemail" type="email" placeholder="'+T('c_email')+'"/><input id="pt2-cphone" placeholder="'+T('c_phone')+'"/></div>'
 +'<label class="pt2-bat"><input type="checkbox" id="pt2-bat"/><span>'+T('bat')+'</span></label></div>'
 +'<button type="button" id="pt2-cta" disabled>'+T('cta_add')+'</button>'
 +'<div class="pt2-done" id="pt2-done"></div>'
 +'</div>'
 +'</div>'
 +'</div>'
 +'<div id="pt2-confirm-wrap"></div>'
 +'</div>';
 document.body.appendChild(ov);

 var mk=ov.querySelector('#pt2-mk'),stage=ov.querySelector('#pt2-stage'),viewsEl=ov.querySelector('#pt2-views');
 var ctaBtn=ov.querySelector('#pt2-cta'),doneEl=ov.querySelector('#pt2-done'),recapEl=ov.querySelector('#pt2-recap');
 var devisBox=ov.querySelector('#pt2-devisbox'),libEl=ov.querySelector('#pt2-lib'),useAll=ov.querySelector('#pt2-useall');
 var sizeRow=ov.querySelector('#pt2-sizerow'),scaleInput=ov.querySelector('#pt2-scale');
 scaleInput.oninput=function(e){var am=state.activeMark?logoMarkById(state.activeMark):null;if(!am)return;am.scale=parseInt(e.target.value,10);var wrap=stage.querySelector('.pt2-mark[data-m="'+am.id+'"]');if(wrap){var im=wrap.querySelector('img');if(im)im.style.width=am.scale+'%';}};

 /* ---- zones (multi-select) ---- */
 var zc=ov.querySelector('#pt2-zones');
 ZONES.forEach(function(z){var c=document.createElement('div');c.className='pt2-zc';c.setAttribute('data-k',z.key);
   c.innerHTML='<span class="chk">✓</span><img class="pt2-th" src="'+MOCK[z.view]+'" alt=""/><span class="nm">'+T(z.labelKey)+'</span><span class="pr"></span>';
   c.onclick=function(){toggleZone(z.key);};zc.appendChild(c);});
 function refreshZonePrices(){[].forEach.call(zc.children,function(c){var z=zoneObj(c.getAttribute('data-k'));var m=markForZone(z.key);var pr=c.querySelector('.pr');
   if(isPay()){var rank=m?state.marks.indexOf(m):state.marks.length;var base=PRICE[z.size];pr.textContent=(m&&rank>0)?('+'+money(markUnitPrice(rank,z))+' ('+T('disc_badge')+')'):('+'+money(base));}
   else{pr.textContent=T('on_quote');}});}

 function toggleZone(zk){
   var existing=markForZone(zk);
   if(existing){ state.marks=state.marks.filter(function(m){return m!==existing;}); if(state.activeMark===existing.id)state.activeMark=null; }
   else{ var m={id:nid('m'),zone:zk,logoId:(state.logos[0]?state.logos[0].id:null),pos:{x:50,y:50},scale:60}; state.marks.push(m); state.activeMark=m.id; state.view=zoneObj(zk).view; }
   syncAll();
 }

 /* ---- techniques ---- */
 var tw=ov.querySelector('#pt2-techs');
 TECHS.forEach(function(t){var c=document.createElement('div');c.className='pt2-tc';c.setAttribute('data-k',t.key);
   c.innerHTML='<span>'+T(t.labelKey)+'</span><span class="pt2-badge '+(t.mode==='pay'?'pay':'devis')+'">'+(t.mode==='pay'?T('pay_now'):T('on_quote'))+'</span>';
   c.onclick=function(){selectTech(t.key);};tw.appendChild(c);});
 function selectTech(k){state.technique=k;[].forEach.call(tw.children,function(c){c.classList.toggle('on',c.getAttribute('data-k')===k);});
   var t=techObj(k);if(t.mode==='pay'){ctaBtn.textContent=T('cta_add');ctaBtn.classList.remove('devis');devisBox.style.display='none';}else{ctaBtn.textContent=T('cta_devis');ctaBtn.classList.add('devis');devisBox.style.display='flex';}
   syncAll();}

 /* ---- upload + bibliothèque de logos ---- */
 var fileInput=ov.querySelector('#pt2-file');
 fileInput.onchange=function(){var f=fileInput.files&&fileInput.files[0];if(!f)return;handleFile(f);fileInput.value='';};
 function isImgType(f){return /^image\/(png|jpe?g)$/i.test(f.type);}
 function isVectorType(f){return /(svg|pdf|postscript|illustrator)/i.test(f.type)||/\.(svg|pdf|ai|eps)$/i.test(f.name);}
 function handleFile(f){
   var lg={id:nid('l'),file:f,name:f.name,previewUrl:null,isImg:isImgType(f),isVector:isVectorType(f)};
   state.logos.push(lg);
   function done(){
     if(useAll.checked){ state.marks.forEach(function(m){m.logoId=lg.id;}); }
     else {
       // rattacher à la zone active…
       if(state.activeMark){ var am=logoMarkById(state.activeMark); if(am)am.logoId=lg.id; }
       // …ET remplir toute position encore sans logo → 1 seul upload couvre Cœur+Dos (test #1)
       state.marks.forEach(function(m){ if(!m.logoId) m.logoId=lg.id; });
     }
     syncAll();
   }
   if(lg.isImg){var rd=new FileReader();rd.onload=function(e){compress(e.target.result,function(durl){lg.previewUrl=durl;done();});};rd.readAsDataURL(f);}
   else{lg.previewUrl=null;done();}
 }
 function logoMarkById(id){for(var i=0;i<state.marks.length;i++)if(state.marks[i].id===id)return state.marks[i];return null;}
 function compress(durl,cb){var im=new Image();im.onload=function(){var max=520,w=im.width,h=im.height,r=Math.min(1,max/Math.max(w,h));var cv=document.createElement('canvas');cv.width=Math.round(w*r);cv.height=Math.round(h*r);cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);try{cb(cv.toDataURL('image/png'));}catch(e){cb(durl);}};im.onerror=function(){cb(durl);};im.src=durl;}
 function logoThumb(lg){return lg.previewUrl||('data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="52"><rect width="80" height="52" rx="6" fill="'+C.noir+'"/><text x="40" y="30" fill="'+C.jaune+'" font-family="sans-serif" font-size="10" text-anchor="middle">'+(lg.isVector?'VECTOR':'LOGO')+'</text></svg>'));}
 function renderLib(){
   if(!state.logos.length){libEl.innerHTML='';return;}
   var h='<div class="cap">'+T('lib')+'</div><div class="pt2-logos">';
   state.logos.forEach(function(lg){var used=state.activeMark&&logoMarkById(state.activeMark)&&logoMarkById(state.activeMark).logoId===lg.id;
     h+='<div class="pt2-lg'+(used?' on':'')+'" data-l="'+lg.id+'"><button type="button" class="rm" data-rm="'+lg.id+'">&times;</button><img src="'+logoThumb(lg)+'" alt=""/><span class="nm">'+lg.name+'</span></div>';});
   h+='</div>';libEl.innerHTML=h;
   [].forEach.call(libEl.querySelectorAll('.pt2-lg'),function(el){el.onclick=function(e){if(e.target.getAttribute('data-rm'))return;applyLogoToActive(el.getAttribute('data-l'));};});
   [].forEach.call(libEl.querySelectorAll('.rm'),function(bt){bt.onclick=function(e){e.stopPropagation();removeLogo(bt.getAttribute('data-rm'));};});
 }
 function applyLogoToActive(lid){
   if(useAll.checked){state.marks.forEach(function(m){m.logoId=lid;});}
   else if(state.activeMark){var m=logoMarkById(state.activeMark);if(m)m.logoId=lid;}
   else if(state.marks.length){state.marks[state.marks.length-1].logoId=lid;}
   syncAll();
 }
 function removeLogo(lid){state.logos=state.logos.filter(function(l){return l.id!==lid;});state.marks.forEach(function(m){if(m.logoId===lid)m.logoId=(state.logos[0]?state.logos[0].id:null);});syncAll();}

 /* ---- vues (Face / Dos / Manches) ---- */
 function usedViews(){var set={};state.marks.forEach(function(m){set[zoneObj(m.zone).view]=1;});var arr=VIEWS.filter(function(v){return set[v.k];});return arr.length?arr:[VIEWS[0]];}
 function renderViews(){
   var uv=usedViews();if(uv.length&&uv.map(function(v){return v.k;}).indexOf(state.view)<0)state.view=uv[0].k;
   var h='';uv.forEach(function(v){var cnt=state.marks.filter(function(m){return zoneObj(m.zone).view===v.k;}).length;
     h+='<button type="button" class="pt2-vw'+(v.k===state.view?' on':'')+'" data-v="'+v.k+'">'+T(v.lk)+(cnt>1?'<span class="cnt">'+cnt+'</span>':'')+'</button>';});
   viewsEl.innerHTML=h;
   [].forEach.call(viewsEl.querySelectorAll('.pt2-vw'),function(bt){bt.onclick=function(){state.view=bt.getAttribute('data-v');syncAll();};});
 }

 /* ---- mockup : tous les marks de la vue courante ---- */
 function renderStage(){
   mk.src=MOCK[state.view]||MOCK.face;
   [].forEach.call(stage.querySelectorAll('.pt2-mark'),function(e){e.remove();});
   state.marks.filter(function(m){return zoneObj(m.zone).view===state.view;}).forEach(function(m){
     var z=zoneObj(m.zone),lg=m.logoId?logoObj(m.logoId):null;
     var wrap=document.createElement('div');wrap.className='pt2-mark'+(m.id===state.activeMark?' on':'');
     wrap.style.top=z.box.t+'%';wrap.style.left=z.box.l+'%';wrap.style.width=z.box.w+'%';wrap.style.height=z.box.h+'%';
     wrap.setAttribute('data-m',m.id);
     var img=document.createElement('img');img.src=lg?logoThumb(lg):logoThumb({isVector:false});
     img.style.left=m.pos.x+'%';img.style.top=m.pos.y+'%';img.style.width=m.scale+'%';img.style.height='auto';
     var rz=document.createElement('div');rz.className='rz';
     var del=document.createElement('button');del.type='button';del.className='del';del.innerHTML='&times;';
     wrap.appendChild(img);wrap.appendChild(rz);wrap.appendChild(del);stage.appendChild(wrap);
     wrap.addEventListener('pointerdown',function(e){if(e.target===rz||e.target===del)return;state.activeMark=m.id;renderStage();renderLib();updateSizeRow();});
     del.addEventListener('click',function(e){e.stopPropagation();state.marks=state.marks.filter(function(x){return x!==m;});if(state.activeMark===m.id)state.activeMark=null;syncAll();});
     bindDrag(img,wrap,m);bindResize(rz,m);
   });
 }
 function bindDrag(img,wrap,m){var drag=false,start=null;
   img.addEventListener('pointerdown',function(e){drag=true;state.activeMark=m.id;start={x:e.clientX,y:e.clientY,px:m.pos.x,py:m.pos.y};try{img.setPointerCapture(e.pointerId);}catch(_){}e.preventDefault();e.stopPropagation();});
   img.addEventListener('pointermove',function(e){if(!drag)return;var r=wrap.getBoundingClientRect();var dx=(e.clientX-start.x)/r.width*100,dy=(e.clientY-start.y)/r.height*100;m.pos.x=Math.max(0,Math.min(100,start.px+dx));m.pos.y=Math.max(0,Math.min(100,start.py+dy));img.style.left=m.pos.x+'%';img.style.top=m.pos.y+'%';});
   function end(e){drag=false;try{img.releasePointerCapture(e.pointerId);}catch(_){}}
   img.addEventListener('pointerup',end);img.addEventListener('pointercancel',end);
 }
 function bindResize(rz,m){var res=false,start=null;
   rz.addEventListener('pointerdown',function(e){res=true;state.activeMark=m.id;start={x:e.clientX,s:m.scale};try{rz.setPointerCapture(e.pointerId);}catch(_){}e.preventDefault();e.stopPropagation();});
   rz.addEventListener('pointermove',function(e){if(!res)return;var d=(e.clientX-start.x)/2;m.scale=Math.max(20,Math.min(140,start.s+d));var img=rz.parentNode.querySelector('img');img.style.width=m.scale+'%';});
   function end(e){res=false;try{rz.releasePointerCapture(e.pointerId);}catch(_){}}
   rz.addEventListener('pointerup',end);rz.addEventListener('pointercancel',end);
 }

 /* ---- récap live (HT) ---- */
 function renderRecap(){
   var m=readMoq();var per=markPerPiece();var total=+(per*m.total).toFixed(2);
   var h='';
   if(isPay()){
     state.marks.forEach(function(mk2,i){var z=zoneObj(mk2.zone);var up=markUnitPrice(i,z);
       h+='<div class="pos"><span>'+T(z.labelKey)+(i>0?' · <span class="disc">'+T('disc_badge')+'</span>':'')+'</span><span>'+money(up)+' '+T('per_piece')+'</span></div>';});
     h+='<div class="row"><span>'+T('marking')+'</span><span>'+money(per)+' '+T('per_piece')+'</span></div>';
     h+='<div class="row"><span>'+T('total_marking')+' ('+m.total+' '+T('pieces')+')</span><span>'+money(total)+' HT</span></div>';
   } else if(state.technique){
     h+='<div class="pos"><span>'+T('marking')+'</span><span>'+T('on_quote')+'</span></div>';
   } else { h+='<div class="pos"><span>'+T('zones_hint')+'</span><span></span></div>'; }
   recapEl.innerHTML=h;
 }

 /* ---- steps + gating ---- */
 function contactVals(){return {name:(ov.querySelector('#pt2-cname')||{}).value||'',email:(ov.querySelector('#pt2-cemail')||{}).value||'',phone:(ov.querySelector('#pt2-cphone')||{}).value||''};}
 function contactValid(){var c=contactVals();return c.name.trim().length>1 && /.+@.+\..+/.test(c.email);}
 function allMarksHaveLogo(){return state.marks.length>0 && state.marks.every(function(m){return !!m.logoId;});}
 function updateSteps(){var done=[state.marks.length>0,allMarksHaveLogo(),!!state.technique,!!(state.bat&&state.marks.length&&allMarksHaveLogo()&&state.technique)];
   var steps=ov.querySelectorAll('#pt2-steps .stp');var cur=false;
   [].forEach.call(steps,function(el,i){el.classList.toggle('done',done[i]);el.classList.remove('on');if(!done[i]&&!cur){el.classList.add('on');cur=true;}});
   if(!cur&&steps[3])steps[3].classList.add('on');}
 function recompute(){
   var m=readMoq();var moqOk=m.total>=MOQ;var colorOk=(m.color!==null);
   var moqEl=ov.querySelector('#pt2-moq');moqEl.className='pt2-moq '+((moqOk&&colorOk)?'ok':'ko');
   moqEl.innerHTML=T('moq_sel')+' : <b>'+m.total+'</b> / '+MOQ+' '+T('minimum')+(colorOk?'':' — '+T('pick_color'))+((m.total<MOQ)?' — '+T('complete'):'');
   var t=state.technique?techObj(state.technique):null;
   var base=!!(state.marks.length&&state.technique&&allMarksHaveLogo()&&state.bat&&moqOk&&colorOk);
   var ok=base&&(!t||t.mode!=='devis'||contactValid());
   ctaBtn.disabled=!ok;updateSteps();
 }
 function syncAll(){[].forEach.call(zc.children,function(c){c.classList.toggle('on',!!markForZone(c.getAttribute('data-k')));});refreshZonePrices();renderViews();renderStage();renderLib();renderRecap();updateSizeRow();recompute();}
 function updateSizeRow(){var am=state.activeMark?logoMarkById(state.activeMark):null;if(am&&am.logoId){sizeRow.style.display='flex';scaleInput.value=am.scale;}else{sizeRow.style.display='none';}}

 ov.querySelector('#pt2-bat').onchange=function(e){state.bat=e.target.checked;recompute();};
 ['#pt2-cname','#pt2-cemail','#pt2-cphone'].forEach(function(sel){ov.querySelector(sel).addEventListener('input',recompute);});

 /* ===================== panier / Odoo ===================== */
 function genRef(){return 'PT-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);}
 function sizeStr(m){return Object.keys(m.sizes).map(function(s){return s+'×'+m.sizes[s];}).join(' ');}
 function zoneName(zk){return T(zoneObj(zk).labelKey);}
 function markLabel(zk){return 'Marquage DTF — '+zoneName(zk);}
 function recapText(m,t){
   var zones=state.marks.map(function(mk2,i){var z=zoneObj(mk2.zone);var lg=logoObj(mk2.logoId);return z && (T(z.labelKey)+(lg?(' ['+lg.name+']'):'')+(t.mode==='pay'?(' '+money(markUnitPrice(i,z))+(i>0?'/-20%':'')):''));}).filter(Boolean).join(' + ');
   return PNAME+' | '+zones+' · '+t.label+' · couleur '+(m.color==='__'?'unique':m.color)+' · '+sizeStr(m)+' (total '+m.total+') · réf '+state.ref+' · Aperçu indicatif — BAT final avant production';
 }
 function csrf(){return csrfTok();}
 function persistLogos(){ // 1 x_zone_file par logo unique effectivement utilisé
   var used={};state.marks.forEach(function(m){if(m.logoId)used[m.logoId]=1;});
   var ids=Object.keys(used);var ref=genRef();state.ref=ref;var seq=Promise.resolve();
   ids.forEach(function(lid,idx){var lg=logoObj(lid);if(!lg)return;seq=seq.then(function(){
     var zonesForLogo=state.marks.filter(function(m){return m.logoId===lid;}).map(function(m){return m.zone;}).join(',');
     var fd=new FormData();fd.append('csrf_token',csrf());fd.append('x_name',PNAME+' | '+lg.name+' | zones:'+zonesForLogo+' | réf '+ref);fd.append('x_zone',zonesForLogo);fd.append('x_tech',state.technique);fd.append('x_ref',ref+'-'+idx);fd.append('x_filename',lg.name);fd.append('x_file',lg.file,lg.name);
     return fetch('/website/form/x_zone_file',{method:'POST',body:fd}).then(function(r){return r.json();}).then(function(j){if(!j||!j.id)throw new Error('logo');return j;});
   });});
   return seq.then(function(){return ref;});
 }
 function cartAdd(params){return fetch('/shop/cart/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',method:'call',params:params})}).then(function(r){return r.json();}).then(function(j){if(j.error)throw new Error(j.error.data?j.error.data.message:'add');return j.result;});}
 function cartUpdate(lid,pid,qty){return fetch('/shop/cart/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',method:'call',params:{line_id:lid,product_id:pid,quantity:qty}})}).then(function(r){return r.json();});}
 function cartLines(){return fetch('/shop/cart').then(function(r){return r.text();}).then(function(h){var pairs=[],chunks=h.split('o_cart_product');for(var i=1;i<chunks.length;i++){var c=chunks[i];var pm=c.match(/data-product-id=["']?(\d+)/);var lm=c.match(/data-line-id=["']?(\d+)/);if(lm)pairs.push({pid:pm?parseInt(pm[1]):0,lid:parseInt(lm[1])});}return pairs;});}

 // GA4 : add_to_cart, value HT INCLUANT le marquage
 function ga4Add(m,textilePerPiece){try{
   if(typeof window.gtag!=='function' && !window.dataLayer)return;
   var markTotal=+(markPerPiece()*m.total).toFixed(2);
   var textileTotal=+(((textilePerPiece||0))*m.total).toFixed(2);
   var value=+(markTotal+textileTotal).toFixed(2);
   var items=[{item_id:'TMPL-'+TMPL,item_name:PNAME,quantity:m.total,price:textilePerPiece||0}];
   state.marks.forEach(function(mk2,i){var z=zoneObj(mk2.zone);items.push({item_id:'MARK-'+mk2.zone,item_name:markLabel(mk2.zone),quantity:m.total,price:markUnitPrice(i,z)});});
   var payload={currency:'EUR',value:value,items:items};
   if(typeof window.gtag==='function')window.gtag('event','add_to_cart',payload);
   else{window.dataLayer=window.dataLayer||[];window.dataLayer.push(Object.assign({event:'add_to_cart'},payload));}
 }catch(e){}}

 function doPay(m,t){
   return persistLogos().then(function(){return cartLines();}).then(function(before){
     var beforeIds=before.map(function(p){return p.lid;});
     var seq=Promise.resolve();
     // 1) lignes vêtement par taille (qty = répartition ; modèle 1 ligne/taille)
     Object.keys(m.sizes).forEach(function(s){seq=seq.then(function(){var vid=m.vmap[m.color]&&m.vmap[m.color][s];if(!vid)throw new Error('variante '+s);return cartAdd({product_template_id:TMPL,product_id:vid,quantity:m.sizes[s]});});});
     // 2) UNE ligne marquage PAR POSITION (variante plein/réduit selon rang), label "Marquage DTF — <zone>"
     state.marks.forEach(function(mk2,i){seq=seq.then(function(){
       var z=zoneObj(mk2.zone);var vr=(i===0?MK[z.size].full:MK[z.size].disc);
       if(!vr||!vr.variant)throw new Error('variante marquage '+z.size+(i>0?' (-20%)':''));
       var params={product_template_id:vr.tmpl,product_id:vr.variant,quantity:m.total};
       if(MK.label_ptav)params.product_custom_attribute_values=[{custom_product_template_attribute_value_id:MK.label_ptav,custom_value:markLabel(mk2.zone)}];
       return cartAdd(params);
     });});
     // 3) ligne RECAP (récap complet lisible atelier)
     seq=seq.then(function(){return cartAdd({product_template_id:RECAP.tmpl,product_id:RECAP.variant,quantity:1,product_custom_attribute_values:[{custom_product_template_attribute_value_id:RECAP.ptav,custom_value:recapText(m,t)}]});});
     return seq.then(function(){ga4Add(m,0);location.href=langPfx()+'/shop/cart';return {paid:true};}).catch(function(e){
       return cartLines().then(function(after){var news=after.filter(function(p){return beforeIds.indexOf(p.lid)<0;});var rb=Promise.resolve();news.forEach(function(p){rb=rb.then(function(){return cartUpdate(p.lid,p.pid,0).catch(function(){});});});return rb.then(function(){throw e;});});
     });
   });
 }
 function doDevis(m,t){
   var c=contactVals();
   return persistLogos().then(function(){
     var fd=new FormData();fd.append('csrf_token',csrf());fd.append('name','Demande de devis personnalisation — '+PNAME);fd.append('contact_name',c.name);fd.append('email_from',c.email);fd.append('phone',c.phone);fd.append('description',recapText(m,t)+'\nContact : '+c.name+' / '+c.email+' / '+c.phone+'\nRéf. logos (x_zone_file) : '+state.ref);
     return fetch('/website/form/crm.lead',{method:'POST',body:fd}).then(function(r){return r.json();}).then(function(j){if(!j||!j.id)throw new Error('devis');return {leadId:j.id,ref:state.ref};});
   });
 }
 function showConfirm(title,numLabel,num,extra){var w=ov.querySelector('#pt2-confirm-wrap');ov.querySelector('#pt2-main').style.display='none';w.innerHTML='<div class="pt2-confirm"><h3>'+title+'</h3>'+(num?('<div class="num">'+numLabel+' '+num+'</div>'):'')+'<p style="color:#555;font-size:13px;max-width:460px;margin:0 auto 6px">'+extra+'</p><div><a class="y" href="'+langPfx()+'/textile">'+T('see_other')+'</a><a href="'+langPfx()+'/shop">'+T('back_shop')+'</a></div></div>';}

 var busy=false;
 ctaBtn.addEventListener('click',function(){
   if(ctaBtn.disabled||busy)return;
   var m=readMoq(),t=techObj(state.technique);
   if(!state.marks.length||!t||!allMarksHaveLogo()||!state.bat||m.total<MOQ||!m.color){recompute();return;}
   if(t.mode==='devis'&&!contactValid()){recompute();return;}
   busy=true;ctaBtn.disabled=true;var old=ctaBtn.textContent;ctaBtn.textContent=T('processing');
   var p=(t.mode==='pay')?doPay(m,t):doDevis(m,t);
   p.then(function(r){
     if(t.mode==='devis'){showConfirm(T('devis_ok'),'N°',r.leadId,T('devis_ok_txt').replace('%r',r.ref));}
   }).catch(function(e){
     busy=false;ctaBtn.disabled=false;ctaBtn.textContent=old;
     if(window.console)console.warn('PT2 doPay error',e);
     doneEl.style.display='block';doneEl.style.background='#fdecec';doneEl.style.borderColor='#c0392b';doneEl.style.color='#7a1f16';
     doneEl.innerHTML=T('err').replace('%w',t.mode==='pay'?'panier':'devis');
   });
 });

 /* ===================== open / close / gate ===================== */
 function orderedColor(){var m=readMoq();return m.color&&m.color!=='__'?m.color:null;}
 function openModal(){if(open.disabled)return;var col=orderedColor();ov.querySelector('#pt2-color').innerHTML=col?(T('color_ordered')+' <b>'+col+'</b> &nbsp;<small>· '+T('preview_white')+'</small>'):'<small>'+T('preview_white')+'</small>';ov.classList.add('on');document.body.style.overflow='hidden';if(!state.marks.length)toggleZone('poitrine');else syncAll();}
 function closeModal(){ov.classList.remove('on');document.body.style.overflow='';}
 open.addEventListener('click',openModal);
 function recomputeGate(){var tot=readMoq().total;open.disabled=(tot<MOQ);if(tot>=MOQ){gate.classList.remove('show');}else{gate.classList.add('show');var miss=MOQ-tot;gate.textContent=T('gate').replace('%n',miss).replace('%s',miss>1?(LANG==='fr'?'s':(LANG==='es'?'s':'s')):'');}}
 document.body.addEventListener('input',function(e){if(e.target&&e.target.closest&&e.target.closest('#moq-grid'))setTimeout(recomputeGate,20);},true);
 document.body.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('#moq-grid'))setTimeout(recomputeGate,45);},true);
 recomputeGate();
 ov.querySelector('.pt2-x').addEventListener('click',closeModal);
 ov.addEventListener('click',function(e){if(e.target===ov)closeModal();});
 document.addEventListener('keydown',function(e){if(e.key==='Escape'&&ov.classList.contains('on'))closeModal();});

}catch(err){if(window.console)console.warn('PT2 error',err);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
