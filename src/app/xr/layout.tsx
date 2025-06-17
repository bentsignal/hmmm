export default function XRLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-1 flex-col items-center justify-center gap-4">
      {children}
    </div>
  );
}
