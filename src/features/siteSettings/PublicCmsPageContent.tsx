import {resolveApiMediaUrl} from "@/shared/lib/media/resolveApiMediaUrl";

type Detail = {
    title: string;
    body: string;
};

type Props = {
    body: string | null;
    details: Detail[];
    heroUrls: string[];
};

export default function PublicCmsPageContent({body, details, heroUrls}: Props) {
    const hasCmsBody = Boolean(body?.trim());

    return (
        <>
            {heroUrls.length > 0 ? (
                <section className="mt-8 grid max-w-5xl gap-3 md:grid-cols-3" aria-label="Hero media">
                    {heroUrls.slice(0, 3).map((url) => (
                        <div className="aspect-[4/3] overflow-hidden rounded-xl border border-stone-200 bg-stone-100" key={url}>
                            <img alt="" className="h-full w-full object-cover" loading="lazy" src={resolveApiMediaUrl(url)} />
                        </div>
                    ))}
                </section>
            ) : null}

            {hasCmsBody ? (
                <section className="mt-8 max-w-3xl">
                    <p className="whitespace-pre-line text-sm leading-7 text-stone-700">{body}</p>
                </section>
            ) : (
                <section className="mt-8 grid max-w-5xl gap-3 md:grid-cols-3">
                    {details.map((item) => (
                        <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm" key={item.title}>
                            <h2 className="text-base font-semibold text-stone-950">{item.title}</h2>
                            <p className="mt-2 text-sm leading-6 text-stone-600">{item.body}</p>
                        </article>
                    ))}
                </section>
            )}
        </>
    );
}
