import {
  SkeletonBar,
  SkeletonCircle,
  SkeletonHeader,
  SkeletonListContainer,
  SkeletonPill,
} from "@/components/admin/skeleton";

/**
 * Loading skeleton for `/admin/produkter`. Row geometry mirrors the
 * 6-column live list (SEO health pill + 36 px thumbnail + name + status
 * pill + stock + price). Image is rendered as a square `bg-border-soft`
 * placeholder to avoid layout shift when the real Next/Image loads.
 */
export default function ProdukterLoading() {
  return (
    <>
      <SkeletonHeader />
      <SkeletonListContainer>
        {Array.from({ length: 10 }).map((_, i) => (
          <li
            key={i}
            className={i > 0 ? "border-t border-border-soft" : ""}
          >
            <div className="grid grid-cols-[auto_36px_1fr_auto_auto_auto] items-center gap-4 px-5 py-2 min-h-[52px]">
              <SkeletonPill width={64} />
              <SkeletonCircle size={36} />
              <div className="flex flex-col gap-1.5 min-w-0">
                <SkeletonBar width={180} height={12} />
                <SkeletonBar width={220} height={10} />
              </div>
              <SkeletonPill width={92} />
              <SkeletonBar width={48} height={12} />
              <SkeletonBar width={72} height={12} className="ml-auto" />
            </div>
          </li>
        ))}
      </SkeletonListContainer>
    </>
  );
}
