import {Suspense} from "react";
import ProviderCallbackContent from "@/features/auth/ProviderCallbackContent";

export default function ProviderCallbackPage() {
    return (
        <main className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center px-4 py-10">
            <Suspense fallback={<div className="h-32 w-full animate-pulse rounded-2xl bg-stone-100" />}>
                <ProviderCallbackContent />
            </Suspense>
        </main>
    );
}
