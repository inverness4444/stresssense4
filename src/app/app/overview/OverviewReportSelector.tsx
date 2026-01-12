"use client";

import { useSearchParams } from "next/navigation";
import type { ChangeEvent } from "react";

type TeamOption = {
  id: string;
  name: string;
};

type OverviewReportSelectorProps = {
  teams: TeamOption[];
  labels: {
    title: string;
    all: string;
    teamPrefix: string;
  };
  showAllOption?: boolean;
};

export function OverviewReportSelector({ teams, labels, showAllOption = true }: OverviewReportSelectorProps) {
  const searchParams = useSearchParams();

  const scopeParam = searchParams?.get("scope");
  const legacyTeam = searchParams?.get("team");
  const teamParam = searchParams?.get("teamId") ?? legacyTeam;
  const selected =
    scopeParam === "team" && teamParam && teams.some((team) => team.id === teamParam)
      ? teamParam
      : teamParam && teams.some((team) => team.id === teamParam)
        ? teamParam
        : "all";
  const value = selected === "all" && !showAllOption && teams.length ? teams[0]?.id ?? "all" : selected;
  const cookieName = "ss_overview_team";
  const cookieMaxAge = 60 * 60 * 24 * 30;

  const onChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = new URLSearchParams(window.location.search);
    const nextValue = event.target.value;

    if (nextValue === "all") {
      next.delete("teamId");
      next.delete("team");
      next.set("scope", "org");
    } else {
      next.set("scope", "team");
      next.set("teamId", nextValue);
      next.delete("team");
    }

    const query = next.toString();
    const nextUrl = query ? `/app/overview?${query}` : "/app/overview";
    if (nextValue === "all") {
      document.cookie = `${cookieName}=; Path=/; Max-Age=0; SameSite=Lax`;
    } else {
      document.cookie = `${cookieName}=${encodeURIComponent(nextValue)}; Path=/; Max-Age=${cookieMaxAge}; SameSite=Lax`;
    }
    window.location.assign(nextUrl);
  };

  return (
    <div className="flex flex-col gap-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{labels.title}</p>
      <select
        value={value}
        onChange={onChange}
        className="min-w-[220px] rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-primary/40 sm:min-w-[260px]"
      >
        {showAllOption && <option value="all">{labels.all}</option>}
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {`${labels.teamPrefix}${team.name}`}
          </option>
        ))}
      </select>
    </div>
  );
}
