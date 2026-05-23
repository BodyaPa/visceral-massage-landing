"use client";

import {Suspense, useCallback, useRef} from "react";
import {useSearchParams} from "next/navigation";
import {useGetArticleQuery} from "@/features/articles/articles.api";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./reader.module.scss";
import {useSmartAutoScroll} from "@/shared/lib/scroll/useSmartAutoScroll";

function NewsReaderContent() {
    const contentRef = useRef<HTMLDivElement | null>(null);
    const cardRef = useRef<HTMLElement | null>(null);

    const sp = useSearchParams();
    const idParam = sp.get("id");
    const id = idParam ? Number(idParam) : null;

    const {data, isLoading} = useGetArticleQuery(id ?? 0, {skip: id === null});

    const scrollToCard = useCallback(() => {
        const el = cardRef.current;
        if (!el) return;

        const top = el.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({top, behavior: "smooth"});
    }, []);

    useSmartAutoScroll({
        enabled: id !== null && !isLoading,
        deps: [id, isLoading],
        action: scrollToCard
    });

    if (id === null) return <div className={styles.content} />;

    if (isLoading) {
        return (
            <div ref={contentRef} className={styles.content}>
                <article ref={cardRef} className={styles.card}>
                    <div className={styles.skeletonTitle} />
                    <div className={styles.skeletonLine} />
                    <div className={styles.skeletonLine} />
                    <div className={styles.skeletonLine} />
                </article>
            </div>
        );
    }

    const title = data?.title ?? "";
    const markdown = data?.content ?? "";

    return (
        <div ref={contentRef} className={styles.content}>
            <article ref={cardRef} className={styles.card}>
                <header className={styles.header}>
                    <h1 className={styles.title}>{title}</h1>
                </header>

                <div className={styles.markdown}>
                    <Markdown remarkPlugins={[remarkGfm]}>{markdown}</Markdown>
                </div>
            </article>
        </div>
    );
}

export default function NewsReaderPage() {
    return (
        <Suspense fallback={<div className={styles.content} />}>
            <NewsReaderContent />
        </Suspense>
    );
}
