export default function LoadingState({label}: {label: string}) {
    return (
        <div aria-live="polite" className="flex min-h-32 items-center justify-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-8 text-sm text-stone-600" role="status">
            <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900 motion-reduce:animate-none" />
            <span>{label}</span>
        </div>
    );
}
