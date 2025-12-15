"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { getMembersByTeam, getOrganizationBySlug, getTeamsByOrg } from "@/lib/orgData";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: "HR" | "Manager" | "Employee";
  orgId: string;
  teamId?: string;
};

function pickDemoUser(role: CurrentUser["role"]): CurrentUser {
  const org = getOrganizationBySlug("nova-bank") ?? getOrganizationBySlug("default-demo");
  const teams = org ? getTeamsByOrg(org.id) : [];
  const primaryTeam = teams[0];
  const members = primaryTeam ? getMembersByTeam(primaryTeam.id) : [];

  const findByRole = (r: CurrentUser["role"]) => members.find((m) => m.role === r);
  const hr = findByRole("HR");
  const manager = findByRole("Manager");
  const employee = findByRole("Employee") ?? members[0];

  const chosen =
    role === "HR" ? hr ?? manager ?? employee : role === "Manager" ? manager ?? hr ?? employee : employee ?? hr ?? manager;

  if (chosen && org) {
    return {
      id: chosen.id,
      name: chosen.name,
      email: chosen.email,
      role: chosen.role,
      orgId: org.id,
      teamId: chosen.teamId,
    };
  }

  return {
    id: "demo-user",
    name: "Demo HR",
    email: "hr@demo.local",
    role: "HR",
    orgId: org?.id ?? "demo-org",
    teamId: primaryTeam?.id,
  };
}

export function useCurrentUser(): CurrentUser {
  const params = useSearchParams();
  const roleParam = params?.get("role");

  const role: CurrentUser["role"] =
    roleParam === "manager" ? "Manager" : roleParam === "employee" ? "Employee" : "HR";

  const user = useMemo(() => pickDemoUser(role), [role]);
  return user;
}
