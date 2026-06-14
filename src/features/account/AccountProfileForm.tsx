"use client";

import {useRouter} from "next/navigation";
import {useTranslations} from "next-intl";
import {useState} from "react";
import type {ReactNode} from "react";
import {useToast} from "@/components/ui/toast/ToastProvider";
import {AuthRequestError, type AuthenticatedUser, updateProfile} from "@/features/auth/auth.client";

type Props = {
    user: AuthenticatedUser;
};

export default function AccountProfileForm({user}: Props) {
    const t = useTranslations("accountPage.profileForm");
    const router = useRouter();
    const toast = useToast();
    const [firstName, setFirstName] = useState(user.firstName ?? "");
    const [lastName, setLastName] = useState(user.lastName ?? "");
    const [dateOfBirth, setDateOfBirth] = useState(user.dateOfBirth ?? "");
    const [isSaving, setIsSaving] = useState(false);

    async function submit() {
        setIsSaving(true);
        try {
            const updated = await updateProfile({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                dateOfBirth: dateOfBirth || null
            });
            setFirstName(updated.firstName ?? "");
            setLastName(updated.lastName ?? "");
            setDateOfBirth(updated.dateOfBirth ?? "");
            toast.success(t("saved"));
            router.refresh();
        } catch (error) {
            const message = error instanceof AuthRequestError && error.serverMessage
                ? error.serverMessage
                : t("saveError");
            toast.error(message);
        } finally {
            setIsSaving(false);
        }
    }

    const disabled = isSaving || firstName.trim().length < 2 || lastName.trim().length < 2;

    return (
        <section className="rounded-xl border border-stone-200 bg-stone-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">{t("title")}</h2>
                    <p className="mt-1 text-sm text-stone-600">{t("body")}</p>
                </div>
                <button
                    className="w-fit rounded-lg bg-stone-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300"
                    disabled={disabled}
                    onClick={submit}
                    type="button"
                >
                    {isSaving ? t("saving") : t("save")}
                </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label={t("firstName")}>
                    <input className={inputClass} maxLength={50} minLength={2} onChange={(event) => setFirstName(event.target.value)} value={firstName} />
                </Field>
                <Field label={t("lastName")}>
                    <input className={inputClass} maxLength={50} minLength={2} onChange={(event) => setLastName(event.target.value)} value={lastName} />
                </Field>
                <Field label={t("dateOfBirth")}>
                    <input className={inputClass} onChange={(event) => setDateOfBirth(event.target.value)} type="date" value={dateOfBirth} />
                </Field>
            </div>
            <p className="mt-3 text-xs leading-5 text-stone-500">{t("contactHint")}</p>
        </section>
    );
}

const inputClass = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition-colors focus:border-stone-800 disabled:bg-stone-100";

function Field({children, label}: {children: ReactNode; label: string}) {
    return (
        <label className="block space-y-1.5 text-sm font-medium text-stone-800">
            <span>{label}</span>
            {children}
        </label>
    );
}
