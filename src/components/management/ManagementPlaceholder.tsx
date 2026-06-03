type Props = {
    title: string;
    subtitle: string;
    body: string;
};

export default function ManagementPlaceholder({title, subtitle, body}: Props) {
    return (
        <section className="flex min-h-[28rem] w-full min-w-0 items-center rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="max-w-2xl space-y-4">
                <span className="inline-flex rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-stone-500">
                    {subtitle}
                </span>
                <h1 className="text-2xl font-semibold text-stone-950 sm:text-3xl">{title}</h1>
                <p className="text-sm leading-6 text-stone-600 sm:text-base">{body}</p>
            </div>
        </section>
    );
}
