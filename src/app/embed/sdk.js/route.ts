export function GET() {
  const script = `
(function () {
  const state = { workspaceId: null, publicKey: null, baseUrl: "" };
  function buildUrl(path) {
    const base = state.baseUrl || "";
    return \`\${base}\${path}\`;
  }
  async function fetchJSON(path) {
    const url = buildUrl(path);
    const res = await fetch(url, { credentials: "omit" });
    if (!res.ok) throw new Error("Request failed");
    return res.json();
  }
  function ensureContainer(container) {
    if (typeof container === "string") return document.querySelector(container);
    return container;
  }
  window.StressSense = {
    init: function (options) {
      state.workspaceId = options.workspaceId;
      state.publicKey = options.publicKey;
      state.baseUrl = options.baseUrl || "";
    },
    renderMetricsWidget: async function (container, options) {
      const el = ensureContainer(container);
      if (!el) return;
      el.innerHTML = '<div style="padding:12px;border:1px solid #e2e8f0;border-radius:12px;font-family:Inter,system-ui,sans-serif;background:#fff;box-shadow:0 10px 30px rgba(15,23,42,0.08);">Loading stress metrics…</div>';
      try {
        const data = await fetchJSON(\`/embed/v1/metrics?workspaceId=\${state.workspaceId}&publicKey=\${state.publicKey}\`);
        if (!data?.data) {
          el.innerHTML = '<div style="padding:12px;border:1px solid #e2e8f0;border-radius:12px;font-family:Inter,system-ui,sans-serif;background:#fff;">No data yet.</div>';
          return;
        }
        const card = document.createElement("div");
        card.style.padding = "14px";
        card.style.border = "1px solid #e2e8f0";
        card.style.borderRadius = "12px";
        card.style.background = "#fff";
        card.style.boxShadow = "0 10px 30px rgba(15,23,42,0.08)";
        card.innerHTML = \`
          <div style="font-size:12px;color:#475569;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">StressSense</div>
          <div style="font-size:14px;font-weight:600;color:#0f172a;">\${data.data.surveyName || "Latest survey"}</div>
          <div style="display:flex;gap:12px;margin-top:10px;">
            <div style="flex:1;">
              <div style="font-size:12px;color:#475569;">Average stress index</div>
              <div style="font-size:20px;font-weight:700;color:#4338ca;">\${data.data.averageStressIndex ?? 0}</div>
            </div>
            <div style="flex:1;">
              <div style="font-size:12px;color:#475569;">Participation</div>
              <div style="font-size:20px;font-weight:700;color:#0f172a;">\${data.data.participation ?? 0}%</div>
            </div>
          </div>
        \`;
        el.innerHTML = "";
        el.appendChild(card);
      } catch (e) {
        el.innerHTML = '<div style="padding:12px;border:1px solid #fee2e2;border-radius:12px;background:#fff1f2;color:#b91c1c;">Unable to load metrics.</div>';
      }
    },
    renderSurveyWidget: async function (container) {
      const el = ensureContainer(container);
      if (!el) return;
      el.innerHTML = '<div style="padding:12px;border:1px solid #e2e8f0;border-radius:12px;font-family:Inter,system-ui,sans-serif;background:#fff;">Loading survey…</div>';
      try {
        const data = await fetchJSON(\`/embed/v1/surveys/active?workspaceId=\${state.workspaceId}&publicKey=\${state.publicKey}\`);
        if (!data?.data) {
          el.innerHTML = '<div style="padding:12px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;">No active survey right now.</div>';
          return;
        }
        const card = document.createElement("div");
        card.style.padding = "14px";
        card.style.border = "1px solid #e2e8f0";
        card.style.borderRadius = "12px";
        card.style.background = "#fff";
        card.style.boxShadow = "0 10px 30px rgba(15,23,42,0.08)";
        card.innerHTML = \`
          <div style="font-size:12px;color:#475569;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">StressSense</div>
          <div style="font-size:14px;font-weight:700;color:#0f172a;">\${data.data.name}</div>
          <p style="font-size:12px;color:#475569;margin:8px 0;">Share this with your team to collect responses.</p>
          <a href="\${data.data.publicUrl}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;background:#4338ca;color:white;font-weight:600;text-decoration:none;">Open survey</a>
          <p style="font-size:11px;color:#94a3b8;margin-top:8px;">\${data.data.note || ""}</p>
        \`;
        el.innerHTML = "";
        el.appendChild(card);
      } catch (e) {
        el.innerHTML = '<div style="padding:12px;border:1px solid #fee2e2;border-radius:12px;background:#fff1f2;color:#b91c1c;">Unable to load survey.</div>';
      }
    },
  };
})();
`;
  return new Response(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
