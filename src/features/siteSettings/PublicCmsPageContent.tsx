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
                <section className="mt-8 w-full min-w-0 max-w-3xl overflow-hidden break-words [overflow-wrap:anywhere] [&_ol]:max-w-full [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_ul]:max-w-full">
                    <ReactMarkdown
                        components={{
                            img: ({alt, src}) => src ? (
                                // eslint-disable-next-line @next/next/no-img-element -- CMS markdown images can reference API-served media or external URLs.
                                <img alt={alt ?? ""} className="my-4 max-h-96 max-w-full rounded-lg object-contain" loading="lazy" src={resolvePublicSiteMediaUrl(String(src))} />
                            ) : null,
                            p: ({children}) => <p className="max-w-full break-words [overflow-wrap:anywhere]">{children}</p>,
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
