"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import { useRef, useState } from "react";

const BRAND = "#6B1A2A";

function ToolbarButton({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={active ? { background: BRAND, color: "white" } : {}}
      className={`px-2 py-1 rounded-lg text-sm transition-all ${
        active ? "" : "text-[#666666] hover:bg-black/5 hover:text-[#1A1A1A]"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-black/10 mx-1 self-center" />;
}

function RichTextArea({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      // ✅ Extension image avec redimensionnement inline
      Image.configure({ inline: false, allowBase64: true }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  // ✅ Upload vers Vercel Blob via API route → URL permanente
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    e.target.value = "";

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Erreur upload");

      editor.chain().focus().setImage({ src: data.url }).run();
    } catch (err: any) {
      alert(err.message ?? "Erreur lors de l'upload de l'image");
    } finally {
      setUploadingImage(false);
    }
  }

  return (
    <div
      className="w-full border border-black/[0.07] rounded-2xl bg-black/[0.02] focus-within:border-[#6B1A2A] focus-within:bg-white overflow-hidden"
      style={{ transition: "border-color 0.15s" }}
    >
      {/* ── Barre d'outils ── */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-black/[0.05] bg-black/[0.01]">

        {/* Texte */}
        <ToolbarButton title="Gras" active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}>
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton title="Italique" active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}>
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton title="Souligné" active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <span style={{ textDecoration: "underline" }}>U</span>
        </ToolbarButton>
        <ToolbarButton title="Barré" active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}>
          <span style={{ textDecoration: "line-through" }}>S</span>
        </ToolbarButton>

        <Divider />

        {/* Titres */}
        <ToolbarButton title="Titre 1" active={editor.isActive("heading", { level: 1 })}
          onClick={() => {
            // Collapse la sélection au début avant d'appliquer le heading
            // pour éviter de splitter le bloc en plusieurs lignes
            const { from } = editor.state.selection;
            editor
              .chain()
              .focus()
              .setTextSelection(from)
              .run();
            if (editor.isActive("heading", { level: 1 })) {
              editor.chain().focus().setParagraph().run();
            } else {
              editor.chain().focus().setHeading({ level: 1 }).run();
            }
          }}>
          H1
        </ToolbarButton>
        <ToolbarButton title="Titre 2" active={editor.isActive("heading", { level: 2 })}
          onClick={() => {
            const { from } = editor.state.selection;
            editor
              .chain()
              .focus()
              .setTextSelection(from)
              .run();
            if (editor.isActive("heading", { level: 2 })) {
              editor.chain().focus().setParagraph().run();
            } else {
              editor.chain().focus().setHeading({ level: 2 }).run();
            }
          }}>
          H2
        </ToolbarButton>

        <Divider />

        {/* Listes */}
        <ToolbarButton title="Liste à puces" active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}>
          • Liste
        </ToolbarButton>
        <ToolbarButton title="Liste numérotée" active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          1. Liste
        </ToolbarButton>

        <Divider />

        {/* Code */}
        <ToolbarButton title="Code inline" active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}>
          {"</>"}
        </ToolbarButton>
        <ToolbarButton title="Bloc de code" active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          {"{ }"}
        </ToolbarButton>

        <Divider />

        {/* Alignement */}
        <ToolbarButton title="Aligner à gauche" active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          ≡
        </ToolbarButton>
        <ToolbarButton title="Centrer" active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          ≡
        </ToolbarButton>
        <ToolbarButton title="Aligner à droite" active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          ≡
        </ToolbarButton>

        <Divider />

        {/* ✅ Image upload */}
        <ToolbarButton
          title="Insérer une image"
          onClick={() => !uploadingImage && fileInputRef.current?.click()}
        >
          {uploadingImage ? "⏳" : "🖼"}
        </ToolbarButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleImageUpload}
        />

        <Divider />

        {/* Undo / Redo */}
        <ToolbarButton title="Annuler"
          onClick={() => editor.chain().focus().undo().run()}>
          ↩
        </ToolbarButton>
        <ToolbarButton title="Rétablir"
          onClick={() => editor.chain().focus().redo().run()}>
          ↪
        </ToolbarButton>
      </div>

      {/* ── Styles éditeur ── */}
      <style>{`
        .ProseMirror {
          outline: none;
          min-height: 7rem;
          padding: 16px 20px;
          color: #1A1A1A;
          font-size: 14px;
          line-height: 1.6;
        }

        /* ✅ Espacement entre blocs via sélecteur adjacent — évite l'accumulation */
        .ProseMirror > * + * { margin-top: 8px; }
        .ProseMirror > *     { margin: 0; }

        .ProseMirror h1 { font-size: 20px; font-weight: 700; }
        .ProseMirror h2 { font-size: 16px; font-weight: 700; }

        .ProseMirror ul { list-style-type: disc;     padding-left: 20px; }
        .ProseMirror ol { list-style-type: decimal;  padding-left: 20px; }
        .ProseMirror li { margin-bottom: 2px; }
        .ProseMirror li + li { margin-top: 0; }

        .ProseMirror code {
          background: rgba(0,0,0,0.06);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 13px;
          font-family: monospace;
        }
        .ProseMirror pre {
          background: rgba(0,0,0,0.06);
          padding: 12px 16px;
          border-radius: 8px;
          overflow-x: auto;
        }
        .ProseMirror pre code { background: none; padding: 0; }

        .ProseMirror blockquote {
          border-left: 3px solid ${BRAND};
          padding-left: 12px;
          color: #666;
        }

        /* ✅ Images insérées */
        .ProseMirror img {
          max-width: 100%;
          border-radius: 8px;
          display: block;
        }
        .ProseMirror img.ProseMirror-selectednode {
          outline: 2px solid ${BRAND};
          outline-offset: 2px;
        }

        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: rgba(0,0,0,0.2);
          pointer-events: none;
          float: left;
          height: 0;
        }
      `}</style>

      <EditorContent editor={editor} />
    </div>
  );
}

export default RichTextArea;
