export type TabKey = "workout" | "routines" | "body" | "log";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "workout", label: "Workout", icon: "🏋️" },
  { key: "routines", label: "Routines", icon: "📋" },
  { key: "body", label: "Body", icon: "🫀" },
  { key: "log", label: "Log", icon: "📅" },
];

interface Props {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}

export function TabBar({ active, onChange }: Props) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-800 bg-slate-900/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
            active === tab.key ? "text-sky-400" : "text-slate-500"
          }`}
        >
          <span className="text-xl leading-none">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
