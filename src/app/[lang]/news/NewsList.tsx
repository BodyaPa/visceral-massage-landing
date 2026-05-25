"use client";

import {useEffect, useRef, useState} from "react";
import Link from "next/link";
import {useParams} from "next/navigation";
import {useTranslations} from "next-intl";
import ReactMarkdown from "react-markdown";
import type {Locale} from "@/i18n";
import {withLocale} from "@/shared/lib/locale/withLocale";
import styles from "./NewsComponent.module.scss";
import {useListNewsQuery} from "@/features/news/news.api";
import {getCurrentUser} from "@/features/auth/auth.client";

function TextPreview({content}: { content: string }) {
    const parts = content.split("\n");
    const excerpt = `${parts.slice(0, 3).join("\n").slice(0, 200)}...`;

    return <ReactMarkdown>{excerpt}</ReactMarkdown>;
}

export default function NewsList() {
    const contentRef = useRef<HTMLDivElement | null>(null);
    const params = useParams();
    const lang = params.lang as Locale;
    const t = useTranslations("news.page");
    const adminNewsT = useTranslations("admin.news.page");
    const {data, isLoading} = useListNewsQuery({lang, page: 0, size: 10});
    const [canCreateNews, setCanCreateNews] = useState(false);

    useEffect(() => {
        let active = true;

        getCurrentUser()
            .then((user) => {
                if (active) setCanCreateNews(user?.role === "ADMIN");
            })
            .catch(() => {
                if (active) setCanCreateNews(false);
            });

        return () => {
            active = false;
        };
    }, []);

    const news = data?.content ?? [];

    if (isLoading) {
        return (
            <div ref={contentRef} className={styles.content}>
                <div className={styles.newsBlock}>
                    {Array.from({length: 6}).map((_, index) => (
                        <div key={index} className={styles.newsLinkSkeleton}>
                            <div className={styles.previewNewsBlock}>
                                <div className={styles.skeletonTitle} />
                                <div className={styles.skeletonLine} />
                                <div className={styles.skeletonLine} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div ref={contentRef} className={styles.content}>
            <div className={styles.newsLayout}>
                <div className={styles.newsBlock}>
                    {news.map((news) => (
                        <Link
                            scroll={false}
                            className={styles.newsLink}
                            key={news.id}
                            href={{
                                pathname: withLocale("/news/reader", lang),
                                query: {id: news.id}
                            }}
                        >
                            <div className={styles.previewNewsBlock}>
                                <h2 className={styles.title}>
                                    {news.translationAvailable ? news.title : t("translationUnavailableTitle")}
                                </h2>
                                {news.translationAvailable && news.content
                                    ? <TextPreview content={news.content} />
                                    : <p>{t("translationUnavailableContent")}</p>}
                            </div>
                        </Link>
                    ))}
                </div>

                {canCreateNews ? (
                    <aside className={styles.adminPanel} aria-label={adminNewsT("title")}>
                        <Link
                            aria-label={adminNewsT("createAction")}
                            className={styles.createNewsButton}
                            href={withLocale("/admin/news", lang)}
                        >
                            <span aria-hidden="true">+</span>
                            <span>{adminNewsT("createAction")}</span>
                        </Link>
                    </aside>
                ) : null}
            </div>
        </div>
    );
}
