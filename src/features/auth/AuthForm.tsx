"use client";

import {FormEvent, useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useLocale, useTranslations} from "next-intl";
import type {Locale} from "@/i18n";
import {withLocale} from "@/shared/lib/locale/withLocale";
import {useToast} from "@/components/ui/toast/ToastProvider";
import {AuthRequestError, login, register} from "./auth.client";

type Mode = "login" | "register";

type Props = {
    initialMode?: Mode;
};

export default function AuthForm({initialMode = "login"}: Props) {
    const locale = useLocale() as Locale;
    const router = useRouter();
    const t = useTranslations("auth");
    const toast = useToast();
    const [mode, setMode] = useState<Mode>(initialMode);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [password, setPassword] = useState("");

    function selectMode(nextMode: Mode) {
        setMode(nextMode);
        setError(null);
        setPassword("");
        router.replace(withLocale(`/auth?mode=${nextMode}`, locale), {scroll: false});
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);

        const formData = new FormData(event.currentTarget);
        const phone = String(formData.get("phone") ?? "").trim();
        const email = String(formData.get("email") ?? "").trim();

        if (mode === "register" && !phone && !email) {
            const message = t("register.contactRequired");
            setError(message);
            toast.error(message);
            return;
        }

        if (mode === "register" && !passwordIsValid) {
            const message = t("register.passwordError");
            setError(message);
            toast.error(message);
            return;
        }

        setSubmitting(true);

        try {
            const user = mode === "login"
                ? await login({
                    identifier: String(formData.get("identifier") ?? "").trim(),
                    password
                })
                : await register({
                    phone: phone || undefined,
                    email: email || undefined,
                    firstName: String(formData.get("firstName") ?? "").trim(),
                    lastName: String(formData.get("lastName") ?? "").trim(),
                    password
                });

            toast.success(t(`${mode}.success`));
            router.replace(withLocale(user.role === "ADMIN" ? "/admin" : "/", locale));
            router.refresh();
        } catch (requestError) {
            let message: string;
            if (mode === "register"
                && requestError instanceof AuthRequestError
                && requestError.serverMessage === "Account already registered") {
                message = t("register.existingAccount");
            } else {
                message = t(`${mode}.error`);
            }
            setError(message);
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    }

    const passwordChecks = {
        length: password.length >= 12,
        upper: /\p{Lu}/u.test(password),
        lower: /\p{Ll}/u.test(password),
        number: /\d/.test(password),
        special: /[^\p{L}\d\s]/u.test(password)
    };
    const passwordIsValid = Object.values(passwordChecks).every(Boolean);

    return (
        <form
            className="w-full max-w-xl space-y-4 rounded-2xl border border-stone-200/80 bg-stone-50/95 p-5 shadow-2xl backdrop-blur-sm sm:p-7"
            onSubmit={handleSubmit}
        >
            <Link
                className="inline-flex items-center text-sm font-medium text-stone-600 transition hover:text-stone-950"
                href={withLocale("/", locale)}
            >
                {t("back")}
            </Link>

            <div className="space-y-2">
                <h1 className="text-3xl font-bold">{t(`${mode}.title`)}</h1>
                <p className="text-sm text-stone-600">{t(`${mode}.subtitle`)}</p>
            </div>

            {mode === "login" ? (
                <label className="block space-y-2 text-sm font-medium text-stone-800">
                    <span>{t("fields.identifier")}</span>
                    <input
                        required
                        name="identifier"
                        type="text"
                        maxLength={254}
                        autoComplete="username"
                        placeholder={t("fields.identifierPlaceholder")}
                        className="w-full rounded-md border border-stone-300 px-3 py-2 font-normal"
                    />
                </label>
            ) : (
                <>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block space-y-2 text-sm font-medium text-stone-800">
                            <span>{t("fields.firstName")}</span>
                            <input required name="firstName" type="text" minLength={2} maxLength={50} autoComplete="given-name" className="w-full rounded-md border border-stone-300 px-3 py-2 font-normal" />
                        </label>
                        <label className="block space-y-2 text-sm font-medium text-stone-800">
                            <span>{t("fields.lastName")}</span>
                            <input required name="lastName" type="text" minLength={2} maxLength={50} autoComplete="family-name" className="w-full rounded-md border border-stone-300 px-3 py-2 font-normal" />
                        </label>
                    </div>

                    <p className="text-sm text-stone-600">{t("register.contactHint")}</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block space-y-2 text-sm font-medium text-stone-800">
                            <span>{t("fields.phone")}</span>
                            <input name="phone" type="tel" maxLength={32} autoComplete="tel" placeholder="+380... / 0..." className="w-full rounded-md border border-stone-300 px-3 py-2 font-normal" />
                        </label>
                        <label className="block space-y-2 text-sm font-medium text-stone-800">
                            <span>{t("fields.email")}</span>
                            <input name="email" type="email" maxLength={254} autoComplete="email" className="w-full rounded-md border border-stone-300 px-3 py-2 font-normal" />
                        </label>
                    </div>
                </>
            )}

            <label className="block space-y-2 text-sm font-medium text-stone-800">
                <span>{t("fields.password")}</span>
                <input
                    required
                    name="password"
                    type="password"
                    value={password}
                    minLength={mode === "register" ? 12 : undefined}
                    maxLength={128}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className="w-full rounded-md border border-stone-300 px-3 py-2 font-normal"
                />
            </label>

            {mode === "register" ? (
                <div className="rounded-xl bg-stone-100 p-3 text-xs text-stone-700" aria-live="polite">
                    <p className="font-medium">{t("register.passwordTitle")}</p>
                    <div className="mt-2 grid gap-1 sm:grid-cols-2">
                        {Object.entries(passwordChecks).map(([requirement, valid]) => (
                            <span className={valid ? "text-emerald-700" : "text-stone-600"} key={requirement}>
                                {valid ? "✓ " : "• "}{t(`register.password.${requirement}`)}
                            </span>
                        ))}
                    </div>
                </div>
            ) : null}

            {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p> : null}

            <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-stone-900 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
                {submitting ? t("submitting") : t(`${mode}.submit`)}
            </button>

            <p className="text-center text-sm text-stone-600">
                {t(`${mode}.alternative`)}{" "}
                <button
                    className="font-medium text-stone-950 underline decoration-stone-400 underline-offset-2 hover:decoration-stone-900"
                    type="button"
                    onClick={() => selectMode(mode === "login" ? "register" : "login")}
                >
                    {t(`${mode}.alternativeLink`)}
                </button>
            </p>
        </form>
    );
}
