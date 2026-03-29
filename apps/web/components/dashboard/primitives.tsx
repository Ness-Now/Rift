import type { ComponentPropsWithoutRef, ReactNode } from "react";

export function DashboardPanel({
  children,
  className = "",
  ...props
}: {
  children: ReactNode;
} & ComponentPropsWithoutRef<"section">) {
  return (
    <section className={`dashboard-panel overflow-hidden rounded-[2rem] ${className}`} {...props}>
      {children}
    </section>
  );
}

export function SectionEyebrow({
  children,
  tone = "accent"
}: {
  children: ReactNode;
  tone?: "accent" | "gold" | "steel";
}) {
  const toneClass =
    tone === "gold"
      ? "text-gold"
      : tone === "steel"
        ? "text-steel"
        : "text-glow";
  return (
    <p className={`dashboard-tactical-label ${toneClass}`}>
      {children}
    </p>
  );
}

export function SectionHeading({
  title,
  description,
  action
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-frost sm:text-[2rem]">{title}</h2>
        {description ? <p className="max-w-2xl text-sm leading-7 text-frost/60">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  detail,
  accent = "glow"
}: {
  label: string;
  value: string;
  detail?: string;
  accent?: "glow" | "gold" | "ember";
}) {
  const accentBg =
    accent === "gold"
      ? "bg-gold/18"
      : accent === "ember"
        ? "bg-ember/18"
        : "bg-glow/18";
  const accentText = accent === "gold" ? "text-gold" : accent === "ember" ? "text-ember" : "text-glow";
  const accentRing = accent === "gold" ? "border-gold/18" : accent === "ember" ? "border-ember/18" : "border-glow/18";

  return (
    <div className={`dashboard-panel rounded-[1.75rem] border ${accentRing} p-0`}>
      <div className="relative overflow-hidden px-5 py-5">
        <div className={`absolute -right-10 top-0 h-28 w-28 rounded-full blur-3xl ${accentBg}`} />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <span className={`dashboard-tactical-label ${accentText}`}>{label}</span>
            <span className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-frost/30">Live signal</span>
          </div>
          <p className="mt-5 font-display text-4xl font-semibold tracking-tight text-frost">{value}</p>
          {detail ? <p className="mt-2 text-sm leading-6 text-frost/58">{detail}</p> : null}
        </div>
      </div>
      <div className="relative flex items-center justify-between border-t border-white/8 px-5 py-3 text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-frost/38">
        <span>Overview desk</span>
        <span className={accentText}>Primary metric</span>
      </div>
    </div>
  );
}

export function InsightList({
  title,
  items,
  accent = "glow",
  emptyLabel = "No signals available yet."
}: {
  title: string;
  items: Array<{ title: string; body: string }>;
  accent?: "glow" | "gold" | "ember";
  emptyLabel?: string;
}) {
  const accentClass = accent === "gold" ? "bg-gold" : accent === "ember" ? "bg-ember" : "bg-glow";
  const accentText = accent === "gold" ? "text-gold" : accent === "ember" ? "text-ember" : "text-glow";

  return (
    <DashboardPanel className="p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${accentClass}`} />
          <h3 className="font-display text-xl font-semibold tracking-tight text-frost">{title}</h3>
        </div>
        <span className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-frost/34">Top signals</span>
      </div>
      <div className="mt-5 space-y-4">
        {items.length === 0 ? (
          <p className="text-sm leading-7 text-frost/54">{emptyLabel}</p>
        ) : (
          items.map((item, index) => (
            <article key={`${title}-${item.title}`} className="relative rounded-[1.35rem] border border-white/7 bg-white/[0.028] px-4 py-4 pl-5">
              <span className={`absolute inset-y-3 left-0 w-px rounded-full ${accentClass}`} />
              <div className="flex gap-4">
                <span className={`font-display text-2xl font-semibold tracking-tight ${accentText}`}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-sm font-semibold text-frost">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-frost/62">{item.body}</p>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </DashboardPanel>
  );
}

export function PillarTile({
  title,
  description,
  badge,
  href
}: {
  title: string;
  description: string;
  badge: string;
  href: string;
}) {
  return (
    <a
      className="dashboard-panel group block rounded-[1.8rem] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-glow/28 hover:bg-white/[0.05]"
      href={href}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="dashboard-tactical-label text-frost/30">Desk pillar</span>
        <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-glow">
          {badge}
        </span>
      </div>
      <p className="mt-5 font-display text-xl font-semibold tracking-tight text-frost transition group-hover:text-white">{title}</p>
      <p className="mt-3 text-sm leading-7 text-frost/58">{description}</p>
      <div className="mt-6 flex items-center justify-between border-t border-white/8 pt-4 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-frost/38">
        <span>Open surface</span>
        <span className="text-sm text-frost/72 transition group-hover:text-glow">-&gt;</span>
      </div>
    </a>
  );
}

export function MetricRail({
  items,
  columns = 4,
  accent = "glow"
}: {
  items: Array<{ label: string; value: string; detail?: string }>;
  columns?: 2 | 3 | 4;
  accent?: "glow" | "gold" | "ember";
}) {
  const columnsClass = columns === 2 ? "md:grid-cols-2" : columns === 3 ? "md:grid-cols-3" : "md:grid-cols-4";
  const accentClass = accent === "gold" ? "text-gold" : accent === "ember" ? "text-ember" : "text-glow";

  return (
    <div className={`grid gap-4 ${columnsClass}`}>
      {items.map((item) => (
        <div key={item.label} className="rounded-[1.35rem] border border-white/8 bg-white/[0.028] px-4 py-4">
          <p className="dashboard-tactical-label text-frost/32">{item.label}</p>
          <p className={`mt-3 font-display text-2xl font-semibold tracking-tight ${accentClass}`}>{item.value}</p>
          {item.detail ? <p className="mt-2 text-sm leading-6 text-frost/56">{item.detail}</p> : null}
        </div>
      ))}
    </div>
  );
}

export function DataTable({
  title,
  columns,
  rows,
  emptyLabel = "No data available yet."
}: {
  title: string;
  columns: string[];
  rows: string[][];
  emptyLabel?: string;
}) {
  return (
    <DashboardPanel className="p-0">
      <div className="border-b border-white/8 px-5 py-4">
        <p className="font-display text-lg font-semibold tracking-tight text-frost">{title}</p>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-5 text-sm leading-7 text-frost/54">{emptyLabel}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-white/8 text-left">
                {columns.map((column) => (
                  <th key={column} className="px-5 py-3 text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-frost/34">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`${title}-${rowIndex}`} className="border-b border-white/6 last:border-b-0">
                  {row.map((cell, cellIndex) => (
                    <td key={`${title}-${rowIndex}-${cellIndex}`} className="px-5 py-4 text-sm text-frost/72">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardPanel>
  );
}

export function StatusChip({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: "neutral" | "positive" | "warning";
}) {
  const toneClass =
    tone === "positive"
      ? "border-glow/22 bg-glow/10 text-glow"
      : tone === "warning"
        ? "border-gold/22 bg-gold/10 text-gold"
        : "border-white/10 bg-white/[0.04] text-frost/72";
  const dotClass = tone === "positive" ? "bg-glow" : tone === "warning" ? "bg-gold" : "bg-frost/42";

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] ${toneClass}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      {label}
    </span>
  );
}
