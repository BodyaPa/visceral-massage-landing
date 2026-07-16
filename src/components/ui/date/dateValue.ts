export function parseDate(value?: string) {
    if (!value) return undefined;
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
}

export function formatDate(value?: Date) {
    if (!value) return "";
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
