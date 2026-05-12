"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, List, ListOrdered, Redo2, Undo2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";

type RichTextEditorProps = {
  value: string;
  onChange: (value: { html: string; json: unknown }) => void;
  className?: string;
};

export function RichTextEditor({
  value,
  onChange,
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "<p></p>",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-48 rounded-b-md border-x border-b bg-background px-3 py-3 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring",
      },
    },
    onUpdate: ({ editor }) => {
      onChange({ html: editor.getHTML(), json: editor.getJSON() });
    },
  });

  const toolbar = [
    {
      label: "Bold",
      icon: Bold,
      action: () => editor?.chain().focus().toggleBold().run(),
      active: editor?.isActive("bold"),
    },
    {
      label: "Italic",
      icon: Italic,
      action: () => editor?.chain().focus().toggleItalic().run(),
      active: editor?.isActive("italic"),
    },
    {
      label: "Bullet list",
      icon: List,
      action: () => editor?.chain().focus().toggleBulletList().run(),
      active: editor?.isActive("bulletList"),
    },
    {
      label: "Numbered list",
      icon: ListOrdered,
      action: () => editor?.chain().focus().toggleOrderedList().run(),
      active: editor?.isActive("orderedList"),
    },
  ];

  return (
    <div className={cn("rounded-md", className)}>
      <div className="flex flex-wrap gap-1 rounded-t-md border bg-muted/30 p-2">
        {toolbar.map((item) => (
          <Button
            key={item.label}
            type="button"
            variant={item.active ? "secondary" : "ghost"}
            size="icon"
            aria-label={item.label}
            onClick={item.action}
          >
            <item.icon className="h-4 w-4" aria-hidden="true" />
          </Button>
        ))}
        <div className="ml-auto flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Undo"
            onClick={() => editor?.chain().focus().undo().run()}
          >
            <Undo2 className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Redo"
            onClick={() => editor?.chain().focus().redo().run()}
          >
            <Redo2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
