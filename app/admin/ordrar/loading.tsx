import {
  SkeletonBar,
  SkeletonHeader,
  SkeletonFilterRow,
  SkeletonListContainer,
  SkeletonPill,
} from "@/components/admin/skeleton";

/**
 * Loading skeleton for `/admin/ordrar`. Row geometry mirrors the live
 * list (`grid-cols-[1.4fr_2fr_auto_auto_auto]`, `min-h-[44px]`) so the
 * layout doesn't shift when data streams in.
 */
export default function OrdrarLoading() {
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
            <div className="grid grid-cols-[1.4fr_2fr_auto_auto_auto] items-center gap-4 px-5 py-2.5 min-h-[44px]">
              <div className="flex flex-col gap-1.5">
                <SkeletonBar width={96} height={12} />
                <SkeletonBar width={120} height={10} />
              </div>
              <SkeletonBar width="80%" height={12} />
              <SkeletonBar width={36} height={12} />
              <SkeletonPill width={84} />
              <SkeletonBar width={68} height={12} className="ml-auto" />
            </div>
          </li>
        ))}
      </SkeletonListContainer>
    </>
  );
}
