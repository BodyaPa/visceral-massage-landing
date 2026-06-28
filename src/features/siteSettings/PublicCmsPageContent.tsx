import ReactMarkdown, {defaultUrlTransform} from "react-markdown";
import remarkGfm from "remark-gfm";
import {resolvePublicSiteMediaUrl} from "@/features/siteSettings/siteSettingsMedia";

type Detail = {
    title: string;
    body: string;
};

type Props = {
    body: string | null;
    details: Detail[];
};

export default function PublicCmsPageContent({body, details}: Props) {
    const hasCmsBody = Boolean(body?.trim());

    return (
        <>
            {hasCmsBody ? (
                <section className="mt-8 max-w-3xl">
                    <ReactMarkdown
                        components={{
                            img: ({alt, src}) => src ? <img alt={alt ?? ""} className="my-4 max-h-96 max-w-full rounded-lg object-contain" loading="lazy" src={resolvePublicSiteMediaUrl(String(src))} /> : null,
                            a: ({children, href}) => <a className="break-words text-stone-950 underline underline-offset-2" href={resolvePublicSiteMediaUrl(href ?? "")} rel={href?.startsWith("http") ? "noreferrer" : undefined} target={href?.startsWith("http") ? "_blank" : undefined}>{children}</a>
                        }}
                        remarkPlugins={[remarkGfm]}
                        urlTransform={(url) => defaultUrlTransform(resolvePublicSiteMediaUrl(url))}
                    >
                        {body ?? ""}
                    </ReactMarkdown>
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
