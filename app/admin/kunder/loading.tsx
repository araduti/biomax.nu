import {
  SkeletonBar,
  SkeletonHeader,
  SkeletonListContainer,
} from "@/components/admin/skeleton";

/**
 * Loading skeleton for `/admin/kunder`. Matches the live list's
 * 5-column grid (`grid-cols-[1.4fr_2fr_auto_auto_auto]`, `min-h-[44px]`).
 * No filter row — kunder has search only, the input is rendered before
 * the list and Next.js renders the static shell while the search query
 * resolves.
 */
export default function KunderLoading() {
  return (
    <>
      <SkeletonHeader />
      <SkeletonListContainer>
        {Array.from({ length: 10 }).map((_, i) => (
          <li
            key={i}
            className={i > 0 ? "border-t border-border-soft" : ""}
          >
            <div className="grid grid-cols-[1.4fr_2fr_auto_auto_auto] items-center gap-4 px-5 py-2.5 min-h-[44px]">
              <div className="flex flex-col gap-1.5">
                <SkeletonBar width={140} height={12} />
                <SkeletonBar width={100} height={10} />
              </div>
              <SkeletonBar width="80%" height={12} />
              <SkeletonBar width={56} height={12} />
              <SkeletonBar width={72} height={12} className="ml-auto" />
              <SkeletonBar width={12} height={12} />
            </div>
          </li>
        ))}
      </SkeletonListContainer>
    </>
  );
}
