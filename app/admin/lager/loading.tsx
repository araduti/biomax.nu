import {
  SkeletonBar,
  SkeletonCircle,
  SkeletonHeader,
  SkeletonFilterRow,
  SkeletonListContainer,
  SkeletonPill,
} from "@/components/admin/skeleton";

/**
 * Loading skeleton for `/admin/lager`. Matches `<InventoryRowEditor>`
 * row geometry (`grid-cols-[40px_1fr_auto]`, `min-h-[56px]`). The
 * "Ändra"-button column is rendered as a wide pill so the post-load
 * shift to the real h-12 button is contained.
 */
export default function LagerLoading() {
  return (
    <>
      <SkeletonHeader />
      <SkeletonFilterRow />
      <SkeletonListContainer>
        {Array.from({ length: 8 }).map((_, i) => (
          <li
            key={i}
            className={i > 0 ? "border-t border-border-soft" : ""}
          >
            <div className="grid grid-cols-[40px_1fr_auto] items-center gap-4 px-5 py-2 min-h-[56px]">
              <SkeletonCircle size={40} />
              <div className="flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center gap-3">
                  <SkeletonBar width={200} height={12} />
                  <SkeletonPill width={56} />
                </div>
                <SkeletonBar width={160} height={10} />
              </div>
              <div className="flex items-center gap-4">
                <SkeletonBar width={60} height={14} />
                <SkeletonBar width={80} height={36} className="rounded-md" />
              </div>
            </div>
          </li>
        ))}
      </SkeletonListContainer>
    </>
  );
}
