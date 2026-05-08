export default function Home() {
  const categories = [
    "Hjärna & Minne",
    "Immunförsvar",
    "Hjärta-Kärl",
    "Leder",
    "Mage-Tarm",
    "Energi & Återhämtning",
  ];

  const bestsellers = [
    { name: "Omega-3 Premium", benefit: "Hjärta, hjärna & syn" },
    { name: "Magnesium Plus", benefit: "Muskler, sömn & återhämtning" },
    { name: "Immun Boost C+D3", benefit: "Stöd för immunförsvar året runt" },
  ];

  return (
    <div className="flex flex-col bg-gradient-to-b from-[#f5fbf7] to-white">
      <section className="mx-auto w-full max-w-6xl px-4 pb-12 pt-10 md:px-8 md:pt-16">
        <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm md:p-10">
          <p className="inline-flex rounded-full bg-emerald-50 px-4 py-1 text-sm font-medium text-emerald-700">
            Vetenskapligt baserat • Svensk hälsokost
          </p>
          <h1 className="mt-6 max-w-2xl text-4xl font-semibold tracking-tight text-emerald-950 md:text-6xl">
            Livskvalitet i fokus
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-emerald-900/80">
            Premiumtillskott för dig som vill må bättre varje dag – med tydliga
            ingredienser, trygg betalning med Klarna och snabb leverans.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/produkter"
              className="rounded-full bg-emerald-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              Handla produkter
            </a>
            <a
              href="/om-oss-2"
              className="rounded-full border border-emerald-300 px-6 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50"
            >
              Om Biomax
            </a>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 text-sm text-emerald-900 md:grid-cols-4">
            <p className="rounded-xl bg-emerald-50 px-4 py-3">Klarna Checkout</p>
            <p className="rounded-xl bg-emerald-50 px-4 py-3">Fri frakt över 499 kr</p>
            <p className="rounded-xl bg-emerald-50 px-4 py-3">30 dagars nöjd-kund-garanti</p>
            <p className="rounded-xl bg-emerald-50 px-4 py-3">4.8/5 kundomdömen</p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-10 md:px-8">
        <h2 className="text-2xl font-semibold text-emerald-950">Populära kategorier</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
          {categories.map((category) => (
            <a
              key={category}
              href="/produkter"
              className="rounded-2xl border border-emerald-100 bg-white px-4 py-5 text-sm font-medium text-emerald-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              {category}
            </a>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-10 md:px-8">
        <h2 className="text-2xl font-semibold text-emerald-950">Bästsäljare</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {bestsellers.map((item) => (
            <article
              key={item.name}
              className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-emerald-700">Storsäljare</p>
              <h3 className="mt-2 text-lg font-semibold text-emerald-950">{item.name}</h3>
              <p className="mt-2 text-sm text-emerald-900/80">{item.benefit}</p>
              <button className="mt-4 rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">
                Lägg i varukorg
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-10 md:px-8">
        <div className="grid gap-4 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold text-emerald-950">Vad våra kunder säger</h2>
            <blockquote className="mt-4 text-emerald-900/80">
              “Känner mig piggare, sover bättre och uppskattar tydligheten kring ingredienserna.”
            </blockquote>
            <p className="mt-2 text-sm font-medium text-emerald-700">– Maria, verifierad kund</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-5">
            <h3 className="text-lg font-semibold text-emerald-950">
              Få 10 % på första köpet
            </h3>
            <p className="mt-2 text-sm text-emerald-900/80">
              Prenumerera på nyhetsbrevet för forskningsinsikter, erbjudanden och produktnyheter.
            </p>
            <form className="mt-4 flex flex-col gap-2 sm:flex-row" action="#">
              <input
                type="email"
                placeholder="din@email.se"
                className="min-w-0 flex-1 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm outline-none ring-emerald-600 focus:ring-2"
              />
              <button
                type="submit"
                className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
              >
                Prenumerera
              </button>
            </form>
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Biomax.nu",
            slogan: "Livskvalitet i fokus",
            url: "https://www.biomax.nu",
          }),
        }}
      />
    </div>
  );
}
