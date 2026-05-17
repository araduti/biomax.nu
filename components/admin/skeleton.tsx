/**
 * Shared loading-skeleton primitives for admin list pages.
 *
 * Used inside per-route `loading.tsx` files (Next 16 streaming
 * conventions). The skeletons mirror the *real* row geometry of each
 * list page so the layout doesn't shift when content streams in.
 *
 * Tailwind's `animate-pulse` is enough — no spinner, no shimmer
 * gradient. The cream canvas + soft border palette doesn't need extra
 * chrome; the gentle opacity fade is the cue.
 *
 *  - `<SkeletonBar>`    horizontal rounded bar, configurable width
 *  - `<SkeletonCircle>` square avatar/thumbnail placeholder
 *  - `<SkeletonPill>`   status-pill-shaped placeholder
 *  - `<SkeletonHeader>` the page-title + subtitle shell used by every
 *                       admin list while data is fetching
 */
export function SkeletonBar({
  width = "100%",
  height = 12,
  className,
}: {
  width?: string | number;
  height?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`inline-block bg-border-soft rounded ${className ?? ""}`}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: `${height}px`,
      }}
    />
  );
}

export function SkeletonCircle({
  size = 36,
  rounded = "rounded-md",
}: {
  size?: number;
  rounded?: string;
}) {
  return (
    <span
      aria-hidden
      className={`inline-block bg-border-soft ${rounded}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );
}

export function SkeletonPill({ width = 72 }: { width?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block bg-border-soft rounded-full"
      style={{ width: `${width}px`, height: "20px" }}
    />
  );
}

/**
 * Page-header shell — matches `<AdminPageHeader title=… subtitle=…>`
 * geometry. Width sized to match real titles so the post-load shift is
 * imperceptible.
 */
export function SkeletonHeader() {
  return (
    <div className="mb-8 animate-pulse">
      <SkeletonBar width={180} height={26} />
      <div className="mt-3">
        <SkeletonBar width={360} height={14} />
      </div>
    </div>
  );
}

/**
 * Filter-chip row skeleton — for list pages that have URL-backed
 * filters above the list (ordrar, lager, recensioner). 3 chips.
 */
export function SkeletonFilterRow() {
  return (
    <div className="mb-5 flex items-center gap-2 animate-pulse">
      <span
        aria-hidden
        className="inline-block bg-border-soft rounded-full"
        style={{ width: "96px", height: "36px" }}
      />
      <span
        aria-hidden
        className="inline-block bg-border-soft rounded-full"
        style={{ width: "112px", height: "36px" }}
      />
      <span
        aria-hidden
        className="inline-block bg-border-soft rounded-full"
        style={{ width: "84px", height: "36px" }}
      />
    </div>
  );
}

/**
 * Bordered list container shell — wraps row skeletons in the same
 * `bg-surface-alt border border-border rounded-xl overflow-hidden` chrome
 * the real lists use, so the post-load transition is just opacity.
 */
export function SkeletonListContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface-alt border border-border rounded-xl overflow-hidden animate-pulse">
      <ul role="presentation">{children}</ul>
    </div>
  );
}
