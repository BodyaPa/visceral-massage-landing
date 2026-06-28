type CurrencyFormatOptions = {
    maximumFractionDigits?: number;
};

function currencyLocale(locale: string) {
    return locale === "ua" ? "uk-UA" : "en-US";
}

export function formatCurrencyAmount(value: number, locale: string, options: CurrencyFormatOptions = {}) {
    return new Intl.NumberFormat(currencyLocale(locale), {
        currency: "UAH",
        ...options,
        style: "currency"
    }).format(value);
}

export function formatWholeCurrencyAmount(value: number, locale: string) {
    return formatCurrencyAmount(value, locale, {maximumFractionDigits: 0});
}

export function formatPercentAmount(value: number, locale: string) {
    return new Intl.NumberFormat(currencyLocale(locale), {
        maximumFractionDigits: 2,
        style: "percent"
    }).format(value / 100);
}
