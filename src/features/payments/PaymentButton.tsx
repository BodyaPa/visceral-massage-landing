"use client";

import {useCreateCheckoutMutation} from "./payments.api";
import type {PaymentCheckout} from "@/types/payments";

type Props = {
    paymentId: string;
    children: React.ReactNode;
    className?: string;
};

export function PaymentButton({paymentId, children, className}: Props) {
    const [createCheckout, {isLoading}] = useCreateCheckoutMutation();

    async function openCheckout() {
        const checkout = await createCheckout(paymentId).unwrap();
        submitWayForPayCheckout(checkout);
    }

    return <button className={className} disabled={isLoading} onClick={() => void openCheckout()} type="button">
        {children}
    </button>;
}

export function submitWayForPayCheckout(checkout: PaymentCheckout) {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = checkout.checkoutUrl;
        form.target = "_blank";
        form.rel = "noopener";
        for (const [name, rawValue] of Object.entries(checkout.checkoutFields)) {
            const values = Array.isArray(rawValue) ? rawValue : [rawValue];
            for (const value of values) {
                const input = document.createElement("input");
                input.type = "hidden";
                input.name = Array.isArray(rawValue) ? `${name}[]` : name;
                input.value = String(value);
                form.appendChild(input);
            }
        }
        document.body.appendChild(form);
        form.submit();
        form.remove();
}
