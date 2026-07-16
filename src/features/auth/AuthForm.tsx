"use client";

import {FormEvent, useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useLocale, useTranslations} from "next-intl";
import type {Locale} from "@/i18n";
import {withLocale} from "@/shared/lib/locale/withLocale";
import {useToast} from "@/components/ui/toast/ToastProvider";
import {AuthRequestError, confirmPasswordRecovery, confirmRegistration, login, requestPasswordRecovery, requestRegistration} from "./auth.client";
import Button from "@/components/ui/button/Button";
import Field from "@/components/ui/form/Field";
import Input from "@/components/ui/form/Input";
import Alert from "@/components/ui/state/Alert";

type Mode = "login" | "register" | "recovery";

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
    const [recoveryContact, setRecoveryContact] = useState("");
    const [recoveryRequested, setRecoveryRequested] = useState(false);
    const [registrationContact, setRegistrationContact] = useState("");
    const [registrationRequested, setRegistrationRequested] = useState(false);

    function selectMode(nextMode: Mode) {
        setMode(nextMode);
        setError(null);
        setPassword("");
        setRecoveryRequested(false);
        setRegistrationContact("");
        setRegistrationRequested(false);
        router.replace(withLocale(`/auth?mode=${nextMode}`, locale), {scroll: false});
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);

        const formData = new FormData(event.currentTarget);
        const phone = String(formData.get("phone") ?? "").trim();
        const email = String(formData.get("email") ?? "").trim();

        if (mode === "recovery") {
            await handleRecoverySubmit(formData);
            return;
        }

        if (mode === "register" && registrationRequested) {
            await handleRegistrationConfirm(formData);
            return;
        }

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
            if (mode === "login") {
                await login({
                    identifier: String(formData.get("identifier") ?? "").trim(),
                    password
                });
                toast.success(t("login.success"));
                router.replace(withLocale("/", locale));
                router.refresh();
                return;
            }

            await requestRegistration({
                    phone: phone || undefined,
                    email: email || undefined,
                    firstName: String(formData.get("firstName") ?? "").trim(),
                    lastName: String(formData.get("lastName") ?? "").trim(),
                    dateOfBirth: String(formData.get("dateOfBirth") ?? "") || undefined,
                    password
            });
            setRegistrationContact(email || phone);
            setRegistrationRequested(true);
            toast.success(t("register.requestSuccess"));
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

    async function handleRegistrationConfirm(formData: FormData) {
        const code = normalizeCode(formData.get("code"));
        setSubmitting(true);

        try {
            await confirmRegistration({...recoveryPayload(registrationContact), code});
            toast.success(t("register.success"));
            router.replace(withLocale("/", locale));
            router.refresh();
        } catch (requestError) {
            let message = t("register.confirmError");
            if (requestError instanceof AuthRequestError
                && requestError.serverMessage === "Account already registered") {
                message = t("register.existingAccount");
            }
            setError(message);
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleRecoverySubmit(formData: FormData) {
        const contact = String(formData.get("recoveryContact") ?? recoveryContact).trim();
        const code = normalizeCode(formData.get("code"));

        if (!contact) {
            const message = t("recovery.contactRequired");
            setError(message);
            toast.error(message);
            return;
        }

        if (recoveryRequested && !passwordIsValid) {
            const message = t("register.passwordError");
            setError(message);
            toast.error(message);
            return;
        }

        setSubmitting(true);

        try {
            if (!recoveryRequested) {
                await requestPasswordRecovery(recoveryPayload(contact));
                setRecoveryContact(contact);
                setRecoveryRequested(true);
                toast.success(t("recovery.requestSuccess"));
                return;
            }

            await confirmPasswordRecovery({...recoveryPayload(contact), code, newPassword: password});
            toast.success(t("recovery.confirmSuccess"));
            selectMode("login");
        } catch {
            const message = recoveryRequested ? t("recovery.confirmError") : t("recovery.requestError");
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
            className="auth-card w-full max-w-xl space-y-4 rounded-2xl border border-stone-200/80 bg-stone-50/95 p-5 shadow-2xl backdrop-blur-sm sm:p-7"
            key={mode}
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

            {mode === "recovery" ? (
                <>
                    <label className="block space-y-2 text-sm font-medium text-stone-800">
                        <span>{t("fields.recoveryContact")}</span>
                        <Input
                            required
                            name="recoveryContact"
                            type="text"
                            maxLength={254}
                            autoComplete="username"
                            placeholder={t("fields.identifierPlaceholder")}
                            value={recoveryContact}
                            onChange={(event) => setRecoveryContact(event.target.value)}
                            disabled={recoveryRequested}
                        />
                    </label>
                    {recoveryRequested ? (
                        <>
                            <label className="block space-y-2 text-sm font-medium text-stone-800">
                                <span>{t("fields.recoveryCode")}</span>
                                <Input required name="code" type="text" inputMode="numeric" maxLength={16} autoComplete="one-time-code" />
                            </label>
                            <label className="block space-y-2 text-sm font-medium text-stone-800">
                                <span>{t("fields.newPassword")}</span>
                                <Input required name="password" type="password" value={password} minLength={12} maxLength={128} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
                            </label>
                            <PasswordChecklist passwordChecks={passwordChecks} t={t} />
                        </>
                    ) : (
                        <Alert>{t("recovery.genericHint")}</Alert>
                    )}
                </>
            ) : mode === "login" ? (
                <Field htmlFor="auth-identifier" label={t("fields.identifier")}>
                    <Input
                        id="auth-identifier"
                        required
                        name="identifier"
                        type="text"
                        maxLength={254}
                        autoComplete="username"
                        placeholder={t("fields.identifierPlaceholder")}
                    />
                </Field>
            ) : (
                <>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block space-y-2 text-sm font-medium text-stone-800">
                            <span>{t("fields.firstName")}</span>
                            <Input required name="firstName" type="text" minLength={2} maxLength={50} autoComplete="given-name" disabled={registrationRequested} />
                        </label>
                        <label className="block space-y-2 text-sm font-medium text-stone-800">
                            <span>{t("fields.lastName")}</span>
                            <Input required name="lastName" type="text" minLength={2} maxLength={50} autoComplete="family-name" disabled={registrationRequested} />
                        </label>
                    </div>

                    <label className="block space-y-2 text-sm font-medium text-stone-800">
                        <span>{t("fields.dateOfBirth")}</span>
                        <Input name="dateOfBirth" type="date" autoComplete="bday" disabled={registrationRequested} />
                    </label>

                    <p className="text-sm text-stone-600">{t("register.contactHint")}</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block space-y-2 text-sm font-medium text-stone-800">
                            <span>{t("fields.phone")}</span>
                            <Input name="phone" type="tel" maxLength={32} autoComplete="tel" placeholder="+380... / 0..." disabled={registrationRequested} />
                        </label>
                        <label className="block space-y-2 text-sm font-medium text-stone-800">
                            <span>{t("fields.email")}</span>
                            <Input name="email" type="email" maxLength={254} autoComplete="email" disabled={registrationRequested} />
                        </label>
                    </div>
                    {registrationRequested ? (
                        <label className="block space-y-2 text-sm font-medium text-stone-800">
                            <span>{t("fields.registrationCode")}</span>
                            <Input required name="code" type="text" inputMode="numeric" maxLength={16} autoComplete="one-time-code" />
                        </label>
                    ) : null}
                </>
            )}

            {mode !== "recovery" ? (
                <label className="block space-y-2 text-sm font-medium text-stone-800">
                    <span>{t("fields.password")}</span>
                    <Input
                        required
                        name="password"
                        type="password"
                        value={password}
                        minLength={mode === "register" ? 12 : undefined}
                        maxLength={128}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                        disabled={mode === "register" && registrationRequested}
                    />
                </label>
            ) : null}

            {mode === "register" && !registrationRequested ? <PasswordChecklist passwordChecks={passwordChecks} t={t} /> : null}

            {error ? <Alert tone="error">{error}</Alert> : null}

            <Button
                type="submit"
                disabled={submitting}
                fullWidth
                size="lg"
            >
                {submitting ? t("submitting") : mode === "recovery" && recoveryRequested ? t("recovery.confirmSubmit") : mode === "register" && registrationRequested ? t("register.confirmSubmit") : t(`${mode}.submit`)}
            </Button>

            {mode === "login" ? (
                <div className="space-y-2 text-center text-sm text-stone-600">
                    <p>
                        {t("login.alternative")}{" "}
                        <Button variant="link" type="button" onClick={() => selectMode("register")}>
                            {t("login.alternativeLink")}
                        </Button>
                    </p>
                    <Button variant="link" type="button" onClick={() => selectMode("recovery")}>
                        {t("login.forgotPassword")}
                    </Button>
                </div>
            ) : (
                <p className="text-center text-sm text-stone-600">
                    {t(`${mode}.alternative`)}{" "}
                    <Button
                        variant="link"
                        type="button"
                        onClick={() => selectMode("login")}
                    >
                        {t(`${mode}.alternativeLink`)}
                    </Button>
                </p>
            )}
        </form>
    );
}

function PasswordChecklist({passwordChecks, t}: {passwordChecks: Record<string, boolean>; t: ReturnType<typeof useTranslations<"auth">>}) {
    return (
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
    );
}

function recoveryPayload(contact: string) {
    return contact.includes("@") ? {email: contact} : {phone: contact};
}

function normalizeCode(value: FormDataEntryValue | null) {
    return String(value ?? "").replace(/\D/g, "");
}
