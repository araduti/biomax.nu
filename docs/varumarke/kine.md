# Kine — varumärket i korthet

**Status:** Utkast, syskon till ADR 0026 (Föreslagen). Namnet är
villkorat av en varumärkeskontroll mot KINE Inc. — se öppna frågor i
ADR 0026.
**Avsändare:** Ampliosoft AB · **Datum:** 2026-05-18

## Vad Kine är

Kine är en färdig webbutik för små svenska handlare. En bagare i
Kållered registrerar sig och säljer — med Kustom- och Swish-kassa,
PostNord-etiketter, rätt moms och korrekt bokföring — på en kvart.

En produkt från **Ampliosoft AB**. Biomax HB är kund nummer ett, inte
ägare (ADR 0026 §0).

## Namnet

- **Kine** är det enda föremål varje svensk kund redan tar i:
  *"Lägg i korgen."* Det behöver ingen förklaring.
- **kine.se** är själva budskapet — det läses *"kine nu"*. Domänen
  säljer produkten.
- Hör ihop med resten: biomax.nu → kine.se. `.nu` är en svensk
  domän i folkmun, så familjen känns medveten, inte hoptejpad.
- Dubbeltydigheten bär hela produkten: din **varukorg** och din
  **butik** är samma ord. "Öppna din Kine" betyder båda.

## Marknaden (kort, med belägg)

Inget av detta får bygga på en halmgubbe. Så här ser det faktiskt ut:

- **De svenska konkurrenterna finns redan och är just svenska.**
  Wikinggruppen är störst med omkring 3 % av alla svenska e-handlare,
  Abicart (tidigare Textalk Webshop) har funnits sedan 1998 med
  3 800+ kunder, Quickbutik ligger runt 2 %. Alla är svenskbyggda,
  har svensk support och kör redan Klarna och PostNord. **"Vi är
  svenska" är därför ingen position — det är de också.** Det som
  sticker ut hos dem är i stället ålder och tröghet, inte att de
  saknar Swish.
- **Shopifys svenska glapp är konkreta, inte hypotetiska.** Klarna via
  Shopify funkar bara i butikens basvaluta och bara när kunden checkar
  ut med e-post (inte enbart telefonnummer). Bokföring mot Fortnox/Visma
  kräver en tredjepartsapp (t.ex. Junipeer), kostar ca 3 000–8 000
  kr/år och ger ändå inte full automatik. Shopify i Sverige =
  ihoptejpat, löpande appkostnad, bokföringen aldrig riktigt löst.
- **Den verkligt olösta smärtan är bokföringen, inte kassan.** Kassan
  (Klarna/Swish) är i praktiken löst överallt. Det små handlare
  faktiskt svär över är kedjan order → moms → Fortnox/Visma/Bokio →
  bokföringslagssäkert arkiv. De vill, med deras egna ord, sköta
  momsen "utan att skriva ut ett enda papper" — och gör det idag med
  byrå, app eller tejp.
- **Varning från historien: Tictail.** Den ursprungliga "svenska
  Shopify för små butiker". Älskad produkt, ~33 MUSD i kapital — ändå
  till slut nedlagd och nödsåld till Shopify. Sensmoral: *svensk plus
  fin produkt är ingen vallgrav* (Tictail hade båda). Det som fällde
  dem var en gratismodell som åt upp marginalen och en svag
  intäktsmodell. Kine måste ha en vallgrav som inte är "vi är
  trevligare", och en prismodell som bär redan från första kund.

## Vår position

> **Kine — hela vägen in i bokföringen. Inte ännu en svensk
> webbutik, utan den enda där momsen och bokföringen redan är klar.**

Vallgraven är inte att vi är svenska — det är de andra också. Den är
*hur djupt* det svenska går: Kine äger kedjan ända in i
bokföringslagen. Order, moms, fraktunderlag och SIE/Fortnox-export
hänger ihop från början, korrekt arkiverat i sju år, utan en enda app
att köpa, byrå att blidka eller pappersutskrift. De etablerade är
gamla och tröga; Shopify är ihoptejpat och har en löpande appnota;
Kine gör det till plattformens grund — för att vi bara gör det
svenska. Vi lägger aldrig till andra valutor, fri temamotor eller
tilläggsbutik (ADR 0026 §8). Och vi går inte i gratisfällan som
dödade Tictail: enkel prissättning som bär redan från första butik,
inte gratis tills marginalen tar slut.

**En mening:** *Momsen och bokföringen är redan gjord.*

## Varumärkesarkitektur

`Kine` är huvudnamnet. Funktionerna heter raka svenska ord — inte egna
undervarumärken med egna logotyper:

- **Kine Kassa** — kassan (Kustom/Klarna/Swish).
- **Kine Frakt** — PostNords ombud och fraktsedlar.
- **Kine Moms** — rätt moms, tål ändrade skattesatser.
- **Kine Bokföring** — underlag som följer bokföringslagen, plus
  export. Kärnan för dataskydd, samtycke och gallring (ADR 0023–0025)
  görs här tillgänglig *för handlaren*, så att hen kan svara sina egna
  kunder.

Avsändare: **Kine** · *en produkt från Ampliosoft AB*.
Varje butik bor på `{butik}.kine.se` (egen domän går också bra).
Internt är biomax.nu `biomax.kine.se`.

## Tonläge

Varmt, enkelt, tryggt. Talad svenska — inte kanslisvenska och inte
översatt. Samma tonläge som biomax-butiken, hållet till samma krav på
ren svenska. Korta meningar. Ingen plattformsjargong ("onboarda",
"aktivera ditt workspace"). Vi pratar som någon som själv har drivit
butik.

**Mikrotexter, stund för stund:**

- Knapp vid registrering: **Öppna din Kine**
- Tom butik, första gången: *Din Kine är tom — precis som en ny butik.
  Lägg in din första vara så är du igång.*
- När butiken öppnar: *Din butik är öppen. Börja sälj nu.* ("nu" är
  inte en slump — det är domänen)
- Inga varor än: *Inga varor än. Det första du säljer börjar här.*
- När gränsen närmar sig: *Din Kine växer. Dags för nästa steg?* (aldrig
  ett kallt "uppgradera ditt abonnemang")
- Radera konto / hämta data (dataskydd per butik): samma lugna ton som
  på `/konto/dataskydd`.

## Det här är Kine inte

- Inte global. Bara sv-SE — det är vår nisch, inte en begränsning
  (minne: `project_swedish_only`).
- Ingen fri temamotor. Bara utvald, tillgänglig profilering byggd på
  formgivningens tokens (ADR 0026 §6).
- Ingen marknadsplats, ingen B2B, inga flera lager, inga andra valutor.
- Inte "Biomax fast för andra". Ingenstans i plattformens kod,
  prissättning eller inloggning står det "biomax" (ADR 0026 §0).

## Att klara av innan extern användning

- **Varumärkeskontrollen mot KINE Inc. är blockerande** (PRV i Sverige
  + EUIPO, Nice-klass 35 och 42). Ha ett reservnamn redo. Ledig domän
  betyder inte ledigt varumärke. (ADR 0026, öppna frågor.)
- Ordmärke, logotyp, färg och skalet `{butik}.kine.se` är formgivning
  som inte är påbörjad — det här dokumentet är position och tonläge,
  inget annat.
