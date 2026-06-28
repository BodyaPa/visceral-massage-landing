import ReactMarkdown, {defaultUrlTransform} from "react-markdown";
import remarkGfm from "remark-gfm";
import {createSiteMediaPath, resolvePublicSiteMediaUrl} from "@/features/siteSettings/siteSettingsMedia";
import type {MediaAsset} from "@/types/news";

type Detail = {
    title: string;
    body: string;
};

type Props = {
    body: string | null;
    details: Detail[];
    media: MediaAsset[];
};

export default function PublicCmsPageContent({body, details, media}: Props) {
    const hasCmsBody = Boolean(body?.trim());
    const sliderMedia = media.filter((asset) => asset.contentType.startsWith("image/") || asset.contentType.startsWith("video/"));

    return (
        <>
            {sliderMedia.length > 0 ? <PublicMediaSlider media={sliderMedia} /> : null}

            {hasCmsBody ? (
                <section className="mt-8 max-w-3xl">
                    <ReactMarkdown
                        components={{
                            img: ({alt, src}) => src ? <img alt={alt ?? ""} className="my-4 max-h-96 max-w-full rounded-lg object-contain" loading="lazy" src={resolvePublicSiteMediaUrl(String(src))} /> : null,
                            a: ({children, href}) => {
                                const asset = href ? media.find((item) => createSiteMediaPath(item.id) === href) : null;
                                if (asset?.contentType.startsWith("video/")) {
                                    return <video className="my-4 max-h-96 w-full rounded-lg bg-stone-100" controls preload="metadata" src={resolvePublicSiteMediaUrl(href ?? "")} />;
                                }
                                return <a className="break-words text-stone-950 underline underline-offset-2" href={href} rel={href?.startsWith("http") ? "noreferrer" : undefined} target={href?.startsWith("http") ? "_blank" : undefined}>{children}</a>;
                            }
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

function PublicMediaSlider({media}: {media: MediaAsset[]}) {
    return (
        <section className="mt-8 max-w-5xl overflow-x-auto" aria-label="Hero media">
            <div className="flex snap-x gap-3">
                {media.map((asset) => (
                    <div className="aspect-[4/3] w-[min(82vw,22rem)] shrink-0 snap-start overflow-hidden rounded-xl border border-stone-200 bg-stone-100 md:w-80" key={asset.id}>
                        {asset.contentType.startsWith("video/") ? (
                            <video className="h-full w-full object-cover" controls preload="metadata" src={resolvePublicSiteMediaUrl(createSiteMediaPath(asset.id))} />
                        ) : (
                            <img alt={asset.originalFilename} className="h-full w-full object-cover" loading="lazy" src={resolvePublicSiteMediaUrl(createSiteMediaPath(asset.id))} />
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}
