import type {ReactNode} from "react";

export default function EmptyState({title, description, action}: {title: ReactNode; description?: ReactNode; action?: ReactNode}) {
    return (
        <section className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-5 py-10 text-center">
            <h2 className="text-base font-semibold text-stone-950">{title}</h2>
            {description ? <div className="mx-auto mt-2 max-w-lg text-sm leading-6 text-stone-600">{description}</div> : null}
            {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
        </section>
    );
}
