"use client";

import {type ReactNode, useEffect} from "react";
import {EditorContent, useEditor, useEditorState} from "@tiptap/react";
import Image from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";
import {Markdown} from "@tiptap/markdown";
import {resolveAdminMediaUrl} from "./newsMedia";

const PublishedImage = Image.extend({
    renderHTML({HTMLAttributes}) {
        return ["img", {
            ...HTMLAttributes,
            src: resolveAdminMediaUrl(String(HTMLAttributes.src ?? ""))
        }];
    }
});

export type NewsEditorLabels = {
    bold: string;
    italic: string;
    strike: string;
    inlineCode: string;
    paragraph: string;
    headingTwo: string;
    headingThree: string;
    bulletList: string;
    orderedList: string;
    blockquote: string;
    divider: string;
    link: string;
    unlink: string;
    linkPrompt: string;
    invalidLink: string;
    undo: string;
    redo: string;
};

export type NewsEditorImageInsertion = {
    key: number;
    src: string;
    alt: string;
};

type Props = {
    value: string;
    ariaLabel: string;
    labels: NewsEditorLabels;
    imageInsertion?: NewsEditorImageInsertion | null;
    onImageInserted?: () => void;
    onChange: (value: string) => void;
};

export default function NewsRichTextEditor({value, ariaLabel, labels, imageInsertion, onImageInserted, onChange}: Props) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                link: {
                    openOnClick: false
                }
            }),
            PublishedImage,
            Markdown
        ],
        content: value,
        contentType: "markdown",
        onUpdate: ({editor: updatedEditor}) => {
            onChange(updatedEditor.getMarkdown());
        }
    });
    const toolbarState = useEditorState({
        editor,
        selector: ({editor: currentEditor}) => ({
            bold: currentEditor?.isActive("bold") ?? false,
            italic: currentEditor?.isActive("italic") ?? false,
            strike: currentEditor?.isActive("strike") ?? false,
            inlineCode: currentEditor?.isActive("code") ?? false,
            paragraph: currentEditor?.isActive("paragraph") ?? false,
            headingTwo: currentEditor?.isActive("heading", {level: 2}) ?? false,
            headingThree: currentEditor?.isActive("heading", {level: 3}) ?? false,
            bulletList: currentEditor?.isActive("bulletList") ?? false,
            orderedList: currentEditor?.isActive("orderedList") ?? false,
            blockquote: currentEditor?.isActive("blockquote") ?? false,
            link: currentEditor?.isActive("link") ?? false,
            canUndo: currentEditor?.can().undo() ?? false,
            canRedo: currentEditor?.can().redo() ?? false
        })
    });

    useEffect(() => {
        if (editor && editor.getMarkdown() !== value) {
            editor.commands.setContent(value, {contentType: "markdown", emitUpdate: false});
        }
    }, [editor, value]);

    useEffect(() => {
        if (editor && imageInsertion) {
            editor.chain().focus().setImage({src: imageInsertion.src, alt: imageInsertion.alt}).run();
            onImageInserted?.();
        }
    }, [editor, imageInsertion, onImageInserted]);

    if (!editor) {
        return <div className="min-h-[22rem] rounded-md border border-stone-300 bg-white xl:min-h-[clamp(26rem,55vh,45rem)]" aria-hidden="true" />;
    }

    function setLink() {
        if (!editor) {
            return;
        }

        const currentUrl = editor.getAttributes("link").href as string | undefined;
        const enteredUrl = window.prompt(labels.linkPrompt, currentUrl ?? "https://");

        if (enteredUrl === null) {
            return;
        }

        const href = normalizeLink(enteredUrl);

        if (href === null) {
            window.alert(labels.invalidLink);
            return;
        }

        if (href === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
        }

        editor.chain().focus().extendMarkRange("link").setLink({href}).run();
    }

    return (
        <div className="min-w-0 overflow-hidden rounded-lg border border-stone-300 bg-white shadow-inner transition focus-within:border-stone-500 focus-within:ring-1 focus-within:ring-stone-400">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5 border-b border-stone-200 bg-stone-50 p-2.5" role="toolbar" aria-label={ariaLabel}>
                <ToolbarGroup>
                    <ToolbarButton active={toolbarState?.bold ?? false} label={labels.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
                        <strong>B</strong>
                    </ToolbarButton>
                    <ToolbarButton active={toolbarState?.italic ?? false} label={labels.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
                        <em>I</em>
                    </ToolbarButton>
                    <ToolbarButton active={toolbarState?.strike ?? false} label={labels.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
                        <s>S</s>
                    </ToolbarButton>
                    <ToolbarButton active={toolbarState?.inlineCode ?? false} label={labels.inlineCode} onClick={() => editor.chain().focus().toggleCode().run()}>
                        {"</>"}
                    </ToolbarButton>
                </ToolbarGroup>
                <ToolbarGroup>
                    <ToolbarButton active={toolbarState?.paragraph ?? false} label={labels.paragraph} onClick={() => editor.chain().focus().setParagraph().run()}>
                        P
                    </ToolbarButton>
                    <ToolbarButton active={toolbarState?.headingTwo ?? false} label={labels.headingTwo} onClick={() => editor.chain().focus().toggleHeading({level: 2}).run()}>
                        H2
                    </ToolbarButton>
                    <ToolbarButton active={toolbarState?.headingThree ?? false} label={labels.headingThree} onClick={() => editor.chain().focus().toggleHeading({level: 3}).run()}>
                        H3
                    </ToolbarButton>
                </ToolbarGroup>
                <ToolbarGroup>
                    <ToolbarButton active={toolbarState?.bulletList ?? false} label={labels.bulletList} onClick={() => editor.chain().focus().toggleBulletList().run()}>
                        &bull;
                    </ToolbarButton>
                    <ToolbarButton active={toolbarState?.orderedList ?? false} label={labels.orderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                        1.
                    </ToolbarButton>
                    <ToolbarButton active={toolbarState?.blockquote ?? false} label={labels.blockquote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
                        &quot;&quot;
                    </ToolbarButton>
                    <ToolbarButton active={false} label={labels.divider} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
                        &mdash;
                    </ToolbarButton>
                </ToolbarGroup>
                <ToolbarGroup>
                    <ToolbarButton active={toolbarState?.link ?? false} label={labels.link} onClick={setLink}>
                        Link
                    </ToolbarButton>
                    <ToolbarButton active={false} disabled={!toolbarState?.link} label={labels.unlink} onClick={() => editor.chain().focus().unsetLink().run()}>
                        &times;
                    </ToolbarButton>
                </ToolbarGroup>
                <ToolbarGroup>
                    <ToolbarButton active={false} disabled={!toolbarState?.canUndo} label={labels.undo} onClick={() => editor.chain().focus().undo().run()}>
                        &#8630;
                    </ToolbarButton>
                    <ToolbarButton active={false} disabled={!toolbarState?.canRedo} label={labels.redo} onClick={() => editor.chain().focus().redo().run()}>
                        &#8631;
                    </ToolbarButton>
                </ToolbarGroup>
            </div>
            <EditorContent
                aria-label={ariaLabel}
                className="[&_.ProseMirror]:min-h-[22rem] xl:[&_.ProseMirror]:min-h-[clamp(26rem,55vh,45rem)] [&_.ProseMirror]:px-4 [&_.ProseMirror]:py-3 [&_.ProseMirror]:text-base [&_.ProseMirror]:leading-7 [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:my-2 [&_.ProseMirror_h2]:my-3 [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h3]:my-3 [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-stone-300 [&_.ProseMirror_blockquote]:pl-3 [&_.ProseMirror_blockquote]:text-stone-600 [&_.ProseMirror_a]:break-words [&_.ProseMirror_a]:text-stone-900 [&_.ProseMirror_a]:underline [&_.ProseMirror_a]:underline-offset-2 [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:bg-stone-100 [&_.ProseMirror_code]:px-1 [&_.ProseMirror_hr]:my-4 [&_.ProseMirror_hr]:border-stone-300 [&_.ProseMirror_img]:my-4 [&_.ProseMirror_img]:max-h-96 [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-lg [&_.ProseMirror_img]:object-contain"
                editor={editor}
            />
        </div>
    );
}

function ToolbarGroup({children}: {children: ReactNode}) {
    return <span className="inline-flex gap-1 border-r border-stone-200 pr-1.5 last:border-r-0 last:pr-0">{children}</span>;
}

function ToolbarButton({active, children, disabled = false, label, onClick}: {
    active: boolean;
    children: ReactNode;
    disabled?: boolean;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            aria-label={label}
            aria-pressed={active}
            className={`min-w-9 rounded px-2 py-1 text-sm transition ${
                active ? "bg-stone-900 text-white" : "bg-white text-stone-800 hover:bg-stone-200"
            } disabled:cursor-not-allowed disabled:opacity-40`}
            disabled={disabled}
            onClick={onClick}
            title={label}
            type="button"
        >
            {children}
        </button>
    );
}

function normalizeLink(value: string): string | null {
    const trimmed = value.trim();

    if (!trimmed) {
        return "";
    }

    if (/^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(trimmed)) {
        return trimmed;
    }

    if (/^[\w.-]+\.[a-z]{2,}(?:[/?#].*)?$/i.test(trimmed)) {
        return `https://${trimmed}`;
    }

    return null;
}
