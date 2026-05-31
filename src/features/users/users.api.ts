import {createApi} from "@reduxjs/toolkit/query/react";
import {baseQuery} from "@/shared/api/baseQuery";
import type {UserRole} from "@/features/auth/auth.roles";
import type {AdminUser, UserPageResponse} from "@/types/users";

type ListUsersArgs = {
    query?: string;
    role?: UserRole | "";
    enabled?: boolean | "";
    page?: number;
    size?: number;
};

function listUsersPath({query, role, enabled, page = 0, size = 50}: ListUsersArgs) {
    const params = new URLSearchParams({
        page: String(page),
        size: String(size),
        sort: "createdAt,desc"
    });

    if (query?.trim()) params.set("query", query.trim());
    if (role) params.set("role", role);
    if (enabled !== "" && enabled !== undefined) params.set("enabled", String(enabled));

    return `/admin/users?${params.toString()}`;
}

export const usersApi = createApi({
    reducerPath: "usersApi",
    baseQuery,
    tagTypes: ["Users"],
    endpoints: (build) => ({
        listUsers: build.query<UserPageResponse, ListUsersArgs>({
            query: listUsersPath,
            providesTags: (result) =>
                result
                    ? [
                        ...result.content.map((user) => ({type: "Users" as const, id: user.id})),
                        {type: "Users" as const, id: "LIST"}
                    ]
                    : [{type: "Users" as const, id: "LIST"}]
        }),
        updateUserRoles: build.mutation<AdminUser, {id: number; roles: UserRole[]}>({
            query: ({id, roles}) => ({
                url: `/admin/users/${id}/roles`,
                method: "PATCH",
                body: {roles}
            }),
            invalidatesTags: (result, error, {id}) => [
                {type: "Users", id},
                {type: "Users", id: "LIST"}
            ]
        })
    })
});

export const {
    useListUsersQuery,
    useUpdateUserRolesMutation
} = usersApi;
