export interface SiteSettings {
    footerBodyUa: string;
    footerBodyEn: string;
    homeIntroUa: string | null;
    homeIntroEn: string | null;
    homeBodyUa: string | null;
    homeBodyEn: string | null;
    aboutBodyUa: string | null;
    aboutBodyEn: string | null;
    contactBodyUa: string | null;
    contactBodyEn: string | null;
    updatedByUserId: number | null;
    createdAt: string | null;
    updatedAt: string | null;
}

export type SiteSettingsInput = Pick<
    SiteSettings,
    | "footerBodyUa"
    | "footerBodyEn"
    | "homeIntroUa"
    | "homeIntroEn"
    | "homeBodyUa"
    | "homeBodyEn"
    | "aboutBodyUa"
    | "aboutBodyEn"
    | "contactBodyUa"
    | "contactBodyEn"
>;
