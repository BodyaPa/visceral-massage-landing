"use client";

import {type ReactNode, useEffect} from "react";
import {EditorContent, useEditor} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {Markdown} from "@tiptap/markdown";

type Props = {
    value: string;
    ariaLabel: string;
    labels: {
        bold: string;
        italic: string;
        heading: string;
        bulletList: string;
        orderedList: string;
        blockquote: string;
    };
    onChange: (value: string) => void;
};

export default function NewsRichTextEditor({value, ariaLabel, labels, onChange}: Props) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [StarterKit, Markdown],
        content: value,
        contentType: "markdown",
        onUpdate: ({editor: updatedEditor}) => {
            onChange(updatedEditor.getMarkdown());
        }
    });

    useEffect(() => {
        if (editor && editor.getMarkdown() !== value) {
            editor.commands.setContent(value, {contentType: "markdown", emitUpdate: false});
        }
    }, [editor, value]);

    if (!editor) {
        return <div className="min-h-40 rounded-md border border-stone-300 bg-white" aria-hidden="true" />;
    }

    return (
        <div className="overflow-hidden rounded-md border border-stone-300 bg-white">
            <div className="flex flex-wrap gap-1 border-b border-stone-200 bg-stone-100 p-2">
                <ToolbarButton active={editor.isActive("bold")} label={labels.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
                    <strong>B</strong>
                </ToolbarButton>
                <ToolbarButton active={editor.isActive("italic")} label={labels.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
                    <em>I</em>
                </ToolbarButton>
                <ToolbarButton active={editor.isActive("heading", {level: 2})} label={labels.heading} onClick={() => editor.chain().focus().toggleHeading({level: 2}).run()}>
                    H2
                </ToolbarButton>
                <ToolbarButton active={editor.isActive("bulletList")} label={labels.bulletList} onClick={() => editor.chain().focus().toggleBulletList().run()}>
                    • List
                </ToolbarButton>
                <ToolbarButton active={editor.isActive("orderedList")} label={labels.orderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                    1. List
                </ToolbarButton>
                <ToolbarButton active={editor.isActive("blockquote")} label={labels.blockquote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
                    &quot;&quot;
                </ToolbarButton>
            </div>
            <EditorContent
                aria-label={ariaLabel}
                className="[&_.ProseMirror]:min-h-40 [&_.ProseMirror]:px-3 [&_.ProseMirror]:py-2 [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:my-2 [&_.ProseMirror_h2]:my-3 [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-stone-300 [&_.ProseMirror_blockquote]:pl-3 [&_.ProseMirror_blockquote]:text-stone-600"
                editor={editor}
            />
        </div>
    );
}

function ToolbarButton({active, children, label, onClick}: {
    active: boolean;
    children: ReactNode;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            aria-label={label}
            aria-pressed={active}
            className={`rounded px-2 py-1 text-sm ${active ? "bg-stone-900 text-white" : "bg-white text-stone-800 hover:bg-stone-200"}`}
            onClick={onClick}
            type="button"
        >
            {children}
        </button>
    );
}
