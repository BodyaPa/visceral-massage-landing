import ReactMarkdown, {defaultUrlTransform} from "react-markdown";
import remarkGfm from "remark-gfm";
import {resolvePublicSiteMediaUrl} from "@/features/siteSettings/siteSettingsMedia";

type Props = {
    body: string | null;
};

export default function PublicCmsPageContent({body}: Props) {
    const hasCmsBody = Boolean(body?.trim());

    return (
        <>
            {hasCmsBody ? (
                <section className="w-full min-w-0 max-w-3xl overflow-hidden break-words text-base leading-7 text-stone-700 [overflow-wrap:anywhere] [&_ol]:max-w-full [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_ul]:max-w-full">
                    <ReactMarkdown
                        components={{
                            h2: ({children}) => <h2 className="mb-4 mt-10 text-2xl font-semibold tracking-tight text-stone-950 first:mt-0">{children}</h2>,
                            h3: ({children}) => <h3 className="mb-3 mt-8 text-xl font-semibold text-stone-950">{children}</h3>,
                            img: ({alt, src}) => src ? (
                                // eslint-disable-next-line @next/next/no-img-element -- CMS markdown images can reference API-served media or external URLs.
                                <img alt={alt ?? ""} className="my-4 max-h-96 max-w-full rounded-lg object-contain" loading="lazy" src={resolvePublicSiteMediaUrl(String(src))} />
                            ) : null,
                            p: ({children}) => <p className="mb-4 max-w-full break-words [overflow-wrap:anywhere]">{children}</p>,
                            ul: ({children}) => <ul className="mb-5 list-disc space-y-1 pl-6">{children}</ul>,
                            ol: ({children}) => <ol className="mb-5 list-decimal space-y-1 pl-6">{children}</ol>,
                            a: ({children, href}) => <a className="break-words text-stone-950 underline underline-offset-2" href={resolvePublicSiteMediaUrl(href ?? "")} rel={href?.startsWith("http") ? "noreferrer" : undefined} target={href?.startsWith("http") ? "_blank" : undefined}>{children}</a>
                        }}
                        remarkPlugins={[remarkGfm]}
                        urlTransform={(url) => defaultUrlTransform(resolvePublicSiteMediaUrl(url))}
                    >
                        {body ?? ""}
                    </ReactMarkdown>
                </section>
            ) : null}
        </>
    );
}
