"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { sanitizeRichText } from "@/lib/sanitize";

/**
 * Rich-text editor for product descriptions, blog content, and similar
 * editorial fields. Built on Tiptap (ProseMirror under the hood).
 *
 * Outputs clean HTML — sanitized through `sanitizeRichText` on every change
 * to strip any inline styles, classes, event handlers, font tags. Allow-list
 * is whatever Tiptap's extensions emit: p, h2/h3, ul/ol/li, a, strong, em, br.
 *
 * Designed for non-developer staff: simple toolbar, no markdown gotchas,
 * paste-from-Word strips formatting, drag-drop disabled (intentional).
 */

const TOOLBAR_SECTIONS: ToolbarSection[] = [
  {
    label: "Stycke",
    actions: [
      { id: "paragraph", label: "P", title: "Stycke" },
      { id: "h2", label: "H2", title: "Rubrik 2" },
      { id: "h3", label: "H3", title: "Rubrik 3" },
    ],
  },
  {
    label: "Stil",
    actions: [
      { id: "bold", label: "B", title: "Fet (⌘B)", className: "font-bold" },
      {
        id: "italic",
        label: "I",
        title: "Kursiv (⌘I)",
        className: "italic",
      },
    ],
  },
  {
    label: "Listor",
    actions: [
      { id: "bulletList", label: "•", title: "Punktlista" },
      { id: "orderedList", label: "1.", title: "Numrerad lista" },
    ],
  },
  {
    label: "Länk",
    actions: [{ id: "link", label: "🔗", title: "Lägg till länk (⌘K)" }],
  },
  {
    label: "Ångra",
    actions: [
      { id: "undo", label: "↺", title: "Ångra" },
      { id: "redo", label: "↻", title: "Gör om" },
    ],
  },
];

type ToolbarAction = {
  id:
    | "paragraph"
    | "h2"
    | "h3"
    | "bold"
    | "italic"
    | "bulletList"
    | "orderedList"
    | "link"
    | "undo"
    | "redo";
  label: string;
  title: string;
  className?: string;
};

type ToolbarSection = {
  label: string;
  actions: ToolbarAction[];
};

type Props = {
  value: string;
  onChange: (html: string) => void;
  /** Display label rendered above the editor. */
  label?: string;
  hint?: string;
  /** Visual height — h-32 for short fields, h-72+ for long. */
  minHeight?: string;
  placeholder?: string;
};

export function RichTextEditor({
  value,
  onChange,
  label,
  hint,
  minHeight = "min-h-[200px]",
  placeholder,
}: Props) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        // Tiptap 3's StarterKit bundles Link — disable it so our custom
        // `Link.configure({ rel, class })` below is the only registered
        // link extension. Without this Tiptap warns about duplicate names.
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          class: "text-primary underline",
        },
      }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "prose-biomax max-w-none px-4 py-3 outline-none font-sans text-body-lg leading-relaxed text-ink-body",
          minHeight
        ),
        ...(placeholder ? { "data-placeholder": placeholder } : {}),
      },
    },
    onUpdate({ editor }) {
      const html = editor.getHTML();
      // Tiptap can emit empty <p></p> when blank — normalize to ""
      const normalized =
        html === "<p></p>" ? "" : sanitizeRichText(html);
      onChange(normalized);
    },
  });

  // Keep editor in sync if parent changes value externally (e.g. form reset)
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() === value) return;
    editor.commands.setContent(value || "", { emitUpdate: false });
  }, [editor, value]);

  const openLinkDialog = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href ?? "";
    setLinkUrl(previous);
    setLinkDialogOpen(true);
  }, [editor]);

  const applyLink = useCallback(() => {
    if (!editor) return;
    const url = linkUrl.trim();
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      const withProtocol =
        url.startsWith("http") || url.startsWith("/") || url.startsWith("mailto:")
          ? url
          : `https://${url}`;
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: withProtocol })
        .run();
    }
    setLinkDialogOpen(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  if (!editor) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-surface-alt animate-pulse",
          minHeight
        )}
      />
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="font-sans text-caption uppercase tracking-[0.18em] font-semibold text-ink-mute">
          {label}
        </label>
      )}
      <div className="rounded-lg border border-border bg-surface-alt overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-colors">
        <Toolbar
          editor={editor}
          onLinkClick={openLinkDialog}
        />
        <EditorContent editor={editor} />
        {linkDialogOpen && (
          <LinkDialog
            initialUrl={linkUrl}
            onApply={(url) => {
              setLinkUrl(url);
              // Defer to next tick so state is set before applyLink reads it.
              setTimeout(() => applyLink(), 0);
            }}
            onCancel={() => {
              setLinkDialogOpen(false);
              setLinkUrl("");
            }}
          />
        )}
      </div>
      {hint && (
        <p className="font-sans text-caption text-ink-soft">{hint}</p>
      )}
    </div>
  );
}

function Toolbar({
  editor,
  onLinkClick,
}: {
  editor: Editor;
  onLinkClick: () => void;
}) {
  function run(action: ToolbarAction["id"]) {
    const c = editor.chain().focus();
    switch (action) {
      case "paragraph":
        return c.setParagraph().run();
      case "h2":
        return c.toggleHeading({ level: 2 }).run();
      case "h3":
        return c.toggleHeading({ level: 3 }).run();
      case "bold":
        return c.toggleBold().run();
      case "italic":
        return c.toggleItalic().run();
      case "bulletList":
        return c.toggleBulletList().run();
      case "orderedList":
        return c.toggleOrderedList().run();
      case "undo":
        return c.undo().run();
      case "redo":
        return c.redo().run();
      case "link":
        return onLinkClick();
    }
  }

  function isActive(id: ToolbarAction["id"]): boolean {
    switch (id) {
      case "paragraph":
        return editor.isActive("paragraph") && !editor.isActive("heading");
      case "h2":
        return editor.isActive("heading", { level: 2 });
      case "h3":
        return editor.isActive("heading", { level: 3 });
      case "bold":
        return editor.isActive("bold");
      case "italic":
        return editor.isActive("italic");
      case "bulletList":
        return editor.isActive("bulletList");
      case "orderedList":
        return editor.isActive("orderedList");
      case "link":
        return editor.isActive("link");
      default:
        return false;
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1 px-2 py-2 border-b border-border-soft bg-surface">
      {TOOLBAR_SECTIONS.map((section, sectionIdx) => (
        <div key={section.label} className="flex items-center gap-0.5">
          {section.actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => run(action.id)}
              title={action.title}
              aria-label={action.title}
              aria-pressed={isActive(action.id)}
              className={cn(
                "min-w-[32px] h-8 px-2 rounded font-sans text-small transition-colors",
                action.className,
                isActive(action.id)
                  ? "bg-primary text-surface"
                  : "text-ink-body hover:bg-surface-warm"
              )}
            >
              {action.label}
            </button>
          ))}
          {sectionIdx < TOOLBAR_SECTIONS.length - 1 && (
            <span aria-hidden className="mx-1 w-px h-5 bg-border" />
          )}
        </div>
      ))}
    </div>
  );
}

function LinkDialog({
  initialUrl,
  onApply,
  onCancel,
}: {
  initialUrl: string;
  onApply: (url: string) => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  return (
    <div className="border-t border-border-soft px-3 py-2.5 bg-surface-warm flex flex-wrap items-center gap-2">
      <input
        type="url"
        autoFocus
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://exempel.se eller /produkter/balans"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onApply(url);
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        className="flex-1 min-w-[240px] h-9 px-3 rounded-md border border-border bg-surface-alt font-sans text-small text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
      <button
        type="button"
        onClick={() => onApply(url)}
        className="h-9 px-4 rounded-md bg-primary text-surface font-sans font-semibold text-small hover:bg-primary-deep transition-colors"
      >
        Använd
      </button>
      <button
        type="button"
        onClick={() => onApply("")}
        className="h-9 px-3 rounded-md border border-border text-small text-ink-body font-sans hover:bg-surface-alt transition-colors"
      >
        Ta bort länk
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="h-9 px-3 rounded-md font-sans text-small text-ink-mute hover:bg-surface-alt transition-colors"
      >
        Avbryt
      </button>
    </div>
  );
}
