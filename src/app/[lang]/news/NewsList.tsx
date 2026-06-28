"use client";

import {useEffect, useRef, useState} from "react";
import Link from "next/link";
import {useParams} from "next/navigation";
import {useTranslations} from "next-intl";
import type {Locale} from "@/i18n";
import {resolvePublishedMediaUrl} from "@/features/news/newsMedia";
import {withLocale} from "@/shared/lib/locale/withLocale";
import styles from "./NewsComponent.module.scss";
import {useListNewsQuery} from "@/features/news/news.api";
import {getCurrentUser, hasRole} from "@/features/auth/auth.client";
import AuthenticatedLink from "@/features/auth/AuthenticatedLink";

function TextPreview({content}: { content: string }) {
    const excerpt = content
        .replace(/!\[[^\]]*]\([^)]*\)/g, "")
        .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
        .replace(/[#>*_`~]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const clippedExcerpt = excerpt.length > 160 ? `${excerpt.slice(0, 157).trimEnd()}...` : excerpt;

    return clippedExcerpt ? <p className={styles.excerpt}>{clippedExcerpt}</p> : null;
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
        <div ref={contentRef} className={styles.content} id="public-page-content">
            <div className={styles.newsLayout}>
                <header className={styles.newsHeader}>
                    <div className={styles.newsHeaderText}>
                        <h1>{newsT("title")}</h1>
                        <p>{newsT("subtitle")}</p>
                    </div>
                    {canCreateNews ? (
                        <AuthenticatedLink
                            aria-label={newsT("createAction")}
                            className={styles.createNewsButton}
                            fallbackHref={withLocale("/auth?mode=login", lang)}
                            href={withLocale("/admin/news", lang)}
                            onSessionExpired={() => setCanCreateNews(false)}
                        >
                            <span aria-hidden="true">+</span>
                            <span>{newsT("createAction")}</span>
                        </AuthenticatedLink>
                    ) : null}
                </header>

                <div className={styles.newsBlock}>
                    {isLoading ? (
                        Array.from({length: 6}).map((_, index) => (
                            <div key={index} className={`${styles.newsCard} ${styles.textCard} ${styles.newsCardSkeleton}`}>
                                <div className={styles.textCardContent}>
                                    <div className={styles.skeletonTitle} />
                                    <div className={styles.skeletonLine} />
                                    <div className={styles.skeletonLineShort} />
                                </div>
                            </div>
                        ))
                    ) : news.map((news) => {
                        const coverDisplayMode = news.coverDisplayMode ?? "FILL";
                        const fitCover = news.coverImageUrl && coverDisplayMode === "FIT";

                        return (
                            <Link
                            scroll={false}
                            className={`${styles.newsCard} ${news.coverImageUrl ? "" : styles.textCard}`}
                            key={news.id}
                            href={{
                                pathname: withLocale("/news/reader", lang),
                                query: {id: news.id}
                            }}
                        >
                            {news.coverImageUrl ? (
                                <>
                                    <div className={fitCover ? styles.fitImageArea : styles.imageArea}>
                                        {fitCover ? (
                                            <>
                                                {/* eslint-disable-next-line @next/next/no-img-element -- decorative blurred copy of the public cover image. */}
                                                <img
                                                    alt=""
                                                    aria-hidden="true"
                                                    className={styles.fitBackdropImage}
                                                    src={resolvePublishedMediaUrl(news.coverImageUrl)}
                                                />
                                                <div className={styles.fitBackdropShade} aria-hidden="true" />
                                            </>
                                        ) : null}
                                        {/* eslint-disable-next-line @next/next/no-img-element -- media content is served by the public API host in development. */}
                                        <img
                                            alt={news.coverImageAlt ?? news.title}
                                            className={fitCover ? styles.fitCardCoverImage : styles.cardCoverImage}
                                            src={resolvePublishedMediaUrl(news.coverImageUrl)}
                                        />
                                        {!fitCover ? <div className={styles.cardOverlay} aria-hidden="true" /> : null}
                                    </div>
                                    <div className={`${styles.coverCardContent} ${fitCover ? styles.fitCardContent : ""}`}>
                                        <h2 className={styles.title}>
                                            {news.title}
                                        </h2>
                                        <TextPreview content={news.content} />
                                    </div>
                                </>
                            ) : (
                                <div className={styles.textCardContent}>
                                    <h2 className={styles.title}>
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
    );
}
