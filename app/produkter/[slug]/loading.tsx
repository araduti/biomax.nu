// Instant skeleton for the product detail page — mirrors the
// ProductHero two-column band then a content block, so a cold render
// streams structure rather than a blank screen.
const pulse = "bg-surface-warm animate-pulse rounded";

export default function Loading() {
  return (
    <main aria-busy="true">
      <div className="max-w-[1240px] mx-auto px-6 md:px-8 pt-8 pb-4">
        <div className={`h-4 w-56 ${pulse}`} />
      </div>
      <section className="bg-surface-warm py-12 md:py-20 px-6 md:px-8">
        <div className="max-w-[1240px] mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 md:gap-16 items-start">
          <div className="aspect-square rounded-2xl bg-surface animate-pulse" />
          <div className="flex flex-col gap-4">
            <div className={`h-3 w-24 ${pulse}`} />
            <div className={`h-10 w-3/4 ${pulse}`} />
            <div className={`h-5 w-1/3 ${pulse}`} />
            <div className={`h-px w-full bg-border my-2`} />
            <div className={`h-4 w-full ${pulse}`} />
            <div className={`h-4 w-5/6 ${pulse}`} />
            <div className={`h-4 w-2/3 ${pulse}`} />
            <div className={`h-12 w-full rounded-lg ${pulse} mt-4`} />
          </div>
        </div>
      </section>
      <section className="max-w-[1240px] mx-auto px-6 md:px-8 py-12 md:py-16">
        <div className="max-w-[820px] flex flex-col gap-4">
          <div className={`h-7 w-48 mb-2 ${pulse}`} />
          <div className={`h-4 w-full ${pulse}`} />
          <div className={`h-4 w-11/12 ${pulse}`} />
          <div className={`h-4 w-3/4 ${pulse}`} />
        </div>
      </section>
    </main>
  );
}
