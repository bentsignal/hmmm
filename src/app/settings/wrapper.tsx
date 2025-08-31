export default function SettingsWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex max-h-fit w-full flex-col gap-4 overflow-y-auto pr-4 pb-12">
      {children}
    </div>
  );
}
