import type {ReactNode} from "react";

type AlertTone = "error" | "warning" | "info" | "success";

const toneClasses: Record<AlertTone, string> = {
    error: "border-red-200 bg-red-50 text-red-800",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    info: "border-stone-200 bg-stone-100 text-stone-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800"
};

export default function Alert({children, tone = "info", title}: {children: ReactNode; tone?: AlertTone; title?: ReactNode}) {
    return (
        <div className={`rounded-xl border px-3 py-2.5 text-sm leading-6 ${toneClasses[tone]}`} role={tone === "error" ? "alert" : "status"}>
            {title ? <strong className="block">{title}</strong> : null}{children}
        </div>
    );
}
