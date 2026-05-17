// Kustom Elements — custom element + JS API typings.
// The <kustom-express-buttons> web component is registered by the
// Kustom Elements loader script (see app/layout.tsx).
import "react";

declare global {
  namespace React.JSX {
    interface IntrinsicElements {
      "kustom-express-buttons": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          locale?: string;
        },
        HTMLElement
      >;
    }
  }

  interface Window {
    /** Queue-style API exposed by the Kustom Elements snippet. */
    kustomElements?: ((
      method: string,
      ...args: unknown[]
    ) => Promise<unknown>) & {
      _internal?: unknown;
      load?: Promise<unknown>;
    };
  }
}

export {};
