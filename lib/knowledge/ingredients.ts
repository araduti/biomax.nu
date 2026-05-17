import { slugify } from "@/lib/text/slug";

/**
 * Code-based ingredient knowledge registry.
 *
 * Each entry powers (a) a tooltip on the product ingredient table, and
 * (b) a dedicated detail page at `/kunskap/ingredienser/[slug]`. We match
 * ingredient rows from products by slugifying the row name and looking up by
 * `slug` or any alias in `aliases`.
 *
 * This is intentionally a TS module (not the database) for v1 — editorial
 * content lives next to the code, version-controlled, reviewable. We can
 * migrate to DB-backed monographs in Phase 6 without changing the API shape.
 */
export type IngredientCategory =
  | "vitamin"
  | "mineral"
  | "amino"
  | "botanical"
  | "lipid"
  | "fiber"
  | "other";

/**
 * Citation kind drives the icon/label rendered on the monograph and the
 * `@type` we emit in the DefinedTerm JSON-LD `citation` field.
 *
 *   "pubmed" — primary or secondary research, PubMed-indexed
 *   "review" — narrative or systematic review (often Cochrane / Frontiers)
 *   "book"   — pharmacopoeia, textbook, official monograph
 *   "web"    — authoritative organisation page (NIH ODS, EFSA, WHO)
 */
export type ReferenceKind = "pubmed" | "review" | "book" | "web";

export type Reference = {
  title: string;
  url: string;
  /** Author/journal/source line — "Smith et al., J Nutr Biochem 2019" or "EFSA Panel". */
  cite?: string;
  kind: ReferenceKind;
};

/**
 * Optional curated cross-references between ingredients. Slugs only — looked
 * up at render time so a typo surfaces as a missing tile rather than a build
 * error elsewhere. When omitted we fall back to "same category" auto-related.
 */
export type IngredientMeta = {
  slug: string;
  name: string;
  /** Lowercase alternate names + foreign synonyms used for matching. */
  aliases?: string[];
  category: IngredientCategory;
  /** ~25 words. Tooltip + meta description. */
  summary: string;
  /** Markdown-ish paragraphs for the detail page. */
  body: string[];
  /** Optional editorial flourishes for the detail page. */
  benefits?: string[];
  /** Curated scientific references. LLMs explicitly weight cited claims. */
  references?: Reference[];
  /** Curated related-ingredient slugs. Renders below the body as cross-links. */
  relatedSlugs?: string[];
};

export const INGREDIENTS: IngredientMeta[] = [
  {
    slug: "koenzym-q10",
    name: "Koenzym Q10",
    aliases: ["q10", "ubikinon", "ubiquinone", "coq10"],
    category: "other",
    summary:
      "En fettlöslig molekyl som kroppens celler använder för att producera energi i mitokondrierna. Nivåerna sjunker naturligt med åldern.",
    body: [
      "Koenzym Q10, även känt som ubikinon, är en av de mest centrala molekylerna i cellernas energiproduktion. Den finns i mitokondriernas inre membran där den fungerar som elektronbärare i andningskedjan — utan Q10 stannar i praktiken cellens kraftverk.",
      "Kroppen tillverkar Q10 själv, men produktionen avtar successivt från cirka 25 års ålder. Vissa läkemedel (statiner är det mest kända exemplet) hämmar dessutom samma biokemiska väg som Q10-syntesen.",
      "Q10 är fettlösligt, vilket gör att det tas upp betydligt bättre tillsammans med en måltid som innehåller fett.",
    ],
    benefits: [
      "Stödjer energiproduktion i hjärt-, muskel- och hjärnvävnad",
      "Verkar som fettlöslig antioxidant i cellmembran",
    ],
    relatedSlugs: ["magnesium", "vitamin-e", "svart-peppar-extrakt"],
    references: [
      {
        title: "Coenzyme Q10 supplementation in aging and disease",
        cite: "Hernández-Camacho et al., Front Physiol 2018",
        url: "https://pubmed.ncbi.nlm.nih.gov/29459830/",
        kind: "pubmed",
      },
      {
        title: "Coenzyme Q10 — Health Professional Fact Sheet",
        cite: "NIH Office of Dietary Supplements",
        url: "https://ods.od.nih.gov/factsheets/CoenzymeQ10-HealthProfessional/",
        kind: "web",
      },
    ],
  },
  {
    slug: "beta-glucan",
    name: "Beta-1,3/1,6-glukan",
    aliases: [
      "beta glucan",
      "betaglukan",
      "beta-glukan",
      "beta 1,3/1,6 glucan",
      "beta-1,3/1,6-glukan",
      "beta 1,3/1,6 glucan (från jäst)",
    ],
    category: "fiber",
    summary:
      "En naturligt förekommande polysackarid utvunnen ur jästceller, havre eller svamp. Studeras för sin roll i immunförsvarets första linje.",
    body: [
      "Beta-glukaner är fibrer uppbyggda av glukosmolekyler länkade i specifika 1,3- och 1,6-strukturer. Just denna molekylkonfiguration känns igen av receptorer på vita blodkroppar (Dectin-1, complement receptor 3) och tolkas av immunsystemet som en möjlig mikroorganism — vilket aktiverar det medfödda försvaret.",
      "Den variant som används i kosttillskott kommer oftast från jästcellsväggen Saccharomyces cerevisiae. Beta-glukaner är inte upptagsbara i mag-tarmkanalen som energi, utan interagerar med immunceller i tarmens slemhinna.",
    ],
    benefits: [
      "Aktiverar makrofager och naturliga mördarceller",
      "Studerad för immunmodulerande effekt vid säsongsbelastningar",
    ],
    relatedSlugs: ["natriumaskorbat", "vitamin-a"],
    references: [
      {
        title: "Yeast (1→3)-(1→6)-β-glucan and immune function: a systematic review",
        cite: "Stier et al., Nutr J 2014",
        url: "https://pubmed.ncbi.nlm.nih.gov/24405607/",
        kind: "review",
      },
      {
        title: "Dectin-1 receptor and recognition of β-glucan",
        cite: "Brown & Gordon, Nature 2001",
        url: "https://pubmed.ncbi.nlm.nih.gov/11557969/",
        kind: "pubmed",
      },
    ],
  },
  {
    slug: "acetyl-l-karnitin",
    name: "Acetyl-L-karnitin (ALCAR)",
    aliases: ["alcar", "acetyl l-carnitine", "acetyl-l-carnitine", "acetylkarnitin"],
    category: "amino",
    summary:
      "En acetylerad form av aminosyran karnitin. Passerar blod-hjärnbarriären och deltar i transporten av fettsyror till mitokondrierna.",
    body: [
      "Karnitin är en aminosyralik förening som främst tillverkas i levern och njurarna från lysin och metionin. Dess huvuduppgift är att bära långa fettsyror in i mitokondrierna där de oxideras för energi.",
      "Den acetylerade formen, acetyl-L-karnitin, har en extra acetylgrupp som gör molekylen mer fettlöslig — den passerar därför blod-hjärnbarriären lättare än vanlig L-karnitin och bidrar dessutom med acetylgrupper till syntesen av neurotransmittorn acetylkolin.",
    ],
    benefits: [
      "Stödjer mitokondriell fettsyraoxidation",
      "Bidrar med byggsten till acetylkolin-syntes",
    ],
    relatedSlugs: ["koenzym-q10", "l-lysin", "vitamin-b6"],
    references: [
      {
        title: "Carnitine — Health Professional Fact Sheet",
        cite: "NIH Office of Dietary Supplements",
        url: "https://ods.od.nih.gov/factsheets/Carnitine-HealthProfessional/",
        kind: "web",
      },
    ],
  },
  {
    slug: "olivbladextrakt",
    name: "Olivbladextrakt",
    aliases: [
      "olivblad-extrakt",
      "olivblad extrakt",
      "olive leaf extract",
      "olea europaea",
      "oleuropein",
    ],
    category: "botanical",
    summary:
      "Standardiserat extrakt från bladen av olivträdet (Olea europaea). Innehåller den polyfenoliska huvudkomponenten oleuropein.",
    body: [
      "Olivbladet har använts kring Medelhavet i tusentals år. Den aktiva komponent som forskningen koncentrerat sig på är oleuropein — en bitter polyfenol som också finns i mindre mängd i extra virgin olivolja.",
      "Standardiserade olivbladextrakt anges ofta efter sin oleuropein-halt i procent. Oleuropein bryts ned i kroppen till hydroxytyrosol, en av de mest potenta antioxidanterna man känner till från växtriket.",
    ],
    benefits: [
      "Källa till polyfenolen oleuropein",
      "Studerad för effekt på blodkärl och oxidativ stress",
    ],
    relatedSlugs: ["boswellia", "natriumaskorbat"],
    references: [
      {
        title: "Antihypertensive and antiatherogenic effects of olive leaf extract: a review",
        cite: "Susalit et al., Phytomedicine 2011",
        url: "https://pubmed.ncbi.nlm.nih.gov/21036583/",
        kind: "review",
      },
      {
        title: "Oleuropein and its antioxidant effects",
        cite: "Visioli et al., J Nutr Biochem 2002",
        url: "https://pubmed.ncbi.nlm.nih.gov/12550068/",
        kind: "pubmed",
      },
    ],
  },
  {
    slug: "boswellia",
    name: "Boswellia serrata",
    aliases: [
      "boswellia",
      "boswellia serrata",
      "boswellia-extrakt",
      "boswellia extrakt",
      "indisk rökelse",
      "frankincense",
    ],
    category: "botanical",
    summary:
      "Hartset från det indiska rökelseträdet. Standardiseras vanligen till 65 % boswellinsyror — molekyler som studerats för sin verkan på inflammatoriska enzym.",
    body: [
      "Boswellia serrata, även kallat indisk rökelse, är ett trädharts som använts i ayurvedisk medicin i över tvåtusen år. Den moderna forskningen har isolerat fyra primära boswellinsyror, av vilka acetyl-11-keto-β-boswellinsyra (AKBA) anses vara den mest aktiva.",
      "Till skillnad från klassiska antiinflammatoriska medel som hämmar cyklooxygenas verkar boswellinsyrorna selektivt på 5-lipoxygenas (5-LOX), en helt annan enzymväg som producerar leukotriener.",
    ],
    benefits: [
      "Standardiserad källa till boswellinsyror",
      "Studerad för leder och rörlighet",
    ],
    relatedSlugs: ["olivbladextrakt", "kycklingkollagen-typ-ii"],
    references: [
      {
        title: "Effects of Boswellia serrata in osteoarthritis: a systematic review and meta-analysis",
        cite: "Yu et al., BMC Complement Med Ther 2020",
        url: "https://pubmed.ncbi.nlm.nih.gov/32762751/",
        kind: "review",
      },
      {
        title: "Boswellic acids and 5-lipoxygenase inhibition",
        cite: "Ammon, Phytomedicine 2010",
        url: "https://pubmed.ncbi.nlm.nih.gov/20696559/",
        kind: "pubmed",
      },
    ],
  },
  {
    slug: "fenylalanin",
    name: "L-fenylalanin",
    aliases: ["phenylalanine", "fenylalanin"],
    category: "amino",
    summary:
      "En essentiell aminosyra som kroppen inte kan tillverka själv. Förstadium till tyrosin, dopamin och noradrenalin.",
    body: [
      "Fenylalanin är en av de nio essentiella aminosyrorna — vi måste få i oss den via kosten. I kroppen omvandlas L-fenylalanin till L-tyrosin, som i sin tur är råvaran till de katekolamina signalsubstanserna dopamin, noradrenalin och adrenalin.",
      "Eftersom fenylalanin används som råvara i hjärnans neurotransmittorsyntes är intaget tillsammans med andra större neutrala aminosyror relevant — de konkurrerar om samma transportör över blod-hjärnbarriären.",
    ],
    relatedSlugs: ["l-tyrosin", "griffonia", "vitamin-b6"],
  },
  {
    slug: "l-tyrosin",
    name: "L-tyrosin",
    aliases: ["tyrosin", "tyrosine", "l-tyrosine"],
    category: "amino",
    summary:
      "Aminosyra som kroppen kan bilda från fenylalanin. Direktförstadium till sköldkörtelhormon och katekolaminer.",
    body: [
      "L-tyrosin tillverkas i levern genom hydroxylering av fenylalanin. Det är en aminosyra som är direkt nödvändig för tillverkning av dopamin, noradrenalin och adrenalin samt sköldkörtelhormonerna T3 och T4.",
      "Vid stress och hög aktivitet i sympatiska nervsystemet ökar förbrukningen av tyrosin snabbare än kroppens egen syntes hinner kompensera, vilket är en del av motiveringen till tyrosin som tillskott vid mental belastning.",
    ],
    relatedSlugs: ["fenylalanin", "vitamin-b6", "griffonia"],
  },
  {
    slug: "glutamin",
    name: "L-glutamin",
    aliases: ["glutamine", "l-glutamine", "glutamin"],
    category: "amino",
    summary:
      "Den vanligaste fria aminosyran i blodet. Bränsle för tarmens slemhinneceller och immunförsvarets snabbväxande celler.",
    body: [
      "Glutamin är teknisk sett villkorligt essentiell — kroppen tillverkar den, men under stress, infektion eller kraftig fysisk belastning förbrukas den snabbare än den hinner produceras.",
      "Tarmens enterocyter använder glutamin som primär energikälla, vilket gjort aminosyran central i forskningen kring tarmhälsa och slemhinneintegritet.",
    ],
    relatedSlugs: ["glycin", "l-arginin", "l-prolin"],
  },
  {
    slug: "kalcium",
    name: "Kalcium",
    aliases: ["calcium", "ca"],
    category: "mineral",
    summary:
      "Det mineral kroppen innehåller mest av. Bygger benstommen, men spelar också nyckelroller i muskelkontraktion och nervsignalering.",
    body: [
      "Cirka 99 % av kroppens kalcium finns i skelett och tänder, där det är inbyggt som hydroxiapatit. Den lilla återstående procenten cirkulerar i blod och vävnader och är livsnödvändig — den styr muskelkontraktion, nervimpulser och blodkoagulation.",
      "Upptaget av kalcium från tarmen är D-vitamin-beroende. Vid otillräcklig D-vitamin-status sjunker absorptionseffektiviteten markant, vilket är en anledning till att de två näringsämnena ofta diskuteras tillsammans.",
    ],
    relatedSlugs: ["magnesium", "korall-kalcium", "k3-vitamin"],
    references: [
      {
        title: "Calcium — Health Professional Fact Sheet",
        cite: "NIH Office of Dietary Supplements",
        url: "https://ods.od.nih.gov/factsheets/Calcium-HealthProfessional/",
        kind: "web",
      },
    ],
  },
  {
    slug: "magnesium",
    name: "Magnesium",
    aliases: ["mg"],
    category: "mineral",
    summary:
      "En kofaktor i fler än 300 enzymsystem i kroppen. Avgörande för energimetabolism, muskelfunktion och nervsignalering.",
    body: [
      "Magnesium är inblandat i nästan varje process som omsätter ATP — kroppens energimolekyl. Det är också nödvändigt för att muskelceller ska kunna slappna av efter en kontraktion, vilket gjort mineralet centralt i diskussionen kring kramper och muskeltrötthet.",
      "Olika magnesiumformer absorberas olika väl: bisglycinat, citrat och malat har generellt bättre biotillgänglighet än oxidformen.",
    ],
    relatedSlugs: ["kalcium", "glycin", "vitamin-b6"],
    references: [
      {
        title: "Magnesium — Health Professional Fact Sheet",
        cite: "NIH Office of Dietary Supplements",
        url: "https://ods.od.nih.gov/factsheets/Magnesium-HealthProfessional/",
        kind: "web",
      },
    ],
  },
  {
    slug: "glycin",
    name: "Glycin",
    aliases: ["glycine"],
    category: "amino",
    summary:
      "Den minsta aminosyran. Inhibitorisk neurotransmittor i ryggmärgen och en av tre byggstenar i tripeptiden glutation.",
    body: [
      "Glycin är så enkel i sin kemiska struktur att den ibland inte ens räknas som en 'riktig' aminosyra — den saknar en sidokedja. Trots det har den specialiserade roller: i ryggmärgen och hjärnstammen verkar den som en hämmande signalsubstans, och tillsammans med cystein och glutamat bygger den glutation, kroppens viktigaste endogena antioxidant.",
    ],
    relatedSlugs: ["l-prolin", "magnesium", "kasein-hydrolysat"],
  },
  {
    slug: "kasein-hydrolysat",
    name: "Kasein-hydrolysat (Lactium®)",
    aliases: ["lactium", "kasein hydrolysat", "casein hydrolysate", "α-casozepine"],
    category: "other",
    summary:
      "Bioaktivt peptidextrakt från komjölksprotein. Den verksamma fraktionen, α-kasozepin, är en dekapeptid som studerats för sin lugnande effekt.",
    body: [
      "Lactium® är ett patenterat hydrolysat av α-kasein där den aktiva fraktionen, α-kasozepin, frigörs genom enzymatisk klyvning. Peptiden upptäcktes ursprungligen vid forskning på varför mjölkmatade nyfödda barn somnar lättare.",
      "Studier har undersökt α-kasozepins affinitet till GABA-A-receptorn — samma receptorsystem som klassiska anxiolytika, men med en fundamentalt mildare och icke-beroendeframkallande profil.",
    ],
    relatedSlugs: ["griffonia", "magnesium", "glycin"],
    references: [
      {
        title: "Effects of a tryptic hydrolysate from bovine milk αS1-casein on hemodynamic responses in healthy human volunteers",
        cite: "Messaoudi et al., Eur J Clin Nutr 2005",
        url: "https://pubmed.ncbi.nlm.nih.gov/15735581/",
        kind: "pubmed",
      },
      {
        title: "An anxiolytic-like activity of milk αS1-casein hydrolysate (Lactium®) in stressed rats",
        cite: "Miclo et al., FASEB J 2007",
        url: "https://pubmed.ncbi.nlm.nih.gov/17341687/",
        kind: "pubmed",
      },
    ],
  },
  {
    slug: "bjorkglukos",
    name: "Björkglukos (xylitol)",
    aliases: ["xylitol", "björkglukos", "björk-glukos", "björk glukos"],
    category: "other",
    summary:
      "Naturlig sockeralkohol med samma sötma som vanligt socker men 40 % färre kalorier. Påverkar inte tandemaljen.",
    body: [
      "Xylitol förekommer naturligt i björkbark, majskolvar och en rad frukter. Strukturellt är det en pentitol — en alkoholform av en femkolssocker — vilket gör att munnens kariesbakterier inte kan metabolisera det till syra.",
      "Glykemiskt index för xylitol är cirka 7 (jämfört med 65 för vanligt socker), vilket gör att blodsockret påverkas minimalt.",
    ],
    benefits: [
      "Sötningsmedel som inte ger karies",
      "Lågt glykemiskt index",
    ],
    relatedSlugs: ["stevia", "kalcium", "magnesium"],
  },
  {
    slug: "kycklingkollagen-typ-ii",
    name: "Kycklingkollagen typ II",
    aliases: [
      "kyckling collagen ii",
      "chicken collagen type ii",
      "uc-ii",
      "kollagen typ ii",
      "hydrolyserat kycklingkollagen",
    ],
    category: "other",
    summary:
      "Hydrolyserat kollagen från kycklingbrosk. Typ II-kollagen är den dominerande proteinformen i ledbrosk.",
    body: [
      "I kroppens leder utgör typ II-kollagen cirka 90 % av broskets proteinmassa. Hydrolyserad form (peptider på 3–6 kDa) har förbättrat upptag jämfört med intakt kollagen och studeras för sin förmåga att leverera byggstenar till broskvävnad.",
      "Kycklingkollagen typ II tillverkas oftast av brosket vid bröstbenet (sternum), där typ II-andelen är hög och föroreningar av andra kollagentyper låg.",
    ],
    relatedSlugs: ["boswellia", "l-prolin", "natriumaskorbat"],
  },
  {
    slug: "natriumaskorbat",
    name: "Natriumaskorbat (C-vitamin)",
    aliases: [
      "sodium ascorbate",
      "askorbat",
      "vitamin c",
      "c-vitamin",
      "ascorbic acid",
      "askorbinsyra",
      "vitamin c as ascorbic acid",
    ],
    category: "vitamin",
    summary:
      "En buffrad form av C-vitamin. Mildare för magslemhinnan än askorbinsyra, samma biotillgänglighet av aktivt askorbat.",
    body: [
      "Vanlig askorbinsyra har ett pH runt 2 — lika surt som magsaft — vilket kan irritera magslemhinnan vid större doser. Natriumaskorbat är en saltform där askorbinsyran neutraliserats med natrium, vilket ger en mineralbuffrad form med pH runt 7.",
      "Per gram natriumaskorbat får man cirka 89 % rent askorbat och 11 % natrium.",
    ],
    relatedSlugs: ["beta-glucan", "olivbladextrakt", "vitamin-e"],
    references: [
      {
        title: "Vitamin C — Health Professional Fact Sheet",
        cite: "NIH Office of Dietary Supplements",
        url: "https://ods.od.nih.gov/factsheets/VitaminC-HealthProfessional/",
        kind: "web",
      },
    ],
  },
  {
    slug: "k3-vitamin",
    name: "K3-vitamin (menadion)",
    aliases: ["menadione", "menadion", "vitamin k3", "k3-vitamin", "k3 vitamin"],
    category: "vitamin",
    summary:
      "Syntetisk K-vitamin-prekursor. Konverteras i kroppen till de aktiva formerna K2 (MK-4) och K3-relaterade kinoner.",
    body: [
      "Menadion är en syntetisk fettlöslig kinon som kroppen kan alkylera till menakinon-4 (MK-4) — en av de aktiva K2-formerna. Klassiskt har det använts inom djurfoder och i vissa terapeutiska sammanhang.",
    ],
    relatedSlugs: ["kalcium", "vitamin-a", "vitamin-e"],
  },
  {
    slug: "korall-kalcium",
    name: "Korall-kalcium",
    aliases: ["coral calcium", "okinawa coral", "korallkalcium"],
    category: "mineral",
    summary:
      "Kalcium från fossiliserade korallrev runt Okinawa. Innehåller naturligt magnesium i 2:1-förhållande till kalcium.",
    body: [
      "Korallkalcium utvinns från sediment av fossiliserade korallrev och tas inte från levande koraller. Mineralprofilen, framför allt 2:1-förhållandet kalcium-magnesium, är ett resultat av havets ursprungliga sammansättning.",
    ],
    relatedSlugs: ["kalcium", "magnesium", "k3-vitamin"],
  },
  {
    slug: "aloe-vera",
    name: "Aloe",
    aliases: [
      "aloe",
      "aloe vera",
      "aloe vera-extrakt",
      "aloeblad",
      "aloe-blad",
      "aloe barbadensis",
      "aloe ferox",
      "cape aloe",
    ],
    category: "botanical",
    summary:
      "Saftrik suckulent från ökenklimat. Bladets innergel innehåller polysackariden acemannan tillsammans med en rad enzymer och sekundära metaboliter.",
    body: [
      "Aloe odlas som medicinalväxt i tropiska och subtropiska delar av världen. De två arter som vanligast används i kosttillskott är Aloe barbadensis (den klassiska aloe veran) och Aloe ferox (sydafrikansk kap-aloe). De delar samma grundsammansättning, men ferox ger ett bittrare och mer koncentrerat extrakt.",
      "Bladets gulbruna yttre lager (latex) skiljer sig kraftigt från den klara innergelen. Extrakt som är avsedda som kosttillskott baseras nästan uteslutande på innergelen, eftersom de antrakinoner som finns i latexen kan ha en laxerande verkan.",
    ],
    relatedSlugs: ["slemalm", "olivbladextrakt", "boswellia", "stevia"],
    references: [
      {
        title: "Aloe Vera",
        cite: "NCCIH — National Center for Complementary and Integrative Health",
        url: "https://www.nccih.nih.gov/health/aloe-vera",
        kind: "web",
      },
    ],
  },
  {
    slug: "griffonia",
    name: "Griffonia simplicifolia",
    aliases: ["griffonia", "5-htp", "5-hydroxytryptophan"],
    category: "botanical",
    summary:
      "Västafrikansk klätterväxt vars frön är en naturlig källa till 5-HTP — ett direkt förstadium till signalsubstansen serotonin.",
    body: [
      "Griffonia simplicifolia är en lian som växer i Västafrika. Fröet innehåller naturligt cirka 20 % 5-hydroxitryptofan (5-HTP), en aminosyra som kroppen använder som ett av två steg på vägen från tryptofan till serotonin — och vidare till melatonin.",
      "Eftersom 5-HTP redan har passerat det hastighetsbegränsande enzymet i serotoninsyntesen tas substansen oftare upp och konverteras direkt, jämfört med ren tryptofan.",
    ],
    relatedSlugs: ["kasein-hydrolysat", "l-tyrosin", "fenylalanin"],
  },
  {
    slug: "l-arginin",
    name: "L-arginin",
    aliases: ["arginine", "l-arginine", "arginin"],
    category: "amino",
    summary:
      "Halvessentiell aminosyra och förstadium till kvävemonoxid (NO) — en signalmolekyl som vidgar blodkärl.",
    body: [
      "L-arginin omvandlas av enzymet kvävemonoxidsyntas (NOS) till kvävemonoxid, en gasformig signalmolekyl som diffunderar genom cellmembran och får glatt muskulatur i blodkärlsväggen att slappna av — vilket sänker det vaskulära motståndet.",
      "Kroppen syntetiserar arginin från citrullin, men vid hög belastning kan tillförsel via kost eller tillskott vara avgörande.",
    ],
    relatedSlugs: ["koenzym-q10", "magnesium", "glutamin"],
  },
  {
    slug: "l-lysin",
    name: "L-lysin",
    aliases: ["lysine", "l-lysine", "lysin", "l-lysine (hypoallergenic)"],
    category: "amino",
    summary:
      "Essentiell aminosyra som inte kan tillverkas av kroppen. Byggsten i kollagen och nödvändig för karnitinsyntesen.",
    body: [
      "Lysin är en av de nio essentiella aminosyrorna och är särskilt viktig för bildningen av kollagen, där den tillsammans med prolin bygger den karakteristiska trippelhelixen.",
      "Lysin är dessutom en startpunkt för kroppens egna karnitinsyntes, som transporterar fettsyror in i mitokondrierna för förbränning.",
    ],
    relatedSlugs: ["l-prolin", "kycklingkollagen-typ-ii", "natriumaskorbat"],
  },
  {
    slug: "l-prolin",
    name: "L-prolin",
    aliases: ["proline", "l-proline", "prolin", "l-proline (hypoallergenic)"],
    category: "amino",
    summary:
      "Aminosyra som kroppen kan tillverka själv. Viktig strukturell komponent i kollagen och bindväv.",
    body: [
      "Prolin har en cyklisk struktur som ger kollagenmolekylen dess kink och därmed dess trippelhelix-form. Tillsammans med glycin och hydroxiprolin bygger den ungefär en tredjedel av allt kollagen i kroppen.",
      "Vid sårläkning och vävnadsåterhämtning ökar kroppens behov av prolin tillfälligt.",
    ],
    relatedSlugs: ["l-lysin", "glycin", "kycklingkollagen-typ-ii"],
  },
  {
    slug: "folsyra",
    name: "Folsyra (B9)",
    aliases: ["folic acid", "folate", "folat", "folsyra", "vitamin b9", "b9"],
    category: "vitamin",
    summary:
      "Vattenlösligt B-vitamin nödvändigt för DNA-syntes, celldelning och bildning av röda blodkroppar.",
    body: [
      "Folsyra är den syntetiska formen av folat — den naturligt förekommande varianten i livsmedel som mörkgröna bladgrönsaker och baljväxter. Båda formerna omvandlas i kroppen till den aktiva formen 5-MTHF (metylfolat).",
      "Folat krävs i alla biokemiska reaktioner som överför metylgrupper, vilket gör vitaminet centralt vid celldelning och därför särskilt viktigt under graviditet.",
    ],
    relatedSlugs: ["vitamin-b6", "vitamin-b2", "natriumaskorbat"],
    references: [
      {
        title: "Folate — Health Professional Fact Sheet",
        cite: "NIH Office of Dietary Supplements",
        url: "https://ods.od.nih.gov/factsheets/Folate-HealthProfessional/",
        kind: "web",
      },
    ],
  },
  {
    slug: "vitamin-a",
    name: "Vitamin A (palmitat)",
    aliases: ["vitamin a", "retinol", "retinyl palmitate", "vitamin a (palmitate)", "a-vitamin"],
    category: "vitamin",
    summary:
      "Fettlösligt vitamin centralt för synen, immunförsvaret och epitelvävnaden. Retinylpalmitat är en stabil esterform.",
    body: [
      "Vitamin A finns i två huvudgrupper: preformerad retinol (från animaliska källor och i tillskott ofta som retinylpalmitat) och provitaminerna karotenoider (β-karoten m.fl. från växter).",
      "I näthinnan är retinal — en oxidationsprodukt av retinol — en oumbärlig del av rhodopsinet, det proteinkomplex som omvandlar ljus till nervimpulser.",
    ],
    relatedSlugs: ["vitamin-e", "natriumaskorbat", "vitamin-b6"],
    references: [
      {
        title: "Vitamin A — Health Professional Fact Sheet",
        cite: "NIH Office of Dietary Supplements",
        url: "https://ods.od.nih.gov/factsheets/VitaminA-HealthProfessional/",
        kind: "web",
      },
    ],
  },
  {
    slug: "vitamin-b2",
    name: "Vitamin B2 (riboflavin)",
    aliases: ["riboflavin", "vitamin b2", "b2", "b2-vitamin"],
    category: "vitamin",
    summary:
      "Vattenlösligt B-vitamin och förstadium till coenzymerna FAD och FMN, som driver mitokondriernas elektrontransport.",
    body: [
      "Riboflavin har det karakteristiska gulgröna utseende som ger fluorescensen i en B-komplex tablett. I kroppen fosforyleras det till FMN och FAD, två elektronbärare som är ovärderliga i andningskedjan och därmed för cellernas energiproduktion.",
    ],
    relatedSlugs: ["vitamin-b6", "folsyra", "koenzym-q10"],
    references: [
      {
        title: "Riboflavin — Health Professional Fact Sheet",
        cite: "NIH Office of Dietary Supplements",
        url: "https://ods.od.nih.gov/factsheets/Riboflavin-HealthProfessional/",
        kind: "web",
      },
    ],
  },
  {
    slug: "vitamin-b6",
    name: "Vitamin B6 (pyridoxin)",
    aliases: [
      "pyridoxine",
      "pyridoxin",
      "vitamin b6",
      "b6-vitamin",
      "vitamin b6 (pyridoxine)",
      "p5p",
      "pyridoxal-5-phosphate",
    ],
    category: "vitamin",
    summary:
      "B-vitamin som är kofaktor i fler än 100 enzymreaktioner — framför allt aminosyrametabolism och bildning av signalsubstanser.",
    body: [
      "B6 omvandlas i kroppen till pyridoxal-5-fosfat (P5P), den aktiva koenzymformen. P5P är central för transamineringsreaktionerna som omvandlar aminosyror till varandra och för syntesen av neurotransmittorerna serotonin, dopamin, GABA och noradrenalin.",
    ],
    relatedSlugs: ["folsyra", "vitamin-b2", "magnesium"],
    references: [
      {
        title: "Vitamin B6 — Health Professional Fact Sheet",
        cite: "NIH Office of Dietary Supplements",
        url: "https://ods.od.nih.gov/factsheets/VitaminB6-HealthProfessional/",
        kind: "web",
      },
    ],
  },
  {
    slug: "vitamin-e",
    name: "Vitamin E (D-alfa-tokoferol)",
    aliases: [
      "vitamin e",
      "tokoferol",
      "tocopherol",
      "alpha-tocopherol",
      "d-alpha",
      "vitamin e (d-alpha)",
      "e-vitamin",
    ],
    category: "vitamin",
    summary:
      "Fettlöslig antioxidant som skyddar lipiderna i cellmembran från peroxidation. Naturlig form (D-alfa) absorberas effektivare än syntetisk DL-alfa.",
    body: [
      "Vitamin E är samlingsnamnet för åtta fettlösliga molekyler — fyra tokoferoler och fyra tokotrienoler. D-alfa-tokoferol är den biologiskt mest aktiva formen och den enda som transporteras tillbaka från levern till perifera vävnader via α-TTP.",
      "I cellmembranen avbryter vitaminet kedjereaktioner av lipidperoxidation genom att neutralisera fria radikaler.",
    ],
    relatedSlugs: ["natriumaskorbat", "vitamin-a", "koenzym-q10"],
    references: [
      {
        title: "Vitamin E — Health Professional Fact Sheet",
        cite: "NIH Office of Dietary Supplements",
        url: "https://ods.od.nih.gov/factsheets/VitaminE-HealthProfessional/",
        kind: "web",
      },
    ],
  },
  {
    slug: "stevia",
    name: "Stevia",
    aliases: ["stevia rebaudiana", "steviolglykosider", "stevia (herb for taste)"],
    category: "botanical",
    summary:
      "Sötningsmedel utvunnet ur bladen av Stevia rebaudiana — sötar 200–300 gånger mer än socker utan att höja blodsockret.",
    body: [
      "Stevia odlas ursprungligen i Paraguay och Brasilien. De aktiva sötningsämnena är steviolglykosider (rebaudiosid A och stevioksid) — strukturellt diterpener som inte tas upp i tunntarmen utan bryts ned av tarmfloran till steviol och utsöndras.",
      "Eftersom stevia inte påverkar glykemisk respons är det ett av få naturliga sötningsmedel som rekommenderas vid både insulinresistens och diabetes.",
    ],
    relatedSlugs: ["bjorkglukos", "olivbladextrakt", "aloe-vera"],
  },
  {
    slug: "svart-peppar-extrakt",
    name: "Svart peppar-extrakt (BioPerine®)",
    aliases: ["svart peppar extrakt", "bioperine", "piperin", "piperine", "black pepper extract"],
    category: "botanical",
    summary:
      "Standardiserat extrakt från svartpeppar (Piper nigrum). Den aktiva komponenten piperin förbättrar upptaget av en rad andra näringsämnen.",
    body: [
      "Piperin är den alkaloid som ger svartpeppar dess karaktäristiska skärpa. Vid intag tillsammans med andra näringsämnen kan piperin i mycket små doser (≈5 mg) öka biotillgängligheten av till exempel curcumin, koenzym Q10 och vissa B-vitaminer.",
    ],
    relatedSlugs: ["koenzym-q10", "boswellia", "olivbladextrakt"],
  },
  {
    slug: "slemalm",
    name: "Slemalm",
    aliases: [
      "slemalmsbark",
      "slemalm-bark",
      "slippery elm",
      "slippery elm bark",
      "ulmus rubra",
      "ulmus fulva",
      "rödalm",
    ],
    category: "botanical",
    summary:
      "Innerbarken av det nordamerikanska almträdet Ulmus rubra. Innehåller en slemsubstans — en viskös fiber som sväller i kontakt med vatten — som traditionellt använts för matsmältningskanalens slemhinna.",
    body: [
      "Slemalm (på engelska slippery elm) är innerbarken av Ulmus rubra, ett lövträd i östra Nordamerika. Barken har använts i flera hundra år av Nordamerikas ursprungsbefolkningar, både invärtes vid magbesvär och utvärtes på huden.",
      "Det aktiva ämnet är en slemsubstans — en blandning av polysackarider (främst galaktosaminoglykaner) som i kontakt med vatten bildar en mjuk, viskös gel. Inom traditionell användning beskrivs den som att den lägger en mild hinna över matsmältningskanalens slemhinna.",
      "Slemalm kombineras ofta med andra mjuka örter (aloe, vit ekbark) i mag- och tarmformler. I kapselform sväller slemsubstansen efter att den intagits tillsammans med vätska, vilket är anledningen till att man rekommenderas dricka ett glas vatten till.",
    ],
    relatedSlugs: ["aloe-vera", "vit-ekbark", "gentianarot"],
    references: [
      {
        title: "Slippery Elm",
        cite: "Memorial Sloan Kettering Cancer Center — Integrative Medicine",
        url: "https://www.mskcc.org/cancer-care/integrative-medicine/herbs/slippery-elm",
        kind: "web",
      },
    ],
  },
  {
    slug: "vit-ekbark",
    name: "Vit ekbark",
    aliases: [
      "vit ek",
      "vitek",
      "vitekbark",
      "vit-ek",
      "vit ekbark",
      "white oak bark",
      "quercus alba",
    ],
    category: "botanical",
    summary:
      "Barkens sammandragande egenskaper kommer från ett högt innehåll av garvämnen (tanniner). Använd i nordamerikansk och europeisk växtmedicin för matsmältningskomfort och slemhinnestöd.",
    body: [
      "Vit ek (Quercus alba) är ett nordamerikanskt lövträd vars bark traditionellt använts inom örtmedicinen i både Nordamerika och Europa. Det är garvämnena — kondenserade tanniner och hydrolyserbara tanniner — som ger barken dess karakteristiska adstringerande (sammandragande) verkan.",
      "Inom traditionell användning kombineras vit ekbark ofta med mjukare örter som slemalm och aloe i mag- och tarmformler, där sammandragningen balanseras upp av de slemhinnemjuka delarna. Garvämnena binder också tungmetaller och vissa alkaloider, vilket är anledningen till att vit ekbark inte bör tas tillsammans med vissa läkemedel.",
    ],
    relatedSlugs: ["slemalm", "gentianarot", "boswellia"],
  },
  {
    slug: "gentianarot",
    name: "Gentianarot",
    aliases: [
      "gentian",
      "gentian root",
      "gentiana lutea",
      "gulgentiana",
      "gul gentiana",
    ],
    category: "botanical",
    summary:
      "Roten av gul gentiana (Gentiana lutea) — en av Europas klassiska bitterörter. Använd sedan antiken som matsmältningsstöd via sin uttalat beska smak.",
    body: [
      "Gentianarot är en av de mest karakteristiska bitterörterna inom europeisk växtmedicin. Den gula gentianan växer vild i bergsområden i mellan- och Sydeuropa, och den torkade roten är så bitter att den än i dag används som referens för mätning av bitterämnen (\"gentian taste units\").",
      "Den bittra smaken kommer från sekoiridoider (främst gentiopikrosid och amarogentin). Inom traditionell användning ges gentian före måltid för att sätta igång saliv- och magsaftutsöndringen — det är den klassiska principen bakom bittermedel, som också ligger till grund för flera likörer (Angostura bitter, Aperol).",
      "I sammansatta mag- och tarmformler bidrar gentianarot med en stimulerande, magsyraväckande del som balanserar de mjukare, slemhinneskyddande örterna.",
    ],
    relatedSlugs: ["slemalm", "vit-ekbark", "bla-verbena"],
    references: [
      {
        title: "Gentiana lutea — bitter principles and digestive use",
        cite: "WHO Monographs on Selected Medicinal Plants, vol. 4",
        url: "https://apps.who.int/iris/handle/10665/44478",
        kind: "book",
      },
    ],
  },
  {
    slug: "bla-verbena",
    name: "Blå verbena",
    aliases: [
      "blå verbena",
      "bla verbena",
      "blue vervain",
      "verbena hastata",
      "järnört",
      "jarnort",
      "verbena",
    ],
    category: "botanical",
    summary:
      "Nordamerikansk ört (Verbena hastata) som inom traditionell folkmedicin använts som ett mångsidigt mag- och nervstöd. Ska inte förväxlas med citronverbena eller den europeiska järnörten Verbena officinalis.",
    body: [
      "Blå verbena är en högväxande, blåblommande ört som växer i östra och centrala Nordamerika. Inom traditionell folkmedicin — främst hos cherokee och iroquois — har de torkade ovanjordsdelarna använts som matsmältningsstöd och som ett allmänt avslappnande nervstöd.",
      "Blå verbena ska inte förväxlas med den europeiska järnörten Verbena officinalis, som har en något annan användningstradition, eller med citronverbena (Aloysia citrodora), som är en kulinarisk ört.",
      "I sammansatta tarmformler bidrar blå verbena ofta med en lugnande not till en annars stimulerande örtblandning.",
    ],
    relatedSlugs: ["gentianarot", "slemalm", "griffonia"],
  },
  {
    slug: "alfa-liponsyra",
    name: "Alfa-liponsyra",
    aliases: [
      "alfa liponsyra",
      "alfaliponsyra",
      "alpha lipoic acid",
      "ala",
      "alpha-lipoic acid",
      "thioctic acid",
      "tioktinsyra",
    ],
    category: "other",
    summary:
      "Svavelhaltigt fettsyrederivat som cellerna själva tillverkar och använder i energiomsättningen. Ovanlig bland antioxidanter — verksam i både vatten- och fettlösliga miljöer.",
    body: [
      "Alfa-liponsyra (ALA) är en kort fettsyra med två svavelatomer som kroppen själv bildar i mitokondrierna. Den fungerar som koenzym för flera enzymkomplex som är centrala i glukos- och energiomsättningen — främst pyruvatdehydrogenas och alfa-ketoglutaratdehydrogenas i citronsyracykeln.",
      "Det molekylärt ovanliga är att ALA är både vatten- och fettlöslig — de flesta antioxidanter är det ena eller det andra. Det betyder att den kan fånga upp fria radikaler både i cellens vattenfas (cytoplasma) och i fettrika membran. ALA kan dessutom återställa andra antioxidanter (vitamin C, vitamin E, glutation) efter att de förbrukats.",
      "ALA finns naturligt i små mängder i livsmedel som rött kött, spenat, broccoli och potatis. Kroppens egen produktion avtar med åldern.",
    ],
    relatedSlugs: ["koenzym-q10", "n-acetylcystein", "vitamin-e"],
    references: [
      {
        title: "Alpha-Lipoic Acid",
        cite: "Oregon State University — Linus Pauling Institute Micronutrient Information Center",
        url: "https://lpi.oregonstate.edu/mic/dietary-factors/lipoic-acid",
        kind: "web",
      },
    ],
  },
  {
    slug: "chanca-piedra",
    name: "Chanca Piedra",
    aliases: [
      "phyllanthus niruri",
      "phyllanthus",
      "stenkrossaren",
      "stone breaker",
      "bhumi amla",
      "chanca",
    ],
    category: "botanical",
    summary:
      "Liten tropisk växt vars portugisiska namn betyder \"stenkrossaren\". Använd inom amazonsk och ayurvedisk tradition i hundratals år för stöd åt lever och urinvägar.",
    body: [
      "Chanca Piedra (Phyllanthus niruri) växer vild i Amazonas, södra Indien, Sri Lanka och Filippinerna. Trots vad namnet antyder är det de tunna grenarna och bladen som används medicinalt — inte stenar.",
      "Inom ayurvedisk medicin är växten känd som bhumi amla och har sedan 2000 år tillbaka en plats i klassiska formuleringar för lever och urinvägar. Inom amazonsk folkmedicin har örten en motsvarande roll. Den moderna forskningen har kretsat kring just dessa traditionella användningsområden — lever, gallvägar och urinvägshälsa.",
      "Växtens aktiva ämnen är blandade — lignaner (phyllanthin, hypophyllanthin), flavonoider, alkaloider och tanniner. Fullspektrumextrakt försöker bevara hela ämnesinnehållet i stället för att isolera ett enskilt ämne.",
    ],
    relatedSlugs: ["bjorkglukos", "olivbladextrakt"],
  },
  {
    slug: "djavulsklo",
    name: "Djävulsklo",
    aliases: [
      "djavulsklo",
      "djavulsklon",
      "djävulsklon",
      "harpago",
      "harpagophytum",
      "harpagophytum procumbens",
      "harpagophytum spp",
      "devils claw",
      "devil's claw",
      "grapple plant",
    ],
    category: "botanical",
    summary:
      "Afrikansk växt vars fruktkapsel har karakteristiska krokar — därav namnet. Roten har en lång tradition i södra Afrika och en väl utforskad användning i europeisk fytoterapi vid ledbesvär.",
    body: [
      "Djävulsklo (Harpagophytum procumbens) är en sydafrikansk växt vars torkade sekundärrötter används medicinalt. Bland khoisanfolken i Kalahari har den varit en del av traditionell medicin i flera hundra år, framför allt för leder och rörlighet.",
      "Den togs upp i europeisk växtmedicin på 1950-talet och är idag en av de mest studerade örterna inom ledhälsa — flera randomiserade studier har undersökt extrakten vid knä- och ländryggsbesvär. EMA (Europeiska läkemedelsmyndigheten) har en monografi för traditionell användning.",
      "De aktiva ämnena är iridoidglykosider, främst harpagosid, samt fytosteroler och flavonoider. Fullspektrumextrakt syftar till att bevara hela ämnesinnehållet.",
      "**Försiktighet:** djävulsklo bör inte användas vid magsår eller av personer som tar blodförtunnande läkemedel utan att man först pratat med sin läkare.",
    ],
    relatedSlugs: ["boswellia", "natriumaskorbat", "magnesium"],
    references: [
      {
        title: "Harpagophytum procumbens — Community herbal monograph",
        cite: "European Medicines Agency, HMPC",
        url: "https://www.ema.europa.eu/en/medicines/herbal/harpagophyti-radix",
        kind: "book",
      },
    ],
  },
  {
    slug: "lakritsrot",
    name: "Lakritsrot (DGL)",
    aliases: [
      "lakritsrot",
      "lakrits",
      "lakritsrotsextrakt",
      "lakritsrotextrakt",
      "lakritsrotextrakt glycyrrhiza glabra",
      // Cover both Swedish spellings (-inerad / -iniserad) and both
      // "rotextrakt" / "rotsextrakt" forms — Rockland's label uses one,
      // EMA monographs another, third-party suppliers a third.
      "deglycyrrhizinerad lakritsrotextrakt",
      "deglycyrrhizinerad lakritsrotsextrakt",
      "deglycyrrhiziniserad lakritsrot",
      "deglycyrrhiziniserad lakritsrotextrakt",
      "deglycyrrhiziniserad lakritsrotsextrakt",
      "deglycyrrhizinated licorice",
      "dgl",
      "glycyrrhiza glabra",
      "licorice root",
      "licorice",
    ],
    category: "botanical",
    summary:
      "Roten av Glycyrrhiza glabra — en av de äldsta dokumenterade örterna inom både kinesisk och europeisk medicin. I DGL-formen har glycyrrhizinet tagits bort för att undvika biverkningar på blodtryck och kalium.",
    body: [
      "Lakritsrot har använts inom traditionell medicin i minst 4 000 år. Den finns dokumenterad i egyptiska papyrusrullar, i den kinesiska Shen Nong-skriften och i den grekisk-romerska antikens medicin. Inom traditionell kinesisk medicin är gan cao (lakritsrot) en av de allra mest använda ingredienserna i sammansatta recept.",
      "Glycyrrhizin är det ämne som ger lakrits sin karaktäristiska söta smak — ungefär 50 gånger sötare än socker. Det är också det ämne som vid längre tids hög konsumtion kan höja blodtrycket och sänka kaliumnivåerna genom att hämma enzymet 11β-HSD2.",
      "Deglycyrrhiziniserad lakritsrot (DGL) är ett extrakt där glycyrrhizinet tagits bort — vanligtvis ner till under 2 %. Det som finns kvar är flavonoiderna (liquiritin, isoliquiritin) och chalkonerna — de ämnen som förknippas med den traditionella användningen för magslemhinnan.",
      "DGL säljs ofta som tuggtablett snarare än kapsel, eftersom kontakten med saliv anses bidra till effekten i mun- och magslemhinnan.",
    ],
    relatedSlugs: ["slemalm", "aloe-vera", "glycin"],
  },
  {
    slug: "n-acetylcystein",
    name: "N-acetylcystein",
    aliases: [
      "n-acetyl cystein",
      "n-acetyl-cystein",
      "n acetyl cystein",
      "nac",
      "n-acetyl l-cystein",
      "n-acetyl-l-cystein",
      "n-acetylcysteine",
      "acetylcystein",
      "acetylcysteine",
    ],
    category: "amino",
    summary:
      "Acetylerad form av den svavelhaltiga aminosyran cystein. Kroppen använder cystein som byggsten för glutation — en av kroppens mest centrala egna antioxidanter.",
    body: [
      "N-acetylcystein (NAC) är cystein med en acetylgrupp tillagd på aminosidan. Den acetylerade formen är mer stabil och tas upp bättre än ren cystein, som lätt oxiderar.",
      "Cystein har en central roll i kroppen som hastighetsbegränsande byggsten för glutation — en tripeptid (glutaminsyra + cystein + glycin) som finns i alla celler och utgör en av kroppens viktigaste interna antioxidanter. Glutationnivåerna sjunker med åldern, vid hög oxidativ belastning och vid vissa kroniska tillstånd.",
      "NAC har också en lång klinisk historia som slemlösare för luftvägarna — det var den användningen som ledde till att ämnet upptäcktes på 1960-talet, och det är fortfarande som receptfritt läkemedel mot slembildning som det säljs i flera länder.",
      "Den karaktäristiska svaveldoften kommer från cysteinets svavelatom och är ett tecken på att produkten är som den ska — inte en kvalitetsbrist.",
    ],
    relatedSlugs: ["alfa-liponsyra", "vitamin-e", "glutamin"],
    references: [
      {
        title: "N-Acetylcysteine — A safe antidote for cysteine/glutathione deficiency",
        cite: "Atkuri et al., Curr Opin Pharmacol 2007",
        url: "https://pubmed.ncbi.nlm.nih.gov/17602868/",
        kind: "pubmed",
      },
    ],
  },
  {
    slug: "probiotika",
    name: "Probiotika",
    aliases: [
      "probiotika",
      "probiotics",
      "mjölksyrabakterier",
      "mjolksyrabakterier",
      "lactobacillus",
      "lactobacillus acidophilus",
      "lactobacillus brevis",
      "lactobacillus casei",
      "lactobacillus helveticus",
      "lactobacillus paracasei",
      "lactobacillus plantarum",
      "lactobacillus reuteri",
      "lactobacillus rhamnosus",
      "lactobacillus salivarius",
      "lactobacillus gasseri",
      "lactococcus lactis",
      "bifidobacterium",
      "bifidobacterium longum",
      "bifidobacterium bifidum",
      "bifidobacterium breve",
      "bifidobacterium lactis",
      "streptococcus thermophilus",
    ],
    category: "other",
    summary:
      "Levande mikroorganismer — främst mjölksyrabakterier — som tillförs i tillräckliga mängder för att klara passagen genom magsäcken och nå tarmen. WHO:s definition kräver dokumenterad effekt och säkerhet ner på enskild stamnivå.",
    body: [
      "Den vetenskapliga definitionen av probiotika kommer från FAO/WHO 2001: \"levande mikroorganismer som, när de tillförs i tillräckliga mängder, ger en hälsofördel för värden\". Definitionen är medvetet stamspecifik — det räcker inte med att säga \"Lactobacillus är bra\", det måste handla om en specifik stam med dokumenterad effekt.",
      "De vanligaste släktena i kosttillskott är Lactobacillus, Bifidobacterium, Lactococcus och Streptococcus thermophilus. Varje art rymmer många stammar (till exempel Lactobacillus rhamnosus GG jämfört med Lactobacillus rhamnosus LB21), och effekter som är dokumenterade för en stam går inte automatiskt att generalisera till en annan stam av samma art.",
      "Dosen anges i kolonibildande enheter (CFU = colony-forming units), oftast i miljarder per dos. Produkter med blandade stammar — så kallade multi-strain — siktar mot en bredare ekologisk effekt i tarmen snarare än mot att maxa en enskild stams aktivitet.",
      "Probiotika kombineras ofta med prebiotika (till exempel FOS, frukto-oligosackarider) — icke-nedbrytbara fibrer som fungerar som näring åt bakterierna. Kombinationen kallas synbiotika.",
    ],
    relatedSlugs: ["fos", "slemalm", "aloe-vera"],
    references: [
      {
        title: "The International Scientific Association for Probiotics and Prebiotics consensus statement on the scope and appropriate use of the term probiotic",
        cite: "Hill et al., Nat Rev Gastroenterol Hepatol 2014",
        url: "https://pubmed.ncbi.nlm.nih.gov/24912386/",
        kind: "pubmed",
      },
    ],
  },
  {
    slug: "fos",
    name: "FOS — frukto-oligosackarider",
    aliases: [
      "fos",
      "frukto-oligosackarider",
      "fructo-oligosaccharides",
      "frukto oligosackarider",
      "fos prebiotika",
      "inulin-typ-fruktaner",
    ],
    category: "fiber",
    summary:
      "Kortkedjiga oligosackarider av fruktosenheter som passerar tunntarmen oförändrade och bryts ner av bakterier i tjocktarmen — ett av de mest använda prebiotika.",
    body: [
      "Frukto-oligosackarider (FOS) är kortkedjiga sockermolekyler — vanligtvis 2–10 fruktosenheter — som finns naturligt i bland annat lök, vitlök, kronärtskocka, jordärtskocka och bananer. De passerar tunntarmen utan att tas upp och blir i stället näring åt bakterierna i tjocktarmen.",
      "Som prebiotikum gynnar FOS främst släktet Bifidobacterium, vars bakterier är effektiva på att bryta ner just de här kedjelängderna. Slutprodukterna är kortkedjiga fettsyror (acetat, propionat, butyrat) som i sin tur är energikälla åt cellerna i tjocktarmens slemhinna.",
      "FOS kombineras ofta med probiotika i samma produkt — då talar man om en synbiotika. Dosen i kosttillskott ligger vanligtvis på 0,5–5 g, vilket är väl under de mängder som kan ge gasbildning hos känsliga personer.",
    ],
    relatedSlugs: ["probiotika", "beta-glucan", "slemalm"],
  },
];

const SLUG_MAP: Map<string, IngredientMeta> = new Map();
const ALIAS_MAP: Map<string, IngredientMeta> = new Map();
for (const ing of INGREDIENTS) {
  SLUG_MAP.set(ing.slug, ing);
  ALIAS_MAP.set(slugify(ing.name), ing);
  for (const a of ing.aliases ?? []) {
    ALIAS_MAP.set(slugify(a), ing);
  }
}


/**
 * Look up by row name (or slug). Tries progressively looser matching:
 *   1. Exact slug
 *   2. Slug after stripping parentheticals  ("Magnesium (Okinawa Coral)" → "magnesium")
 *   3. Slug after stripping qualifier suffixes ("Boswellia-extrakt standardiserat..." → tries first 1–3 tokens)
 *
 * Step 3 only matches when an alias is a *prefix* of the row's tokens — we
 * never partial-match on a tail token, which would risk hitting "vitamin" on
 * unrelated inputs.
 */
export function findIngredient(name: string): IngredientMeta | null {
  if (!name) return null;

  const direct = lookup(slugify(name));
  if (direct) return direct;

  const stripped = name.replace(/\([^)]*\)/g, "").trim();
  if (stripped && stripped !== name) {
    const m = lookup(slugify(stripped));
    if (m) return m;
  }

  // Token-prefix fallback: try the first 1, 2, 3 hyphen-separated tokens of
  // the slug. Catches "boswellia-extrakt-standardiserat-..." → "boswellia".
  const tokens = slugify(stripped || name).split("-").filter(Boolean);
  for (let n = Math.min(3, tokens.length); n >= 1; n--) {
    const m = lookup(tokens.slice(0, n).join("-"));
    if (m) return m;
  }
  return null;
}

function lookup(slug: string): IngredientMeta | null {
  return SLUG_MAP.get(slug) ?? ALIAS_MAP.get(slug) ?? null;
}

export function getAllIngredients(): IngredientMeta[] {
  return [...INGREDIENTS].sort((a, b) => a.name.localeCompare(b.name, "sv"));
}

export function getIngredient(slug: string): IngredientMeta | null {
  return SLUG_MAP.get(slug) ?? null;
}

/**
 * Resolve related ingredients for a monograph. Curated `relatedSlugs` win;
 * if none are provided we fall back to the first three other ingredients in
 * the same category. Returns at most `limit` entries, deduped, never the
 * ingredient itself.
 */
export function getRelated(ing: IngredientMeta, limit = 3): IngredientMeta[] {
  const out: IngredientMeta[] = [];
  const seen = new Set<string>([ing.slug]);

  for (const slug of ing.relatedSlugs ?? []) {
    if (seen.has(slug)) continue;
    const m = SLUG_MAP.get(slug);
    if (m) {
      out.push(m);
      seen.add(slug);
      if (out.length >= limit) return out;
    }
  }

  // Fallback: same category, alphabetical (deterministic).
  if (out.length < limit) {
    const peers = INGREDIENTS.filter(
      (i) => i.category === ing.category && !seen.has(i.slug)
    ).sort((a, b) => a.name.localeCompare(b.name, "sv"));
    for (const p of peers) {
      out.push(p);
      seen.add(p.slug);
      if (out.length >= limit) break;
    }
  }
  return out;
}
