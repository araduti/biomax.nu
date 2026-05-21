/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * INDUSTRY-PACK BOUNDARY (#22.3 / kine ADR 0003) — supplements-only.
 *
 * This file is a SUPPLEMENTS-INDUSTRY surface. It does not belong in
 * the platform codebase. On kine extraction it moves to:
 *   `kine/plugins/industry-supplements/src/symptoms/`
 *
 * Until then, treat as if it were already extracted:
 *   • Do not import from this module in any code path that is
 *     intended to live in @kine/* (use the search "no-restricted-
 *     paths" / ESLint zone below — flag any new violation).
 *   • Symptom abstractions do not generalise to jewelry / apparel /
 *     coffee tenants. Adding "industry-aware" branching here is
 *     wrong; the right answer is a different industry pack.
 *   • Biomax-specific copy (the "| Biomax" SEO title suffix below)
 *     is fine here — this IS biomax's plugin in spirit. The
 *     extraction will replace it with the tenant's brand name from
 *     @kine/tenancy at render time.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Symptom-based landing-page registry.
 *
 * Each entry powers a dedicated `/hjalp/[slug]` page that addresses an
 * outcome customers actually search for ("varför sover jag dåligt",
 * "naturligt mot oro"), rather than an ingredient or a category. These
 * pages are the largest single SEO surface we have — they map mass-market
 * Swedish queries to our editorial framing and our products.
 *
 * The registry is intentionally a TS module — same pattern as the
 * ingredient knowledge base. Editorial content lives next to the code,
 * version-controlled, easy to review.
 *
 * Voice rules (per AGENTS.md + project memory):
 *   - Traditional-use framing only. NO medical or therapeutic claims.
 *   - Don't promise outcomes. Describe what people have turned to.
 *   - Warm, editorial, written for a real Swedish reader, not a marketer.
 */

export type SymptomFaq = { question: string; answer: string };

export type SymptomEntry = {
  slug: string;
  /** Page H1 — what the customer sees at the top of the page. */
  title: string;
  /** Eyebrow / nav label. Shorter, no verb. */
  shortTitle: string;
  /** 2-3 sentence summary used in /hjalp index card + meta description. */
  summary: string;
  /** 2–4 paragraphs of editorial intro acknowledging the experience. */
  intro: string[];
  /** 2–3 paragraphs describing the traditional framing of the issue. */
  approach: string[];
  /** Curated product slugs in display order. Empty array → auto-pick by category. */
  productSlugs: string[];
  /** Curated ingredient knowledge-base slugs to surface as monograph links. */
  ingredientSlugs: string[];
  /** Anchor category for fallback product selection + breadcrumb context. */
  categorySlug: string;
  /** Page-specific FAQs. Renders as FAQPage JSON-LD when ≥ 2 entries. */
  faq: SymptomFaq[];
  seoTitle: string;
  seoDescription: string;
  seoFocusKw: string;
};

export const SYMPTOMS: SymptomEntry[] = [
  {
    slug: "somnproblem",
    title: "Sömnproblem — när hjärnan inte vill släppa dagen",
    shortTitle: "Sömnproblem",
    summary:
      "Det som ofta dyker upp under mörka månader, i förändringsperioder eller bara i vissa veckor. Här är de växter, aminosyror och mineraler som traditionellt använts när människor försökt hitta tillbaka till sömnen.",
    intro: [
      "Att inte kunna somna är inte samma sak som att vara vaken. Det är ofta värre — kroppen är trött, hjärnan är trött, men något i systemet vägrar släppa dagen. Du ligger där, ser klockan slå halv två och räknar timmar baklänges till väckarklockan ska ringa.",
      "Det är vanligare än man tror. För många kommer det i vågor — några tunga veckor om hösten när ljuset försvinner, en period efter en stor livshändelse, en månad när jobbet är som värst. För andra är det en grundton som inte vill ge med sig.",
      "Den här sidan är inte medicinsk rådgivning. Det är en översikt över de växter, aminosyror och mineraler som människor traditionellt har vänt sig till när de försökt komma tillbaka in i sömnen.",
    ],
    approach: [
      "Inom den traditionella örtmedicinen brukar man tänka i två spår när det gäller sömn. Det ena är de avslappnande örterna — citronmeliss, passionsblomma, vänderot — som har en lugnande verkan på nervsystemet. Det andra är de aminosyror och förstadier som kroppen själv använder för att bilda de signalsubstanser som styr sömnen: tryptofan, 5-HTP (från Griffonia) och glycin.",
      "Magnesium ligger lite i en egen kategori. Det är inte i första hand en sömnmolekyl, men brist på magnesium hänger ihop med rastlöshet och muskelspänning — och båda gör sömnen svårare. Många märker skillnad när magnesiumförrådet fyllts på.",
      "Kasein-hydrolysat (Lactium®) är ett nyare inslag. Det är en hydrolyserad form av mjölkprotein som från början studerades vid stressreaktioner och som sedan dess fått en plats i flera lugn- och sömnformler.",
    ],
    productSlugs: ["balans", "easy-way-lactium"],
    ingredientSlugs: ["griffonia", "magnesium", "glycin", "kasein-hydrolysat"],
    categorySlug: "somn-oro",
    faq: [
      {
        question: "Hur länge ska jag prova ett sömntillskott innan jag bedömer effekten?",
        answer:
          "Generellt rekommenderas att ge ett kosttillskott åtminstone 2–4 veckor regelbunden användning innan du bedömer om det gör skillnad. Sömnvanor och stress påverkar varandra över längre tid — ett par enstaka dagar säger inte mycket.",
      },
      {
        question: "Kan jag kombinera flera sömnstöd samtidigt?",
        answer:
          "Många produkter som riktar sig mot sömn är redan kombinationsformler (t.ex. Balans innehåller flera aminosyror plus mineraler). Att lägga ihop flera enskilda produkter ovanpå kan göra det svårt att avgöra vad som faktiskt hjälper. Börja med en formel i taget.",
      },
      {
        question: "Påverkar sömntillskott läkemedel?",
        answer:
          "Vissa kan göra det. 5-HTP och Griffonia kan interagera med antidepressiva som påverkar serotoninsystemet. Rådfråga läkare eller apotekspersonal om du tar receptbelagda läkemedel.",
      },
    ],
    seoTitle: "Sömnproblem — naturliga tillskott och traditionella örter | Biomax",
    seoDescription:
      "När hjärnan inte släpper dagen. Översikt över växter, aminosyror och mineraler som traditionellt använts för bättre sömn. Familjeägd hälsobutik i Kållered sedan 2001.",
    seoFocusKw: "sömnproblem naturligt",
  },
  {
    slug: "oro-och-stress",
    title: "Oro och inre stress — när nervsystemet inte vilar",
    shortTitle: "Oro och stress",
    summary:
      "En kropp som ligger högt fast tankar och kalender säger att det är lugnt. Översikt över örter, aminosyror och B-vitaminer som inom växtmedicinen har en plats när nervsystemet behöver vila.",
    intro: [
      "Oro behöver inte ha en tydlig orsak. Många beskriver det som att kroppen ligger på en högre växel än situationen kräver — pulsen är där, axlarna är spända och tanken hoppar mellan saker som egentligen inte borde behöva tas itu med just nu.",
      "Det går i perioder. För vissa är det en grundton, för andra vågor som följer årstider och livsskeden. Det är vanligare hos kvinnor än hos män, men finns hos alla.",
      "Den här sidan beskriver vad människor har vänt sig till inom traditionell växtmedicin när nervsystemet behöver vila. Det är ingen behandlingsplan — det är en översikt.",
    ],
    approach: [
      "De klassiska nervlugnande örterna inom europeisk växtmedicin är citronmeliss, passionsblomma, kamomill och vänderot. De har en lång användningstradition och utgör grunden i många moderna lugnformler.",
      "Aminosyrorna tryptofan och 5-HTP (från Griffonia simplicifolia) är förstadier till serotonin — kroppens viktigaste signalsubstans för stämningsläge och sömn. Glycin verkar lugnande på nervsystemet via så kallade inhibitoriska receptorer.",
      "B-vitaminerna, särskilt B6 och B12, är kofaktorer i bildningen av flera signalsubstanser. Riktig brist är inte vanlig, men en marginell brist kan bidra till trötthet och rastlöshet — och B-vitaminer förbrukas snabbare under perioder av hög stress.",
    ],
    productSlugs: ["balans", "easy-way-lactium"],
    ingredientSlugs: ["griffonia", "vitamin-b6", "magnesium", "kasein-hydrolysat", "glycin"],
    categorySlug: "somn-oro",
    faq: [
      {
        question: "Är detta samma sak som ångestbehandling?",
        answer:
          "Nej. Kosttillskott är inte avsedda att behandla eller bota någon sjukdom. Vid ihållande eller invalidiserande oro bör du tala med vården — kosttillskott kan vara ett komplement men inte en ersättning.",
      },
      {
        question: "När märker man av eventuell effekt?",
        answer:
          "Det varierar. Aminosyror och B-vitaminer brukar märkas inom dagar till veckor. Adaptogena och nervlugnande växter behöver oftast 2–6 veckor regelbunden användning innan man kan göra sig en bild av om det hjälper.",
      },
    ],
    seoTitle: "Oro och stress — naturliga tillskott för nervsystemet | Biomax",
    seoDescription:
      "Översikt över traditionella örter, aminosyror och vitaminer för en kropp som ligger högt. Familjeägd hälsobutik i Kållered sedan 2001.",
    seoFocusKw: "naturligt mot oro",
  },
  {
    slug: "mage-och-tarm",
    title: "Mage och tarm — när matsmältningen krånglar",
    shortTitle: "Mage och tarm",
    summary:
      "Gasig mage, rubbad regelbundenhet, irriterad slemhinna. Översikt över örter och mjölksyrabakterier som har sin plats inom både traditionell och modern matsmältning.",
    intro: [
      "Magen är känslig för det mesta — mat, stress, sömn, läkemedel, hormonella svängningar. Det märks ofta innan vi själva förstår sambandet. Att magen krånglar är en av de vanligaste anledningarna att människor söker information om kosttillskott.",
      "Det vi i vardagen kallar \"magproblem\" är egentligen flera olika saker. Att vara gasig efter en måltid är inte samma sak som att vara orolig i tarmen, vilket inte är samma sak som halsbränna eller känslan av en irriterad slemhinna. Vilket tillskott som passar beror på vilket besvär som dominerar.",
      "Den här sidan ger en översikt över de mest etablerade traditionella och moderna vägarna — utan ambitionen att diagnostisera eller behandla.",
    ],
    approach: [
      "Probiotika (mjölksyrabakterier) är den del av modernt mage- och tarmstöd som har mest forskning bakom sig. Olika stammar har olika dokumentation, och så kallade multi-strain-formler siktar på en bred ekologisk effekt snarare än att maxa en enskild stams aktivitet. De kombineras ofta med prebiotiska fibrer (FOS, inulin) som fungerar som näring åt bakterierna.",
      "Mjuka, slemhinnestödjande örter — slemalm, aloe, äkta altea — har en lång användning inom traditionell örtmedicin för matsmältningskanalen. När de möter vatten bildar de en viskös beläggning som inom traditionen beskrivs som lugnande för en irriterad slemhinna.",
      "Lakritsrot (i den glycyrrhizinfria DGL-formen) är en av de äldsta dokumenterade örterna för magslemhinnan inom både kinesisk och europeisk medicin. Bittermedel som gentianarot stimulerar saliv- och magsaftsutsöndring och har en plats inom den klassiska europeiska bittertraditionen.",
    ],
    productSlugs: [
      "super-probiotika-60-kapslar",
      "colon-aid-60-kapslar",
      "dgl-90-tuggtabletter",
    ],
    ingredientSlugs: ["probiotika", "fos", "slemalm", "lakritsrot", "aloe-vera", "gentianarot"],
    categorySlug: "mage-tarm",
    faq: [
      {
        question: "Kan jag ta probiotika och antibiotika samtidigt?",
        answer:
          "Antibiotika slår mot alla bakterier — även de \"goda\". Många väljer att ändå ta probiotika under kuren, men då med minst två timmar emellan dosen antibiotika och dosen probiotika. Och att fortsätta med probiotikan i 1–2 veckor efter att kuren är slut. Vid osäkerhet — fråga på apoteket.",
      },
      {
        question: "Hur snabbt märks effekten av probiotika?",
        answer:
          "En del märker av en lugnare mage redan efter några dagar. Den fulla effekten på tarmflorans sammansättning kommer först efter flera veckors regelbunden användning.",
      },
      {
        question: "Är DGL säkert vid högt blodtryck?",
        answer:
          "DGL-formen (deglycyrrhiziniserad) har just glycyrrhizinet borttaget — det ämne i vanlig lakrits som kan höja blodtrycket och sänka kaliumnivåerna. DGL anses därför lämplig även för den som är känslig för blodtryckspåverkan, till skillnad från vanlig lakritsrot.",
      },
    ],
    seoTitle: "Magproblem och matsmältning — naturliga tillskott | Biomax",
    seoDescription:
      "Probiotika, slemhinnestödjande örter och bittermedel — orientering kring traditionella och moderna ingångar för mage och tarm. Familjeägd hälsobutik i Kållered.",
    seoFocusKw: "magproblem naturligt",
  },
  {
    slug: "leder-och-rorlighet",
    title: "Leder och rörlighet — när kroppen blir trögare",
    shortTitle: "Leder och rörlighet",
    summary:
      "Stelhet efter en stillasittande dag, värk efter ett träningspass, ledförändringar som hör åldern till. Översikt över örter och näringsämnen med lång tradition inom ledhälsa.",
    intro: [
      "Det börjar ofta i det lilla — en stelhet de första minuterna ur sängen, en svårighet att hitta tillbaka till positioner som förut var självklara, en värk efter en löprunda som hänger kvar ett dygn extra. För vissa kommer det tidigt i livet, kopplat till idrott eller fysiskt arbete. För andra smyger det sig på med åren.",
      "Ledhälsa är ett av få områden där traditionell örtmedicin och modern forskning faktiskt möts. Flera av de mest använda örterna har EMA-monografier och randomiserade studier bakom sig — utan att för den skull vara läkemedel.",
      "Den här sidan ger en översikt över de mest etablerade vägarna utan att utlova något specifikt resultat.",
    ],
    approach: [
      "Djävulsklo (Harpagophytum procumbens) är en sydafrikansk växt med en av de längsta traditionerna när det gäller leder. Den finns med i EMA:s monografier för traditionell växtbaserad medicinsk användning och har studerats kliniskt i flera randomiserade studier på besvär i ländrygg och knäleder.",
      "Boswellia (rökelseträd) är en av de klassiska örterna för leder inom ayurvedisk medicin. Trädets harts innehåller boswelliasyror, som studerats för sin verkan i inflammatoriska processer.",
      "Kollagen typ II — vanligtvis från kycklingbrosk — är en byggsten i själva ledbrosket. Den ges i hydrolyserad form för bättre upptag. Tillsammans med C-vitamin (natriumaskorbat), som är en kofaktor i kollagensyntesen, utgör de stommen i en klassisk ledformel.",
    ],
    productSlugs: ["harpago-devils-claw-100-kapslar", "boswellia-100-kaps"],
    ingredientSlugs: ["djavulsklo", "boswellia", "kycklingkollagen-typ-ii", "natriumaskorbat", "l-prolin"],
    categorySlug: "leder",
    faq: [
      {
        question: "Hur länge ska man ta tillskott för leder?",
        answer:
          "Ledstöd är oftare en långsiktig vana än en kur. De flesta växtbaserade och näringsbaserade tillskott behöver 8–12 veckors regelbunden användning innan man kan göra sig en bild av effekten.",
      },
      {
        question: "Vad ska jag tänka på om jag står på blodförtunnande?",
        answer:
          "Djävulsklo ska inte kombineras med blodförtunnande läkemedel utan att man pratat med sin läkare. Berätta alltid om kosttillskott för din vårdkontakt när du står på receptbelagda mediciner.",
      },
    ],
    seoTitle: "Leder och rörlighet — naturliga tillskott | Biomax",
    seoDescription:
      "Djävulsklo, boswellia, kollagen — översikt över traditionella och kliniskt studerade ingångar för ledhälsa. Familjeägd hälsobutik i Kållered sedan 2001.",
    seoFocusKw: "tillskott leder",
  },
  {
    slug: "urinvagar",
    title: "Urinvägar — när det irriterar",
    shortTitle: "Urinvägar",
    summary:
      "En av de vanligaste anledningarna att söka efter naturliga alternativ — särskilt bland kvinnor. Översikt över de örter och xylitolbaserade tillskott som har en lång tradition inom urinvägsstöd.",
    intro: [
      "Återkommande besvär i de nedre urinvägarna är en av de vanligaste anledningarna att människor söker naturliga komplement — särskilt bland kvinnor. Det är jobbigt på flera plan: själva upplevelsen, frustrationen över att det kommer tillbaka, och oron för att antibiotika på sikt ska sluta fungera.",
      "Det här är ingen behandlingssida. Vid en akut urinvägsinfektion — och särskilt vid feber, blod i urinen eller smärta över ländryggen — ska du söka vård. Den här sidan beskriver vad människor har vänt sig till inom traditionell och modern växtmedicin för förebyggande och stödjande bruk.",
    ],
    approach: [
      "Björkglukos (xylitol) är en sockeralkohol som har studerats för sin förmåga att hindra bakterier från att fästa vid slemhinnor. Det är samma mekanism som ligger bakom xylitolens väldokumenterade verkan mot karies — bakterierna kan ta upp xylitol men inte använda den som näring.",
      "Tranbär (Vaccinium macrocarpon) är den mest studerade växtbaserade vägen vid urinvägsstöd. De aktiva ämnena är proantocyanidiner med en liknande verkan: de gör det svårare för bakterier att fästa.",
      "Chanca Piedra (Phyllanthus niruri) har en lång användning inom amazonsk och ayurvedisk tradition för njurar och urinvägar. Fullspektrumextrakt bevarar växtens hela ämnesprofil i stället för att isolera en enskild markör.",
      "Olivbladsextrakt har en lång tradition inom medelhavsmedicinen. Det aktiva ämnet oleuropein har studerats för sin antimikrobiella verkan i flera laboratoriestudier.",
    ],
    productSlugs: ["bjorkglukos", "chanca-piedra-60-kapslar", "olivblad-extrakt-60-kapslar"],
    ingredientSlugs: ["bjorkglukos", "chanca-piedra", "olivbladextrakt"],
    categorySlug: "urinvagsinfektion",
    faq: [
      {
        question: "När ska jag söka vård i stället för att försöka förebygga själv?",
        answer:
          "Vid feber, blod i urinen, smärta över ländryggen eller om besvären är akuta och svåra — då söker du vård. Naturliga komplement är avsedda för förebyggande och stödjande bruk, inte för att behandla en pågående infektion.",
      },
      {
        question: "Kan jag använda björkglukos och tranbär samtidigt?",
        answer:
          "Ja. De verkar via liknande mekanismer — båda försvårar för bakterier att fästa — och har inga kända negativa interaktioner med varandra. Många kombinationsprodukter innehåller båda.",
      },
    ],
    seoTitle: "Urinvägar — naturliga tillskott och traditionella örter | Biomax",
    seoDescription:
      "Björkglukos, tranbär, Chanca Piedra och olivbladsextrakt — orientering kring traditionella ingångar för urinvägsstöd. Familjeägd hälsobutik i Kållered.",
    seoFocusKw: "urinvägar naturligt",
  },
  {
    slug: "energi-och-trotthet",
    title: "Energi och trötthet — när bensinen tar slut tidigt på dagen",
    shortTitle: "Energi och trötthet",
    summary:
      "Trötthet som en natts sömn inte räcker till för att lyfta. Översikt över de näringsämnen som spelar en roll i kroppens egen energiproduktion — Q10, acetyl-l-karnitin, alfa-liponsyra och B-vitaminer.",
    intro: [
      "Att vara trött är inte samma sak som att vara sömnig. Den trötthet som hör ihop med energi är den som kryper på mitt på dagen och inte ger med sig för en kopp kaffe — den sitter i kroppen, inte i ögonlocken. Hjärnan kan vara klar medan musklerna vägrar hänga med.",
      "Många olika saker kan ligga bakom: järnbrist eller B12-brist hos kvinnor i fertil ålder, problem med sköldkörteln, biverkningar av läkemedel (statiner är ett klassiskt exempel — de hämmar samma biokemiska väg som kroppens egen Q10-produktion). En del av tröttheten är livssituation och går inte att kapsla bort.",
      "Men en del av tröttheten handlar om själva energiproduktionen i cellerna — det som händer i mitokondrierna när näring omvandlas till ATP. Där har kosttillskott en konkret roll.",
    ],
    approach: [
      "Koenzym Q10 sitter mitt i mitokondriernas andningskedja och är ett av de få ämnen som måste finnas på plats för att cellen ska kunna producera energi alls. Kroppen tillverkar det själv, men produktionen avtar med åldern, och vissa läkemedel — statiner — hämmar samma syntesväg. Q10 är fettlösligt och tas upp bäst tillsammans med en fettrik måltid.",
      "Acetyl-l-karnitin är en transportmolekyl som flyttar fettsyror in i mitokondrierna där de kan förbrännas för energi. Skillnaden mot vanlig l-karnitin är att den acetylerade formen passerar blod-hjärnbarriären — vilket är anledningen till att den brukar förknippas med både fysisk och mental energi.",
      "Alfa-liponsyra fungerar som koenzym för flera enzymkomplex i citronsyracykeln. Den ovanliga egenskapen att vara både vatten- och fettlöslig gör att den kan verka i alla delar av cellen.",
      "B-vitaminerna är kofaktorer i många steg av energimetabolismen. Riboflavin (B2), niacin (B3), B6 och B12 ingår alla i de enzymer som omvandlar mat till ATP. B-vitaminerna förbrukas snabbare i perioder av hög stress och fysisk ansträngning.",
    ],
    productSlugs: [
      "q10-100mg-100-kapslar",
      "alcar-60-kapslar",
      "alpha-lipoic-acid-60-kapslar",
      "nac-60-kapslar",
    ],
    ingredientSlugs: [
      "koenzym-q10",
      "acetyl-l-karnitin",
      "alfa-liponsyra",
      "n-acetylcystein",
      "vitamin-b6",
      "magnesium",
    ],
    categorySlug: "hjarta-karl",
    faq: [
      {
        question: "Är Q10 vettigt om jag står på statiner?",
        answer:
          "Många som äter statiner väljer att komplettera med Q10, just för att statinerna hämmar samma biokemiska väg som kroppens egen Q10-produktion. Studierna på tillskott vid statinanvändning är blandade, men säkerheten är generellt god. Prata gärna med läkare innan du börjar om du står på medicin.",
      },
      {
        question: "När på dagen tar man energitillskotten?",
        answer:
          "Q10 och acetyl-l-karnitin tas oftast på morgonen eller tidig eftermiddag tillsammans med en måltid — många märker en lätt uppiggande effekt och vill därför inte ta dem sent på kvällen. Magnesium passar däremot bra till kvällen.",
      },
      {
        question: "När märker man av eventuell effekt?",
        answer:
          "Energirelaterade tillskott bygger oftast upp sin verkan över veckor och månader snarare än direkt. 4–8 veckors regelbunden användning är en rimlig tid att utvärdera på.",
      },
    ],
    seoTitle:
      "Energi och trötthet — naturliga tillskott som stödjer cellernas energiproduktion | Biomax",
    seoDescription:
      "Q10, acetyl-l-karnitin, alfa-liponsyra och B-vitaminer — orientering kring de näringsämnen som har en plats i kroppens egen energiproduktion. Familjeägd hälsobutik i Kållered.",
    seoFocusKw: "tröttighet naturligt",
  },
  {
    slug: "hjarna-och-minne",
    title: "Hjärna och minne — när tankarna går trögare",
    shortTitle: "Hjärna och minne",
    summary:
      "Glömskhet, sämre koncentration, ord som inte vill komma fram. Översikt över de näringsämnen och växter som har en plats i traditionell och modern hjärnnutrition.",
    intro: [
      "Den sortens glömskhet — orden som inte vill komma fram, namnen som glider undan, ärendet man gick in i köket för att uträtta — är vanlig och oftast helt normal. Den kommer med åldern, med stressen, med dålig sömn, med för många saker som ska tas tag i samtidigt.",
      "Det som i vardagstal kallas \"hjärndimma\" är inte en medicinsk diagnos, men en upplevelse väldigt många känner igen — särskilt efter en virusinfektion, i klimakteriets förstadier, eller efter en längre period av sömnbrist.",
      "Den här sidan ger en översikt över de näringsämnen och växter som har en plats inom traditionell och modern hjärnnutrition. Vid tydlig, snabb eller fortsatt försämring — kontakta vården.",
    ],
    approach: [
      "Acetyl-l-karnitin är en av få aminosyror som passerar blod-hjärnbarriären och som har en roll i hjärnans mitokondriella energiproduktion. Den finns med i flera kliniska studier på åldersrelaterade kognitiva förändringar.",
      "Koenzym Q10 är nödvändigt för cellens energiproduktion och finns i höga koncentrationer i hjärnans nervceller. Kombinationen Q10 + acetyl-l-karnitin är en klassisk mitokondriellt inriktad kombination.",
      "B-vitaminerna — särskilt B6, B12 och folsyra — är kofaktorer i hjärnans metylcykel och i bildningen av flera signalsubstanser. Brist på B12 är en av de oftast förbisedda orsakerna till att tankarna går trögare hos äldre.",
      "Magnesium har en mängd roller i hjärnan, bland annat som modulator av så kallade NMDA-receptorer som är centrala för minne och inlärning. Brist är vanlig och kopplad till en rad neurologiska symptom.",
    ],
    productSlugs: ["alcar-60-kapslar", "q10-100mg-100-kapslar"],
    ingredientSlugs: [
      "acetyl-l-karnitin",
      "koenzym-q10",
      "vitamin-b6",
      "folsyra",
      "magnesium",
      "alfa-liponsyra",
    ],
    categorySlug: "hjarna-och-minne",
    faq: [
      {
        question: "Vad är skillnaden mellan l-karnitin och acetyl-l-karnitin?",
        answer:
          "Båda transporterar fettsyror in i mitokondrierna för energiproduktion. Den acetylerade formen passerar dessutom blod-hjärnbarriären och är därför den variant man brukar välja när det är hjärnan och kognitionen man är ute efter — inte musklerna.",
      },
      {
        question: "När bör jag söka vård i stället för att försöka med kosttillskott?",
        answer:
          "Vid snabba eller fortsatta försämringar, vid förändringar i personlighet eller orienteringsförmåga, vid svårigheter med vardagliga aktiviteter — kontakta läkare. Kosttillskott är tänkta för mild glömskhet kopplad till ålder eller stress, inte för misstänkt demens eller annan kognitiv sjukdom.",
      },
    ],
    seoTitle:
      "Hjärna och minne — naturliga tillskott för kognitivt stöd | Biomax",
    seoDescription:
      "Acetyl-l-karnitin, Q10, B-vitaminer och magnesium — orientering kring näringsämnen och växter med tradition inom hjärnans nutrition. Familjeägd hälsobutik i Kållered.",
    seoFocusKw: "hjärnan tillskott",
  },
  {
    slug: "hjarta-och-blodkarl",
    title: "Hjärta och blodkärl — stöd för cirkulation och blodtryck",
    shortTitle: "Hjärta och blodkärl",
    summary:
      "Kosttillskott med tradition inom hjärt- och kärlhälsa: Q10, magnesium, K3-vitamin, alfa-liponsyra och flera B-vitaminer. Beskrivet utifrån funktion — inte diagnos.",
    intro: [
      "Hjärt- och kärlhälsa är ett område där livsstilen — kost, motion, sömn, stresshantering — gör det mesta av det som faktiskt går att påverka. Inga kosttillskott ersätter de grundläggande bitarna.",
      "Men inom nutritionen finns flera ämnen med konkreta, väldokumenterade roller i hjärtmuskelns energiproduktion, i blodkärlens funktion och i de processer som påverkar blodets sammansättning. Den här sidan beskriver de viktigaste utan att gå in på behandling av sjukdomar.",
      "Vid kända hjärt- eller kärlsjukdomar, högt blodtryck eller pågående medicinering — prata alltid med din läkare innan du börjar med kosttillskott.",
    ],
    approach: [
      "Koenzym Q10 finns i särskilt höga koncentrationer i hjärtmuskeln — varje cell där har ovanligt stora energibehov och tätt packade mitokondrier. Den som äter statiner har lägre Q10-nivåer i kroppen, eftersom statinerna blockerar samma biokemiska väg som Q10-produktionen. Q10 i kombination med statinbehandling är en av de mest studerade kombinationerna inom området.",
      "Magnesium har en lång lista roller i hjärtfunktionen — hjärtmuskelns rytm, blodkärlens spänning, regleringen av blodtrycket. Magnesiumbrist kopplas bland annat till oregelbunden hjärtrytm.",
      "K2/K3-vitamin är inblandat i regleringen av kalciumtransporten i kroppen — det aktiverar ett protein (matrix-GLA-protein) som hjälper till att hålla kalcium borta från kärlväggarna och i benvävnaden, där det hör hemma. Det är inom den här rollen som K-vitamin samlar mest forskningsintresse i dag.",
      "Alfa-liponsyra och NAC fungerar båda som antioxidanter med betydelse för kärlfunktionen. Alfa-liponsyra för sin förmåga att verka i både vatten- och fettlösliga miljöer; NAC som byggsten för glutation, kroppens viktigaste interna antioxidant.",
    ],
    productSlugs: [
      "q10-100mg-100-kapslar",
      "h-technology",
      "alpha-lipoic-acid-60-kapslar",
      "menadione",
    ],
    ingredientSlugs: [
      "koenzym-q10",
      "magnesium",
      "k3-vitamin",
      "alfa-liponsyra",
      "n-acetylcystein",
      "kalcium",
    ],
    categorySlug: "hjarta-karl",
    faq: [
      {
        question: "Kan jag ta de här tillskotten om jag står på blodtrycks- eller blodförtunnande medicin?",
        answer:
          "Vissa kan ha interaktioner. K-vitamin kan påverka effekten av warfarin (Waran). Q10 kan i höga doser ge en mild blodförtunnande effekt. Stäm alltid av kosttillskott med din läkare när du står på hjärt- och kärlmedicin.",
      },
      {
        question: "Varför kommer magnesium upp så ofta när det gäller hjärtat?",
        answer:
          "Magnesium är inblandat i hjärtmuskelns sammandragningsrytm, blodkärlens spänning och kroppens elektrolytbalans. Det är dessutom ett av de mineraler där lätt brist är som mest spridd — särskilt vid långvarig stress, vid behandling med vätskedrivande och vid magsyrahämmare.",
      },
    ],
    seoTitle:
      "Hjärta och blodkärl — naturliga tillskott för cirkulation | Biomax",
    seoDescription:
      "Q10, magnesium, K3-vitamin och alfa-liponsyra — orientering kring näringsämnen med plats inom hjärt-kärlhälsa. Familjeägd hälsobutik i Kållered sedan 2001.",
    seoFocusKw: "hjärta kärl tillskott",
  },
  {
    slug: "immunforsvar",
    title: "Immunförsvar — stöd när motståndskraften behöver det",
    shortTitle: "Immunförsvar",
    summary:
      "Beta-glukaner, olivbladsextrakt, NAC och probiotika — kosttillskott som har sin plats i immunförsvarets olika lager. En översikt för förebyggande och stödjande bruk.",
    intro: [
      "Immunförsvaret är inte en enda sak utan ett system av flera lager: hudens och slemhinnornas barriärer, det medfödda försvaret som reagerar snabbt och brett, det adaptiva försvaret som lär sig att känna igen specifika hot. Kosttillskott kan stötta vissa av lagren — men ingen kapsel ersätter sömn, kost, motion och frisk luft som grunder.",
      "Den här sidan beskriver de tillskott som har starkast forskningsstöd eller starkast tradition för att stötta immunförsvaret — utan att utlova att förebygga infektion eller behandla sjukdom.",
    ],
    approach: [
      "Beta-glukaner (1,3/1,6-glukaner från jäst, havre eller svamp) är fibrer som immunsystemet känner igen via specifika receptorer (Dectin-1) som om de vore mikroorganismer — vilket aktiverar det medfödda försvarets första linje. Det är en av de mest studerade fiberkomponenterna inom immunologi.",
      "Olivbladsextrakt har en lång tradition inom medelhavsmedicinen. Den aktiva komponenten oleuropein har dokumenterad antimikrobiell verkan i laboratoriestudier och används traditionellt vid säsongsväxlingar.",
      "NAC är byggsten för glutation — kroppens viktigaste interna antioxidant. NAC har också en lång klinisk historia som slemlösare för luftvägarna och säljs i flera länder som receptfritt läkemedel just för det.",
      "Probiotika och fibrer som FOS stöttar tarmflorans sammansättning. Tarmen är immunförsvarets största enskilda organ — en stor andel av kroppens immunceller sitter i själva tarmslemhinnan, och tarmens skick och immunförsvarets funktion hänger tätt samman.",
      "C-vitamin (natriumaskorbat) är det mest spridda och välkända immuntillskottet. Den mest robusta effekten i studierna är att förkylningssymptom blir kortare — inte att de förebyggs helt.",
    ],
    productSlugs: [
      "beta-glucan",
      "olivblad-extrakt-60-kapslar",
      "nac-60-kapslar",
      "super-probiotika-60-kapslar",
    ],
    ingredientSlugs: [
      "beta-glucan",
      "olivbladextrakt",
      "n-acetylcystein",
      "probiotika",
      "natriumaskorbat",
      "vitamin-a",
    ],
    categorySlug: "immunforsvar",
    faq: [
      {
        question: "Ska man ta immuntillskott året runt eller bara under säsong?",
        answer:
          "Olika tillskott har olika logik. Beta-glukaner och probiotika är vanliga att ta året runt som en del av en daglig rutin. Olivbladsextrakt och C-vitamin används oftare säsongsvis — under höst och vinter, eller inför en resa.",
      },
      {
        question: "Är det vettigt att kombinera flera immuntillskott?",
        answer:
          "Beta-glukaner (det medfödda försvaret), probiotika (tarmimmuniteten) och olivbladsextrakt (den antimikrobiella traditionen) verkar via olika mekanismer och kan komplettera varandra. Att stapla flera C-vitaminprodukter på varandra är däremot oftast meningslöst — välj en och se till att den ger en tillräcklig dos.",
      },
    ],
    seoTitle:
      "Immunförsvar — naturliga tillskott för motståndskraft | Biomax",
    seoDescription:
      "Beta-glukaner, olivbladsextrakt, NAC och probiotika — översikt över tillskott med plats i immunförsvarets olika lager. Familjeägd hälsobutik i Kållered.",
    seoFocusKw: "immunförsvar tillskott",
  },
  {
    slug: "antioxidanter-och-aldrande",
    title: "Antioxidanter och åldrande — när cellerna behöver mer underhåll",
    shortTitle: "Antioxidanter",
    summary:
      "Oxidativ stress, mitokondriell trötthet, åldersrelaterad nedgång i kroppens egna antioxidantsystem. En översikt över de tillskott som har sin plats i cellernas biokemi när åldern ger sig till känna.",
    intro: [
      "Åldrande är inte ett tillstånd — det är en samling processer som pågår parallellt och i olika takt. En del är genetiskt programmerade. En annan del är det biokemisterna kallar oxidativ stress: ansamlade cellskador från reaktiva syreföreningar (ROS) som kroppen själv producerar som biprodukt av sin egen energiomsättning.",
      "Kroppen har omfattande egna försvar mot detta — glutation, superoxiddismutas, katalas och en hel orkester av antioxidantmolekyler som återställer varandra. Men kapaciteten i de här systemen minskar med åren.",
      "Den här sidan beskriver de tillskott som har sin plats i den åldrande cellens biokemi — som byggstenar, som direkt verkande antioxidanter eller som stöd för kroppens egna försvar.",
    ],
    approach: [
      "Koenzym Q10 har dubbla roller: som elektronbärare i mitokondriernas andningskedja och som fettlöslig antioxidant i cellmembranen. Kroppens egen Q10-produktion sjunker successivt från ungefär 25 års ålder.",
      "Alfa-liponsyra är en av få antioxidanter som är verksam i både vatten- och fettlösliga delar av cellen. Den återställer dessutom flera andra antioxidanter (vitamin C, vitamin E, glutation) sedan de förbrukats — vilket gjort att den ibland kallas \"antioxidanten för antioxidanter\".",
      "NAC är byggsten för glutation, den intracellulära antioxidant som kroppen tillverkar själv i störst mängd. Att ta glutation direkt fungerar dåligt — det tas upp i mycket liten utsträckning. Att tillföra cystein (via NAC) är ett betydligt mer effektivt sätt att höja vävnadsnivåerna.",
      "Vitamin E är den viktigaste fettlösliga antioxidanten i cellmembranen, där den skyddar fleromättade fettsyror från oxidation. Den fungerar i samspel med vitamin C — vitamin C återställer förbrukad vitamin E.",
      "Bredd är centralt: enskilda antioxidanter fungerar inte var och en för sig. Glutationsystemet, alfa-liponsyra, vitamin C, vitamin E och Q10 utgör tillsammans en kedja som återställer varandra, där varje länk är beroende av de övriga.",
    ],
    productSlugs: [
      "q10-100mg-100-kapslar",
      "alpha-lipoic-acid-60-kapslar",
      "nac-60-kapslar",
    ],
    ingredientSlugs: [
      "koenzym-q10",
      "alfa-liponsyra",
      "n-acetylcystein",
      "vitamin-e",
    ],
    categorySlug: "hjarta-karl",
    faq: [
      {
        question: "Är höga doser av enskilda antioxidanter alltid bra?",
        answer:
          "Nej. Forskningen om höga doser av enskilda antioxidanter — vitamin E är det mest kända exemplet — har varit blandad, och i vissa studier har man till och med sett oväntat negativa effekter. Det är därför den moderna inriktningen ligger på balanserade kombinationer i fysiologiska doser snarare än megadoser av enskilda ämnen.",
      },
      {
        question: "Är NAC och glutation samma sak?",
        answer:
          "Nej, men de hör ihop. NAC är acetylcystein — en byggsten. Glutation är den färdiga tripeptiden (glutaminsyra + cystein + glycin) som kroppen tillverkar i sina egna celler. Cystein är det som begränsar tempot i glutationsyntesen, så NAC är ett effektivt sätt att höja glutationnivåerna — utan att försöka tillföra glutation direkt, vilket tas upp dåligt.",
      },
    ],
    seoTitle:
      "Antioxidanter och åldrande — naturliga tillskott för cellskydd | Biomax",
    seoDescription:
      "Q10, alfa-liponsyra, NAC och vitamin E — översikt över tillskott med plats i cellernas biokemi när åldern ger sig till känna. Familjeägd hälsobutik i Kållered.",
    seoFocusKw: "antioxidant tillskott",
  },
];

export function getSymptom(slug: string): SymptomEntry | null {
  return SYMPTOMS.find((s) => s.slug === slug) ?? null;
}

export function getAllSymptoms(): SymptomEntry[] {
  return SYMPTOMS;
}
