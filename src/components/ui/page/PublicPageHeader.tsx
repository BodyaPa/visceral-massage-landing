import type {ReactNode} from "react";

type PublicPageHeaderProps = {
    title: ReactNode;
    intro?: ReactNode;
    eyebrow?: ReactNode;
    actions?: ReactNode;
};

export default function PublicPageHeader({title, intro, eyebrow, actions}: PublicPageHeaderProps) {
    return (
        <header className="border-b border-stone-200 bg-stone-50">
            <div className="container mx-auto grid gap-6 px-4 py-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:py-12">
                <div className="max-w-3xl space-y-3">
                    {eyebrow ? (
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                            {eyebrow}
                        </p>
                    ) : null}
                    <h1 className="text-balance text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                        {title}
                    </h1>
                    {intro ? (
                        <div className="max-w-2xl whitespace-pre-line text-sm leading-6 text-stone-600 sm:text-base">
                            {intro}
                        </div>
                    ) : null}
                </div>
                {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
            </div>
        </header>
    );
}
