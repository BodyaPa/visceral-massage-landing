import type {UserRole} from "@/features/auth/auth.roles";
import type {PageResponse} from "@/types/news";

export interface AdminUser {
    id: number;
    phone: string | null;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    dateOfBirth: string | null;
    enabled: boolean;
    roles: UserRole[];
    createdAt: string;
    updatedAt: string;
}

export type UserPageResponse = PageResponse<AdminUser>;
