export function FullScreenOverlay({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-slate-900">{children}</div>;
}
