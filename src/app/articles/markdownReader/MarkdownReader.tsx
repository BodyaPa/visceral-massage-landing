import ReactMarkdown from 'react-markdown'

export default function MarkdownReader({ content }: { content: string }) {

    // function getInlineExcerpt(markdown: string, wordLimit: number): any {
    //     let wordsLength = markdown.split(' ');
    //     let firstEnters = markdown.split('');
    //     // console.log(firstEnters)
    //
    //     return wordsLength.slice(0, wordLimit).join(' ');
    // }


    // getInlineExcerpt(content, 30)

    // console.log(getInlineExcerpt(articles, 30) + "\n\n\n\n\n\n\n")
    return <ReactMarkdown>{content}</ReactMarkdown>;
}