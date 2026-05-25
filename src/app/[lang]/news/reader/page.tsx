"use client";

import {Suspense, useCallback, useRef} from "react";
import {useParams, useSearchParams} from "next/navigation";
import {useTranslations} from "next-intl";
import {useGetNewsQuery} from "@/features/news/news.api";
import type {Locale} from "@/i18n";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./reader.module.scss";
import {useSmartAutoScroll} from "@/shared/lib/scroll/useSmartAutoScroll";

function NewsReaderContent() {
    const contentRef = useRef<HTMLDivElement | null>(null);
    const cardRef = useRef<HTMLElement | null>(null);
    const params = useParams();
    const lang = params.lang as Locale;
    const t = useTranslations("news.page");

    const sp = useSearchParams();
    const idParam = sp.get("id");
    const id = idParam ? Number(idParam) : null;

    const {data, isLoading} = useGetNewsQuery({id: id ?? 0, lang}, {skip: id === null});

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

    const translationAvailable = data?.translationAvailable ?? false;
    const title = data
        ? translationAvailable ? data.title ?? "" : t("translationUnavailableTitle")
        : "";
    const markdown = data
        ? translationAvailable ? data.content ?? "" : t("translationUnavailableContent")
        : "";

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
