import { useSession } from "next-auth/react";

export type CurrentUser = {
  id: string;
  email: string;
  name?: string | null;
  role: "HR" | "Manager" | "Employee";
  organizationId?: string;
};

export function useCurrentUser(): { user: CurrentUser | null; status: "loading" | "authenticated" | "unauthenticated" } {
  const { data, status } = useSession();
  const sessionUser = data?.user as any;
  if (!sessionUser) return { user: null, status };
  return {
    user: {
      id: sessionUser.id,
      email: sessionUser.email,
      name: sessionUser.name,
      role: sessionUser.role,
      organizationId: sessionUser.organizationId,
    },
    status,
  };
}
