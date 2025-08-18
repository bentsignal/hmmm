export default function NewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full flex-1 flex-col items-center justify-center">
      {children}
    </div>
  );
}
