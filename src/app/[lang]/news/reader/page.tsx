"use client";

import {Suspense} from "react";
import {useParams, useSearchParams} from "next/navigation";
import {useGetNewsQuery} from "@/features/news/news.api";
import type {Locale} from "@/i18n";
import Markdown, {defaultUrlTransform} from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./reader.module.scss";
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

    if (id === null) return <div className={styles.content} id="public-page-content" data-route-scroll-target />;

    if (isLoading) {
        return (
            <div className={styles.content} id="public-page-content" data-route-scroll-target>
                <article className={styles.card}>
                    <div className={styles.articleBody}>
                        <div className={styles.skeletonTitle} />
                        <div className={styles.skeletonLine} />
                        <div className={styles.skeletonLine} />
                        <div className={styles.skeletonLine} />
                    </div>
                </article>
            </div>
        );
    }

    const title = data?.title ?? "";
    const markdown = data?.content ?? "";

    return (
        <div className={styles.content} id="public-page-content" data-route-scroll-target>
            <article className={styles.card}>
                {coverImageUrl ? (
                    <div className={`${styles.hero} ${fitCover ? styles.fitHero : styles.fillHero}`}>
                        {fitCover ? (
                            <>
                                {/* eslint-disable-next-line @next/next/no-img-element -- decorative blurred copy of the public cover image. */}
                                <img
                                    alt=""
                                    aria-hidden="true"
                                    className={styles.heroBackdropImage}
                                    src={resolvePublishedMediaUrl(coverImageUrl)}
                                />
                                <div className={styles.heroShade} aria-hidden="true" />
                            </>
                        ) : null}
                        <div className={fitCover ? styles.fitImageFrame : styles.fillImageFrame}>
                            {/* eslint-disable-next-line @next/next/no-img-element -- media content is served by the API endpoint for this news item. */}
                            <img
                                alt={data?.coverImageAlt ?? title}
                                className={`${styles.coverImage} ${fitCover ? styles.fitImage : styles.fillImage}`}
                                src={resolvePublishedMediaUrl(coverImageUrl)}
                            />
                        </div>
                        {!fitCover ? <div className={styles.fillShade} aria-hidden="true" /> : null}
                    </div>
                ) : null}

                <div className={styles.articleBody}>
                    <header className={styles.header}>
                        <h1 className={styles.title}>{title}</h1>
                    </header>

                    <div className={styles.markdown}>
                        <Markdown
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
        <Suspense fallback={<div className={styles.content} id="public-page-content" data-route-scroll-target />}>
            <NewsReaderContent />
        </Suspense>
    );
}
