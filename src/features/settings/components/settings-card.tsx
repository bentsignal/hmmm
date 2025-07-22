import { Card, CardContent } from "@/components/ui/card";

export default function SettingsCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <Card className="w-full">
      <CardContent className="flex flex-col gap-4">
        <span className="text-md font-bold">{title}</span>
        {children}
      </CardContent>
    </Card>
  );
}
