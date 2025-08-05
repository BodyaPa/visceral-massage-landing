import styles from "./ArticlesComponent.module.scss"
import {ArticleContent} from "../../../test-data/testDataFunctions"
import MarkdownReader from "@/app/articles/markdownReader/MarkdownReader";

export default function Page() {
    let articles = ArticleContent();

    return <div className={styles.content}>
        <div>
            {articles.map((article, index) => (
                <div className={styles.previewArticleBlock} key={article.title || index}>
                    <h1>{article.title}</h1>
                    <MarkdownReader content={article.content} />
                </div>
            ))}
        </div>
    </div>
}

