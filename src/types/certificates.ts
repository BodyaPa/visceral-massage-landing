export type CertificateStatus = "PAYMENT_PENDING" | "ACTIVE" | "EXPIRED" | "REFUNDED" | "CANCELLED";
export interface Certificate {
    id:number; publicId:string; status:CertificateStatus; titleUa:string; titleEn:string; currency:string;
    nominalMinor:number; availableMinor:number; reservedMinor:number; refundedMinor:number;
    activatedAt:string|null; expiresAt:string|null; giftCode:string|null; paymentId:string|null;
}
