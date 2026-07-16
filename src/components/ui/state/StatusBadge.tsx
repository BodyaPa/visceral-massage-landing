import type {ReactNode} from "react";
type Tone = "neutral" | "success" | "warning" | "danger" | "info";
const tones: Record<Tone, string> = {neutral:"border-stone-200 bg-stone-100 text-stone-700",success:"border-emerald-200 bg-emerald-50 text-emerald-800",warning:"border-amber-200 bg-amber-50 text-amber-900",danger:"border-red-200 bg-red-50 text-red-800",info:"border-sky-200 bg-sky-50 text-sky-800"};
export default function StatusBadge({children, tone="neutral"}: {children: ReactNode; tone?: Tone}) {return <span className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;}
