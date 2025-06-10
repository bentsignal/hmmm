export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-screen flex-1 flex-col items-center justify-center gap-4">
      {children}
    </div>
  );
}
