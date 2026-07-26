"use client";

import {Suspense} from "react";
import {useParams, useSearchParams} from "next/navigation";
import {useGetNewsQuery} from "@/features/news/news.api";
import type {Locale} from "@/i18n";
import Markdown, {defaultUrlTransform} from "react-markdown";
import remarkGfm from "remark-gfm";
import {resolvePublishedMediaUrl} from "@/features/news/newsMedia";

function NewsReaderContent() {
    const params = useParams();
    const lang = params.lang as Locale;

    const sp = useSearchParams();
    const idParam = sp.get("id");
    const id = idParam ? Number(idParam) : null;

    const {data, isLoading} = useGetNewsQuery({id: id ?? 0, lang}, {skip: id === null});
    const coverImageUrl = data?.coverImageUrl ?? null;
    const fitCover = data?.coverDisplayMode === "FIT";

    if (id === null) return <div className="flex w-full min-w-0 flex-1 justify-center py-10" id="public-page-content" data-route-scroll-target />;

    if (isLoading) {
        return (
            <div className="flex w-full min-w-0 flex-1 justify-center px-3 py-10 sm:px-6" id="public-page-content" data-route-scroll-target>
                <article className="min-h-[70vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lg">
                    <div className="p-5 sm:p-8">
                        <div className="mb-5 h-9 w-2/3 animate-pulse rounded-lg bg-stone-200 motion-reduce:animate-none" />
                        <div className="my-3 h-3.5 w-full animate-pulse rounded-full bg-stone-100 motion-reduce:animate-none" />
                        <div className="my-3 h-3.5 w-full animate-pulse rounded-full bg-stone-100 motion-reduce:animate-none" />
                        <div className="my-3 h-3.5 w-4/5 animate-pulse rounded-full bg-stone-100 motion-reduce:animate-none" />
                    </div>
                </article>
            </div>
        );
    }

    const title = data?.title ?? "";
    const markdown = data?.content ?? "";

    return (
        <div className="flex w-full min-w-0 flex-1 justify-center px-3 py-10 sm:px-6" id="public-page-content" data-route-scroll-target>
            <article className="min-h-[70vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lg">
                {coverImageUrl ? (
                    <div className={fitCover ? "relative w-full overflow-hidden bg-stone-200" : "relative h-56 w-full overflow-hidden bg-stone-100 sm:h-[clamp(14rem,31vw,21rem)]"}>
                        {fitCover ? (
                            <>
                                {/* eslint-disable-next-line @next/next/no-img-element -- decorative blurred copy of the public cover image. */}
                                <img
                                    alt=""
                                    aria-hidden="true"
                                    className="absolute -inset-5 block h-[calc(100%+2.5rem)] w-[calc(100%+2.5rem)] scale-105 object-cover opacity-40 blur-xl"
                                    src={resolvePublishedMediaUrl(coverImageUrl)}
                                />
                                <div className="absolute inset-0 bg-white/35" aria-hidden="true" />
                            </>
                        ) : null}
                        <div className={fitCover ? "relative flex min-h-56 max-h-[26rem] items-center justify-center p-4 sm:p-6" : "h-full w-full"}>
                            {/* eslint-disable-next-line @next/next/no-img-element -- media content is served by the API endpoint for this news item. */}
                            <img
                                alt={data?.coverImageAlt ?? title}
                                className={fitCover ? "block max-h-[23.75rem] max-w-full rounded-xl object-contain shadow-md" : "block h-full w-full object-cover"}
                                src={resolvePublishedMediaUrl(coverImageUrl)}
                            />
                        </div>
                        {!fitCover ? <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-stone-900/10 to-transparent" aria-hidden="true" /> : null}
                    </div>
                ) : null}

                <div className="p-5 sm:p-8 lg:p-9">
                    <header className="mb-5 border-b border-stone-200 pb-4">
                        <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-stone-950 sm:text-4xl">{title}</h1>
                    </header>

                    <div className="min-w-0 text-base leading-7 text-stone-800">
                        <Markdown
                            components={{
                                p: ({children}) => <p className="mb-4">{children}</p>,
                                h2: ({children}) => <h2 className="mb-3 mt-8 text-2xl font-semibold leading-tight text-stone-950">{children}</h2>,
                                h3: ({children}) => <h3 className="mb-2.5 mt-6 text-xl font-semibold leading-snug text-stone-950">{children}</h3>,
                                ul: ({children}) => <ul className="mb-4 mt-2 list-disc space-y-1.5 pl-6">{children}</ul>,
                                ol: ({children}) => <ol className="mb-4 mt-2 list-decimal space-y-1.5 pl-6">{children}</ol>,
                                blockquote: ({children}) => <blockquote className="my-5 rounded-xl border border-stone-200 border-l-stone-500 border-l-4 bg-stone-100 p-4 text-stone-700">{children}</blockquote>,
                                hr: () => <hr className="my-6 border-0 border-t border-stone-200" />,
                                code: ({children}) => <code className="rounded-md bg-stone-100 px-1.5 py-0.5 font-mono text-[0.95em]">{children}</code>,
                                pre: ({children}) => <pre className="my-4 max-w-full overflow-x-auto rounded-xl border border-stone-800 bg-stone-950 p-4 font-mono text-sm text-stone-100 [&_code]:bg-transparent [&_code]:p-0">{children}</pre>,
                                table: ({children}) => <div className="my-4 max-w-full overflow-x-auto rounded-xl border border-stone-200 shadow-sm"><table className="w-full border-collapse bg-white text-sm">{children}</table></div>,
                                th: ({children}) => <th className="border border-stone-200 bg-stone-100 px-3 py-2.5 text-left font-semibold text-stone-800">{children}</th>,
                                td: ({children}) => <td className="border border-stone-200 px-3 py-2.5 align-top">{children}</td>,
                                a: ({children, href}) => <a className="text-stone-950 underline underline-offset-4 hover:opacity-75" href={href}>{children}</a>,
                                img: ({alt, src}) => src ? (
                                    // eslint-disable-next-line @next/next/no-img-element -- CMS markdown media is served by the public API.
                                    <img alt={alt ?? ""} className="mx-auto my-5 block max-h-[33.75rem] max-w-full rounded-xl object-contain" src={resolvePublishedMediaUrl(String(src))} />
                                ) : null
                            }}
                            remarkPlugins={[remarkGfm]}
                            urlTransform={(url) => defaultUrlTransform(resolvePublishedMediaUrl(url))}
                        >
                            {markdown}
                        </Markdown>
                    </div>
                </div>
            </article>
        </div>
    );
}

export default function NewsReaderPage() {
    return (
        <Suspense fallback={<div className="flex w-full min-w-0 flex-1 justify-center py-10" id="public-page-content" data-route-scroll-target />}>
            <NewsReaderContent />
        </Suspense>
    );
}
