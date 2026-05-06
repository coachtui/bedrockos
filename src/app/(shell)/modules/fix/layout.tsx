export default function FixLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-[calc(100vh-var(--shell-topbar-height,56px))] overflow-hidden">
      {children}
    </div>
  );
}
