"use client";

import { useRef } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { useListNewsQuery } from "@/features/news/news.api";
import styles from "./NewsComponent.module.scss";
import {useParams} from "next/navigation";
import type {Locale} from "@/i18n";
import {withLocale} from "@/shared/lib/locale/withLocale";

export default function Page() {
    const contentRef = useRef<HTMLDivElement | null>(null);
    const { data, isLoading } = useListNewsQuery({ page: 0, size: 10 });
    const params = useParams();
    const lang = params.lang as Locale;

    const newsItems = data?.content ?? [];

    function TextPreview({ content }: { content: string }) {
        function getInlineExcerpt(markdown: string, lines: number) {
            const parts = markdown.split("\n");
            return parts.slice(0, lines).join("\n").slice(0, 200) + "...";
        }
        return <ReactMarkdown>{getInlineExcerpt(content, 3)}</ReactMarkdown>;
    }

    if (isLoading) {
        return (
            <div ref={contentRef} className={styles.content}>
                <div className={styles.newsBlock}>
                    {Array.from({ length: 6 }).map((_, i) => (   // 6?
                        <div key={i} className={styles.newsLinkSkeleton}>
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
            <div className={styles.newsBlock}>
                {newsItems.map((newsItem) => (
                    <Link scroll={false} className={styles.newsLink} key={newsItem.id} href={{
                        pathname: withLocale('/news/reader', lang),
                        query: {id: newsItem.id}
                    }}>
                        <div className={styles.previewNewsBlock}>
                            <h2 className={styles.title}>{newsItem.title}</h2>
                            {newsItem.content ? <TextPreview content={newsItem.content} /> : null}
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
