"use client";

import {useTranslations} from "next-intl";
import {useListMessagesQuery} from "./messages.api";
import TelegramConnectionSettings from "./TelegramConnectionSettings";

export default function MessageHistoryPanel() {
    const t = useTranslations("accountPage.serviceMessages");
    const {data, isLoading} = useListMessagesQuery({size: 20});

    return <section className="mt-5 rounded-xl border border-stone-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-stone-950">{t("title")}</h2>
        <p className="mt-1 text-sm text-stone-500">{t("subtitle")}</p>
        <div className="mt-4"><TelegramConnectionSettings /></div>
        {isLoading ? <p className="mt-4 text-sm text-stone-500">{t("loading")}</p> : <ol className="mt-4 space-y-3">{(data?.content ?? []).map((message) => <li className="rounded-lg bg-stone-50 p-3" key={message.id}><div className="flex justify-between gap-3"><strong className="text-sm">{message.subject}</strong><time className="text-xs text-stone-500">{new Date(message.createdAt).toLocaleString()}</time></div><p className="mt-2 whitespace-pre-line text-sm text-stone-700">{message.body}</p><div className="mt-2 flex flex-wrap gap-1">{message.deliveries.map((delivery) => <span className="rounded-full border border-stone-200 bg-white px-2 py-1 text-xs" key={delivery.id}>{delivery.channel}: {delivery.status}</span>)}</div></li>)}</ol>}
    </section>;
}
