"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useGetArticleQuery } from "@/features/articles/articles.api";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./reader.module.scss";

export default function Page() {
    const contentRef = useRef<HTMLDivElement | null>(null);
    const cardRef = useRef<HTMLElement | null>(null);
    const firstScrollRef = useRef(true);
    const sp = useSearchParams();
    const idParam = sp.get("id");
    const id = idParam ? Number(idParam) : null;

    const { data, isLoading } = useGetArticleQuery(id ?? 0, { skip: id === null });

    useEffect(() => {
        firstScrollRef.current = true;
    }, [id]);

    useEffect(() => {
        if (id !== null && !isLoading && cardRef.current) {
            const el = cardRef.current;
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const top = el.getBoundingClientRect().top + window.scrollY;
                    window.scrollTo({ top, behavior: "smooth" });
                });
            });
            firstScrollRef.current = false;
        }
    }, [id, isLoading]);

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