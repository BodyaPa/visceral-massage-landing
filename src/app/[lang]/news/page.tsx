"use client";

import { useRef } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { useListArticlesQuery } from "@/features/articles/articles.api";
import styles from "./ArticlesComponent.module.scss";
import {useParams} from "next/navigation";
import type {Locale} from "@/i18n";
import {withLocale} from "@/shared/lib/locale/withLocale";

export default function Page() {
    const contentRef = useRef<HTMLDivElement | null>(null);
    const { data, isLoading } = useListArticlesQuery({ page: 0, size: 10 });
    const params = useParams();
    const lang = params.lang as Locale;

    const articles = data?.content ?? [];

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
                <div className={styles.articlesBlock}>
                    {Array.from({ length: 6 }).map((_, i) => (   // 6?
                        <div key={i} className={styles.articleLinkSkeleton}>
                            <div className={styles.previewArticleBlock}>
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
            <div className={styles.articlesBlock}>
                {articles.map((article) => (
                    <Link scroll={false} className={styles.articleLink} key={article.id} href={{
                        pathname: withLocale('/news/reader', lang),
                        query: {id: article.id}
                    }}>
                        <div className={styles.previewArticleBlock}>
                            <h2 className={styles.title}>{article.title}</h2>
                            {article.content ? <TextPreview content={article.content} /> : null}
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}