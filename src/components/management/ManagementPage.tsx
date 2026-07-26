import type {ReactNode} from "react";

export function ManagementPage({children, className = ""}: {children: ReactNode; className?: string}) {
    return <section className={`w-full min-w-0 max-w-none space-y-5 ${className}`}>{children}</section>;
}

export function ManagementPageHeader({eyebrow, title, description, actions}: {eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode}) {
    return (
        <header className="flex min-w-0 flex-col gap-4 border-b border-stone-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{eyebrow}</p> : null}
                <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight text-stone-950">{title}</h1>
                {description ? <div className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">{description}</div> : null}
            </div>
            {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
    );
}

export function ManagementSurface({children, className = ""}: {children: ReactNode; className?: string}) {
    return <section className={`min-w-0 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>{children}</section>;
}

export function ManagementListEditor({list, editor, className = ""}: {list: ReactNode; editor: ReactNode; className?: string}) {
    return <div className={`grid w-full min-w-0 max-w-none items-start gap-5 xl:grid-cols-[minmax(20rem,0.8fr)_minmax(0,1.35fr)] ${className}`}><div className="min-w-0">{list}</div><div className="min-w-0">{editor}</div></div>;
}
