"use client";

import {useEffect, useRef, useState} from "react";
import Link from "next/link";
import {useParams} from "next/navigation";
import {useTranslations} from "next-intl";
import type {Locale} from "@/i18n";
import {resolvePublishedMediaUrl} from "@/features/news/newsMedia";
import {withLocale} from "@/shared/lib/locale/withLocale";
import {useListNewsQuery} from "@/features/news/news.api";
import {getCurrentUser, hasRole} from "@/features/auth/auth.client";
import AuthenticatedLink from "@/features/auth/AuthenticatedLink";
import PublicPageHeader from "@/components/ui/page/PublicPageHeader";

function TextPreview({content}: { content: string }) {
    const excerpt = content
        .replace(/!\[[^\]]*]\([^)]*\)/g, "")
        .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
        .replace(/[#>*_`~]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const clippedExcerpt = excerpt.length > 160 ? `${excerpt.slice(0, 157).trimEnd()}...` : excerpt;

    return clippedExcerpt ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-stone-600">{clippedExcerpt}</p> : null;
}

export default function NewsList() {
    const contentRef = useRef<HTMLDivElement | null>(null);
    const params = useParams();
    const lang = params.lang as Locale;
    const newsT = useTranslations("news.page");
    const {data, isLoading} = useListNewsQuery({lang, page: 0, size: 10});
    const [canCreateNews, setCanCreateNews] = useState(false);

    useEffect(() => {
        let active = true;

        getCurrentUser()
            .then((user) => {
                if (active) setCanCreateNews(hasRole(user, "SMM"));
            })
            .catch(() => {
                if (active) setCanCreateNews(false);
            });

        return () => {
            active = false;
        };
    }, []);

    const news = data?.content ?? [];

    return (
        <main ref={contentRef} id="public-page-content">
            <PublicPageHeader
                actions={canCreateNews ? (
                        <AuthenticatedLink
                            aria-label={newsT("createAction")}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 shadow-sm transition-[background-color,color,border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-stone-900 hover:bg-stone-900 hover:text-white hover:shadow-md active:translate-y-0 motion-reduce:transition-none"
                            fallbackHref={withLocale("/auth?mode=login", lang)}
                            href={withLocale("/admin/news", lang)}
                            onSessionExpired={() => setCanCreateNews(false)}
                        >
                            <span aria-hidden="true">+</span>
                            <span>{newsT("createAction")}</span>
                        </AuthenticatedLink>
                ) : null}
                intro={newsT("subtitle")}
                title={newsT("title")}
            />
            <div className="flex w-full min-w-0 flex-1 justify-center px-4 py-10 sm:px-6">
              <div className="flex w-full max-w-5xl flex-col gap-5">
                <div className="flex w-full flex-col gap-5">
                    {isLoading ? (
                        Array.from({length: 6}).map((_, index) => (
                            <div key={index} className="min-h-24 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                                <div className="p-5">
                                    <div className="mb-3 h-6 w-3/5 animate-pulse rounded-lg bg-stone-200 motion-reduce:animate-none" />
                                    <div className="mb-2 h-3.5 w-11/12 animate-pulse rounded-full bg-stone-100 motion-reduce:animate-none" />
                                    <div className="h-3.5 w-2/3 animate-pulse rounded-full bg-stone-100 motion-reduce:animate-none" />
                                </div>
                            </div>
                        ))
                    ) : news.map((news) => {
                        const coverDisplayMode = news.coverDisplayMode ?? "FILL";
                        const fitCover = news.coverImageUrl && coverDisplayMode === "FIT";

                        return (
                            <Link
                            scroll={false}
                            className="group block overflow-hidden rounded-2xl border border-stone-200 bg-white text-inherit no-underline shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-lg motion-reduce:transition-none"
                            key={news.id}
                            href={{
                                pathname: withLocale("/news/reader", lang),
                                query: {id: news.id}
                            }}
                        >
                            {news.coverImageUrl ? (
                                <>
                                    <div className={fitCover ? "relative flex h-40 items-center justify-center overflow-hidden bg-stone-100 p-2.5 sm:h-44" : "relative h-40 overflow-hidden bg-stone-100 sm:h-44"}>
                                        {fitCover ? (
                                            <>
                                                {/* eslint-disable-next-line @next/next/no-img-element -- decorative blurred copy of the public cover image. */}
                                                <img
                                                    alt=""
                                                    aria-hidden="true"
                                                    className="absolute -inset-3 h-[calc(100%+1.5rem)] w-[calc(100%+1.5rem)] object-cover opacity-20 blur-xl"
                                                    src={resolvePublishedMediaUrl(news.coverImageUrl)}
                                                />
                                                <div className="absolute inset-0 bg-white/50" aria-hidden="true" />
                                            </>
                                        ) : null}
                                        {/* eslint-disable-next-line @next/next/no-img-element -- media content is served by the public API host in development. */}
                                        <img
                                            alt={news.coverImageAlt ?? news.title}
                                            className={fitCover ? "relative block max-h-36 max-w-full rounded-lg object-contain shadow-sm sm:max-h-40" : "block h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"}
                                            src={resolvePublishedMediaUrl(news.coverImageUrl)}
                                        />
                                        {!fitCover ? <div className="absolute inset-0 bg-gradient-to-t from-stone-900/25 via-stone-900/5 to-transparent" aria-hidden="true" /> : null}
                                    </div>
                                    <div className={fitCover ? "relative border-t border-stone-200 p-5" : "relative mx-3 -mt-7 mb-3 rounded-xl border border-white/80 bg-white/95 p-4 shadow-sm backdrop-blur-sm sm:mx-4 sm:mb-4"}>
                                        <h2 className="line-clamp-2 text-xl font-semibold leading-tight tracking-tight text-stone-950">
                                            {news.title}
                                        </h2>
                                        <TextPreview content={news.content} />
                                    </div>
                                </>
                            ) : (
                                <div className="p-5">
                                    <h2 className="line-clamp-2 text-xl font-semibold leading-tight tracking-tight text-stone-950">
                                        {news.title}
                                    </h2>
                                    <TextPreview content={news.content} />
                                </div>
                            )}
                            </Link>
                        );
                    })}
                </div>
              </div>
            </div>
        </main>
    );
}
