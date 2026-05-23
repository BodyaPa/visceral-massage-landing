"use client";

import {useRef} from "react";
import Link from "next/link";
import {useParams} from "next/navigation";
import ReactMarkdown from "react-markdown";
import type {Locale} from "@/i18n";
import {withLocale} from "@/shared/lib/locale/withLocale";
import styles from "./NewsComponent.module.scss";
import {useListNewsQuery} from "@/features/news/news.api";

function TextPreview({content}: { content: string }) {
    const parts = content.split("\n");
    const excerpt = `${parts.slice(0, 3).join("\n").slice(0, 200)}...`;

    return <ReactMarkdown>{excerpt}</ReactMarkdown>;
}

export default function NewsList() {
    const contentRef = useRef<HTMLDivElement | null>(null);
    const {data, isLoading} = useListNewsQuery({page: 0, size: 10});
    const params = useParams();
    const lang = params.lang as Locale;

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
                            <h2 className={styles.title}>{news.title}</h2>
                            {news.content ? <TextPreview content={news.content} /> : null}
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
