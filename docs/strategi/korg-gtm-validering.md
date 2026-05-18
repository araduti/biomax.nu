# Korg — plan för marknadsväg och validering av bytesutlösare

**Status:** Utkast, syskon till ADR 0026 (Föreslagen) och
`docs/varumarke/korg.md`. Det här dokumentet är på svenska med flit —
det är marknads- och kundarbete, inte teknik (se minnesregeln om att
tänka på svenska för den svenska produkten).
**Avsändare:** Ampliosoft AB · **Datum:** 2026-05-18

## Varför det här dokumentet finns

Forskningen (ADR 0026, "Market reality") säger tre obekväma saker:

1. Konkurrenterna är redan svenska — "vi är svenska" är ingen position.
2. Den olösta smärtan är bokföringen, inte kassan.
3. Tictail hade älskad produkt och 33 MUSD och dog ändå.

Slutsatsen är inte "bygg fortare". Den är: **handlare byter sällan en
fungerande butik. Vi måste bevisa att det finns en verklig
bytesutlösare och en prismodell som bär — innan vi bygger
flerhyresgäst­infrastrukturen i ADR 0026 fas 2+.** Det här är
disciplinen Tictail saknade.

## Den centrala frågan

> Finns det ett tillräckligt stort segment svenska mikrohandlare för
> vilka momsen-och-bokföringen-redan-gjord är så smärtsamt att de
> antingen **väljer Korg vid nystart** eller **byter från det de har** —
> till ett pris som bär enhetsekonomin från första kund?

Allt nedan är till för att besvara den med bevis, inte hopp.

## Hypoteser (falsifierbara, rangordnade efter risk)

| # | Hypotes | Falsifieras om |
|---|---------|----------------|
| H1 Smärta | Kedjan order → moms → Fortnox/Visma/Bokio → bokföringslags­arkiv är topp-3-smärta och kostar mätbar tid/pengar | Handlare rankar den lågt, eller "byrån fixar det, jag tänker inte på det" |
| H2 Utlösare | Det finns konkreta återkommande ögonblick som utlöser byte/val (nystart, momsdeklaration, bokslut, byråfaktura, Shopify-appnota) | Ingen kan peka på ett ögonblick; "det rullar på" |
| H3 Betalningsvilja | De betalar ett pris som bär (ersätter appstack + del av byråkostnad), utan gratisnivå | Intresset dör så fort ett pris nämns |
| H4 Budskap | "Momsen och bokföringen är redan gjord" slår "ännu en svensk webbutik" | Budskapet landar inte bättre än incumbenternas |
| H5 Bytestriction | Migrering (katalog, kunder, domän, bokföringshistorik) är inte en dödsstöt för "less-segmentet" | Även sugna handlare fastnar i bytesfriktion |

H1, H2 och H3 är de som dödar projektet om de är falska. Validera dem
först och billigast.

## Segment (brohuvud, inte "alla")

Mikrohandlare i Sverige: enskild firma eller litet AB, 0–3 anställda,
låg ordervolym, bokför i Fortnox/Visma/Bokio. Två delsegment att testa
separat — de har olika utlösare:

- **A · Nystartaren** — startar eller flyttar ut sin fysiska
  butik på nätet nu. Ingen bytesfriktion. Utlösare = nystart.
  ("Bagaren i Kållered".)
- **B · Den trötta bytaren** — har redan butik på Shopify (betalar
  appnota för Klarna/Fortnox/PostNord) eller på en åldrande svensk
  plattform (Wikinggruppen/Abicart/Quickbutik). Utlösare = en konkret
  irritation (appnota, bokslutsstrul, dålig UX).

Tredje, indirekt kanal som är värd ett eget spår: **redovisningsbyråer**
som sköter många mikrohandlares bokföring — de känner H1-smärtan på
kundens vägnar och kan vara distributionskanal, inte bara intervjuobjekt.

## Metod — billigt → dyrt, med stoppkriterier

Ingen kod i ADR 0026 fas 2+ förrän Grind 1 är passerad.

### Fas 0 — Skrivbord + byråsamtal (1 vecka)
Kartlägg incumbenternas pris, appnotan på Shopify (verkliga siffror),
och prata med 3–5 redovisningsbyråer som har mikrohandlare som kunder.
*Fråga:* var tappar dina e-handelskunder tid/pengar i bokföringskedjan?
**Stopp om:** byråerna säger att det redan är ett löst, smärtfritt
flöde.

### Fas 1 — Problemintervjuer (10–15 st, 2–3 veckor)
"The Mom Test"-disciplin: fråga om *dåtida konkret beteende*, pitcha
inte, nämn inte Korg. Båda delsegmenten. Spela in, koda smärtor.
**Mått:** ≥ 60 % nämner bokförings-/momskedjan oombedd som en
topp-3-smärta. **Stopp om:** under 40 %.

### Fas 2 — Kartlägg bytesutlösaren (parallellt med Fas 1)
För var och en som uttryckte smärta: *när senast gjorde det ont, och
vad gjorde du då?* Leta efter ett återkommande, daterbart ögonblick.
**Mått:** ett namngivet, återkommande ögonblick hos ≥ 50 %.
**Stopp om:** smärtan är diffus och aldrig kopplad till ett tillfälle
(då finns ingen säljbar utlösare — Tictails fälla).

### Fas 3 — Intressetest med pris (låtsasdörr, 2 veckor)
Svensk landningssida som säljer löftet *och nämner ett pris*, med CTA
"Boka tidig plats". Driv trafik från kanalerna nedan. Mät klick →
e-post → uttalad betalningsvilja (helst en liten förbokningsavgift som
äkta signal, aldrig "gratis i kö").
**Mått:** definierad konverteringströskel från annonsklick till
prismedveten anmälan (sätts mot trafikkostnad i Fas 0). **Stopp om:**
intresset faller av en klippa så fort priset syns (H3 falsk).

### Fas 4 — Manuell pilot (concierge, 4–6 veckor)
3–5 pilothandlare. Vi kör bokföringskedjan **för hand** mot deras
Fortnox/Visma — ingen flerhyresgäst­plattform byggd än. Bevisar att
värdelöftet håller och att de betalar för utfallet, inte för mjukvaran.
**Mått:** ≥ 3 av 5 betalar för fortsättning efter pilot.
**Stopp om:** de gillar det men inte betalar (Tictail igen).

## Grindar mot ADR 0026

| Grind | Passeras av | Låser upp |
|-------|-------------|-----------|
| **Grind 1** | Fas 1 + 2: smärtan är topp-3 och har en daterbar utlösare | ADR 0026 fas 1 (Tenant + RLS-spik, biomax som ensam hyresgäst) får börja |
| **Grind 2** | Fas 3 + 4: prismedvetet intresse + ≥ 3/5 betalande pilothandlare | ADR 0026 fas 2+ (extern onboarding, fakturering) får byggas; namn-/varumärkesgrinden (KORG Inc.) måste också vara klar |

Fas 1-spiken i ADR 0026 (ren teknik, ingen extern kund) får löpa
parallellt med Fas 0–2 här — den är billig och reversibel. Allt med
extern kund är låst bakom Grind 2.

## Kanaler att testa (för Fas 3-trafik)

- Redovisningsbyråer som rekommenderar uppåt (provisions-/partnerspår).
- Svenska småföretagar- och e-handelsgrupper (Facebook, Ehandel.se).
- Nyregistrerade firmor (Bolagsverket) → Segment A.
- Riktad uppsökning mot Shopify-handlare som klagar på appnotan →
  Segment B.

Kanal är en egen hypotes: billigast fungerande kanal i Fas 3 avgör om
enhetsekonomin går ihop — notera anskaffningskostnad, inte bara
konvertering.

## Instrument (svenska, färdiga att använda)

### Screener (kvalificera intervjuperson)
- Driver du en butik som säljer på nätet, eller är på väg att börja?
- Hur många är ni som jobbar i den?
- Vilket bokföringsprogram använder du? Sköter du det själv eller en
  byrå?
- Vad säljer du, ungefär hur många ordrar i veckan?

### Intervjuguide — problem (pitcha inte, prata dåtid)
1. Berätta om förra gången du gjorde momsdeklaration. Vad gjorde du,
   steg för steg?
2. Vad i det där tog längst tid eller kändes osäkert?
3. Sist något strulade mellan butiken och bokföringen — vad hände?
4. Vad kostar bokföringen dig idag, i kronor och i tid?
5. Om du fick trolla bort en sak i hela kedjan order-till-bokslut —
   vilken?
   *(Inga ledande frågor om Korg. Bara deras värld.)*

### Intervjuguide — utlösare
6. När gjorde det senast riktigt ont? Vad var det som hände just då?
7. Vad gjorde du åt det? Bytte du något, eller stod du ut?
8. Vad skulle ha fått dig att byta plattform den dagen?

### Uppsökning till handlare (kort, ber om hjälp – säljer inte)
> Hej! Jag undersöker hur små svenska butiker hanterar moms och
> bokföring kring sin nätförsäljning — inget säljsnack, jag bygger
> inget åt dig idag. Skulle du ha 20 minuter att berätta hur du gör
> idag? Det hjälper mig enormt.

### Uppsökning till redovisningsbyrå
> Hej! Ni sköter bokföring åt mindre e-handlare. Jag kartlägger var
> det krånglar mellan webbutik och bokföring för era kunder. Får jag
> ställa några frågor — och höra om det är ett återkommande problem ni
> ser?

### Landningssida (Fas 3, låtsasdörr — med pris)
- Rubrik: **Momsen och bokföringen är redan gjord.**
- Underrubrik: *Webbutik för svenska handlare. Order, moms, frakt och
  bokföringsunderlag hänger ihop från dag ett — ingen app att köpa,
  ingen pappersutskrift.*
- Pris synligt (ett tal, en rad — inte "kontakta oss", inte "gratis").
- CTA: **Boka tidig plats** → e-post + liten förbokningsavgift.
- Mät: klick → CTA → genomförd förbokning.

## Anti-Tictail-spärrar (gäller alla faser)

- **Ingen gratisnivå i något test.** Pris syns alltid. Intresse utan
  prislapp är inte data.
- **Betalning slår beröm.** "Vad fint" räknas inte; förbokningsavgift,
  pilotbetalning och avtal räknas.
- **Utlösare slår produkt.** En älskad produkt utan ett daterbart
  bytestillfälle är exakt Tictails dödsorsak.
- **Bygg inte före Grind 2.** Concierge-piloten bevisar värdet utan
  ADR 0026:s dyra infrastruktur.

## Roller och tidslinje (grovt)

| Vecka | Aktivitet |
|-------|-----------|
| 1 | Fas 0: skrivbord + byråsamtal |
| 2–4 | Fas 1 + 2: problem- och utlösarintervjuer |
| 4 | **Grind 1-beslut** |
| 5–6 | Fas 3: landningssida + trafik |
| 7–12 | Fas 4: concierge-pilot, 3–5 handlare |
| 12 | **Grind 2-beslut** → go/no-go för ADR 0026 fas 2+ |

Ägarskap (vem driver intervjuer, vem byggsidan, vem byråkontakten) är
en öppen fråga tills resurssättningen i ADR 0026 är besvarad.
