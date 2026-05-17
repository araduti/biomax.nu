// Instant skeleton for a category listing — same grid shape as the
// catalogue, shown only on a cold render / cache miss.
const pulse = "bg-surface-warm animate-pulse rounded";

export default function Loading() {
  return (
    <main aria-busy="true">
      <div className="max-w-[1240px] mx-auto px-6 md:px-8 pt-8 pb-4">
        <div className={`h-4 w-56 ${pulse}`} />
      </div>
      <div className="max-w-[1240px] mx-auto px-6 md:px-8 pb-8">
        <div className={`h-3 w-24 mb-4 ${pulse}`} />
        <div className={`h-10 w-72 mb-4 ${pulse}`} />
        <div className={`h-4 w-[420px] max-w-full ${pulse}`} />
      </div>
      <div className="max-w-[1240px] mx-auto px-6 md:px-8 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 md:gap-x-12 lg:gap-x-16 gap-y-20">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <div className={`aspect-square rounded-xl ${pulse}`} />
              <div className={`h-3 w-20 ${pulse}`} />
              <div className={`h-4 w-3/4 ${pulse}`} />
              <div className={`h-4 w-16 ${pulse}`} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
