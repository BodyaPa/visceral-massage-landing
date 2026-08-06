import {describe, expect, it} from "vitest";
import {selectionFromCurrent, type LegalVersion} from "./legal.api";

const version = (documentType: LegalVersion["documentType"], id: number): LegalVersion => ({
    id,
    documentType,
    versionNumber: 1,
    status: "PUBLISHED",
    titleUa: documentType,
    titleEn: documentType,
    contentUa: "UA",
    contentEn: "EN",
    createdAt: "2026-07-26T00:00:00Z",
    publishedAt: "2026-07-26T00:00:00Z"
});

describe("selectionFromCurrent", () => {
    it("returns exact IDs only when all required versions are published", () => {
        expect(selectionFromCurrent([
            version("BOOKING_TERMS", 11),
            version("CANCELLATION_REFUND", 12),
            version("PRIVACY_POLICY", 13)
        ])).toEqual({
            bookingTermsVersionId: 11,
            cancellationRefundVersionId: 12,
            privacyPolicyVersionId: 13
        });
        expect(selectionFromCurrent([version("BOOKING_TERMS", 11)])).toBeNull();
    });
});
