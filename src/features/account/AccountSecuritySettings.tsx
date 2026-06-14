"use client";

import {useRouter} from "next/navigation";
import {useLocale, useTranslations} from "next-intl";
import {useState} from "react";
import {useToast} from "@/components/ui/toast/ToastProvider";
import {
    AuthRequestError,
    changePassword,
    confirmContactChange,
    requestContactChange,
    type AuthenticatedUser
} from "@/features/auth/auth.client";
import type {Locale} from "@/i18n";
import {withLocale} from "@/shared/lib/locale/withLocale";

type ContactMode = "email" | "phone";

export default function AccountSecuritySettings({user}: {user: AuthenticatedUser}) {
    const t = useTranslations("accountPage.securitySettings");
    const locale = useLocale() as Locale;
    const router = useRouter();
    const toast = useToast();
    const [contactMode, setContactMode] = useState<ContactMode>("email");
    const [contactValue, setContactValue] = useState("");
    const [code, setCode] = useState("");
    const [codeRequested, setCodeRequested] = useState(false);
    const [isContactSaving, setIsContactSaving] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [isPasswordSaving, setIsPasswordSaving] = useState(false);

    function contactPayload() {
        const value = contactValue.trim();
        return contactMode === "email" ? {email: value} : {phone: value};
    }

    async function requestCode() {
        setIsContactSaving(true);
        try {
            await requestContactChange(contactPayload());
            setCodeRequested(true);
            toast.success(t("contact.requested"));
        } catch (error) {
            toast.error(errorMessage(error, t("contact.requestError")));
        } finally {
            setIsContactSaving(false);
        }
    }

    async function confirmCode() {
        setIsContactSaving(true);
        try {
            await confirmContactChange({...contactPayload(), code: code.trim()});
            setContactValue("");
            setCode("");
            setCodeRequested(false);
            toast.success(t("contact.saved"));
            router.refresh();
        } catch (error) {
            toast.error(errorMessage(error, t("contact.saveError")));
        } finally {
            setIsContactSaving(false);
        }
    }

    async function submitPassword() {
        if (newPassword !== repeatPassword) {
            toast.error(t("password.mismatch"));
            return;
        }
        setIsPasswordSaving(true);
        try {
            await changePassword({currentPassword, newPassword});
            toast.success(t("password.saved"));
            router.replace(withLocale("/auth?mode=login", locale));
            router.refresh();
        } catch (error) {
            toast.error(errorMessage(error, t("password.saveError")));
        } finally {
            setIsPasswordSaving(false);
        }
    }

    const contactDisabled = isContactSaving || contactValue.trim().length < 3;
    const confirmDisabled = contactDisabled || code.trim().length !== 6;
    const passwordDisabled = isPasswordSaving || currentPassword.length === 0 || newPassword.length < 12 || repeatPassword.length < 12;

    return (
        <section className="rounded-xl border border-stone-200 bg-white p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">{t("title")}</h2>
            <p className="mt-2 text-sm text-stone-700">{t("body")}</p>
            <div className="mt-4 grid gap-4">
                <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                    <h3 className="text-sm font-semibold text-stone-900">{t("contact.title")}</h3>
                    <p className="mt-1 text-xs leading-5 text-stone-500">{t("contact.current", {email: user.email ?? t("empty"), phone: user.phone ?? t("empty")})}</p>
                    <div className="mt-3 grid gap-2">
                        <label className="block space-y-1.5 text-sm font-medium text-stone-800">
                            <span>{t("contact.type")}</span>
                            <select className={inputClass} onChange={(event) => setContactMode(event.target.value as ContactMode)} value={contactMode}>
                                <option value="email">{t("contact.email")}</option>
                                <option value="phone">{t("contact.phone")}</option>
                            </select>
                        </label>
                        <label className="block space-y-1.5 text-sm font-medium text-stone-800">
                            <span>{contactMode === "email" ? t("contact.email") : t("contact.phone")}</span>
                            <input className={inputClass} onChange={(event) => setContactValue(event.target.value)} value={contactValue} />
                        </label>
                        {codeRequested ? (
                            <label className="block space-y-1.5 text-sm font-medium text-stone-800">
                                <span>{t("contact.code")}</span>
                                <input className={inputClass} inputMode="numeric" maxLength={6} onChange={(event) => setCode(event.target.value)} value={code} />
                            </label>
                        ) : null}
                        <div className="flex flex-wrap gap-2">
                            <button className={secondaryButtonClass} disabled={contactDisabled} onClick={requestCode} type="button">
                                {isContactSaving ? t("saving") : t("contact.request")}
                            </button>
                            {codeRequested ? (
                                <button className={primaryButtonClass} disabled={confirmDisabled} onClick={confirmCode} type="button">
                                    {isContactSaving ? t("saving") : t("contact.confirm")}
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                    <h3 className="text-sm font-semibold text-stone-900">{t("password.title")}</h3>
                    <div className="mt-3 grid gap-2">
                        <PasswordField label={t("password.current")} onChange={setCurrentPassword} value={currentPassword} />
                        <PasswordField label={t("password.next")} onChange={setNewPassword} value={newPassword} />
                        <PasswordField label={t("password.repeat")} onChange={setRepeatPassword} value={repeatPassword} />
                        <button className={primaryButtonClass} disabled={passwordDisabled} onClick={submitPassword} type="button">
                            {isPasswordSaving ? t("saving") : t("password.save")}
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}

const inputClass = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition-colors focus:border-stone-800";
const primaryButtonClass = "w-fit rounded-lg bg-stone-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300";
const secondaryButtonClass = "w-fit rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-400";

function PasswordField({label, onChange, value}: {label: string; onChange: (value: string) => void; value: string}) {
    return (
        <label className="block space-y-1.5 text-sm font-medium text-stone-800">
            <span>{label}</span>
            <input className={inputClass} onChange={(event) => onChange(event.target.value)} type="password" value={value} />
        </label>
    );
}

function errorMessage(error: unknown, fallback: string) {
    return error instanceof AuthRequestError && error.serverMessage ? error.serverMessage : fallback;
}
