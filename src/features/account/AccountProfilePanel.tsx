"use client";

import {useRouter} from "next/navigation";
import {useTranslations} from "next-intl";
import {useEffect, useRef, useState} from "react";
import {useToast} from "@/components/ui/toast/ToastProvider";
import AccountProfileForm from "@/features/account/AccountProfileForm";
import {API_URL} from "@/shared/constants/env";
import {
    AuthRequestError,
    type AuthenticatedUser,
    uploadAvatar
} from "@/features/auth/auth.client";

type Props = {
    contactValue: string;
    dateOfBirth: string;
    displayName: string;
    user: AuthenticatedUser;
};

export default function AccountProfilePanel({contactValue, dateOfBirth, displayName, user}: Props) {
    const t = useTranslations("accountPage.profilePanel");
    const router = useRouter();
    const toast = useToast();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [editing, setEditing] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(user.avatarMediaUrl);
    const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
    const [pendingAvatarPreview, setPendingAvatarPreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        return () => {
            if (pendingAvatarPreview) {
                URL.revokeObjectURL(pendingAvatarPreview);
            }
        };
    }, [pendingAvatarPreview]);

    function onFileChange(file: File | undefined) {
        if (!file) return;

        if (pendingAvatarPreview) {
            URL.revokeObjectURL(pendingAvatarPreview);
        }

        setPendingAvatarFile(file);
        setPendingAvatarPreview(URL.createObjectURL(file));
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    async function saveAvatar() {
        if (!pendingAvatarFile) return;

        setIsUploading(true);
        try {
            const updated = await uploadAvatar(pendingAvatarFile);
            setAvatarUrl(updated.avatarMediaUrl);
            setPendingAvatarFile(null);
            if (pendingAvatarPreview) {
                URL.revokeObjectURL(pendingAvatarPreview);
                setPendingAvatarPreview(null);
            }
            toast.success(t("avatarSaved"));
            router.refresh();
        } catch (error) {
            const message = error instanceof AuthRequestError && error.serverMessage
                ? error.serverMessage
                : t("avatarError");
            toast.error(message);
        } finally {
            setIsUploading(false);
        }
    }

    function cancelAvatarPreview() {
        if (pendingAvatarPreview) {
            URL.revokeObjectURL(pendingAvatarPreview);
        }
        setPendingAvatarFile(null);
        setPendingAvatarPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    return (
        <section className="rounded-xl border border-stone-200 bg-stone-50 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <ProfileAvatar name={displayName} url={pendingAvatarPreview ?? avatarUrl} />
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-stone-500">{t("title")}</p>
                        <p className="mt-2 break-words text-xl font-semibold text-stone-950">{displayName}</p>
                        <p className="mt-1 break-words text-sm text-stone-600">{contactValue}</p>
                        <p className="mt-1 break-words text-xs text-stone-500">{t("birthDate", {date: dateOfBirth})}</p>
                    </div>
                </div>
                <button
                    className="w-fit rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-100"
                    onClick={() => setEditing((current) => !current)}
                    type="button"
                >
                    {editing ? t("closeEdit") : t("edit")}
                </button>
            </div>

            {editing ? (
                <div className="mt-4 space-y-4">
                    <div className="rounded-xl border border-stone-200 bg-white p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-stone-950">{t("avatarTitle")}</h3>
                                <p className="mt-1 text-xs leading-5 text-stone-500">{t("avatarHint")}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <input
                                    accept="image/jpeg,image/png,image/webp"
                                    className="sr-only"
                                    onChange={(event) => onFileChange(event.target.files?.[0])}
                                    ref={fileInputRef}
                                    type="file"
                                />
                                <button
                                    className="w-fit rounded-lg bg-stone-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300"
                                    disabled={isUploading}
                                    onClick={() => fileInputRef.current?.click()}
                                    type="button"
                                >
                                    {pendingAvatarFile ? t("chooseAnotherAvatar") : t("upload")}
                                </button>
                                {pendingAvatarFile ? (
                                    <>
                                        <button
                                            className="w-fit rounded-lg bg-stone-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300"
                                            disabled={isUploading}
                                            onClick={() => void saveAvatar()}
                                            type="button"
                                        >
                                            {isUploading ? t("uploading") : t("saveAvatar")}
                                        </button>
                                        <button
                                            className="w-fit rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-400"
                                            disabled={isUploading}
                                            onClick={cancelAvatarPreview}
                                            type="button"
                                        >
                                            {t("cancelAvatar")}
                                        </button>
                                    </>
                                ) : null}
                            </div>
                        </div>
                    </div>
                    <AccountProfileForm user={user} />
                </div>
            ) : null}
        </section>
    );
}

function ProfileAvatar({name, url}: {name: string; url: string | null}) {
    const initials = name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "A";
    const className = "grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-stone-200 bg-stone-100 text-lg font-semibold text-stone-600";
    if (!url) return <span className={className}>{initials}</span>;
    return <span aria-hidden className={className} style={{backgroundImage: `url(${resolveApiMediaUrl(url)})`, backgroundPosition: "center", backgroundSize: "cover"}} />;
}

function resolveApiMediaUrl(path: string) {
    return path.startsWith("/api/") ? `${API_URL}${path}` : path;
}
