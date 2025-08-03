import { hexColors } from "@/styles";
import { Button, ButtonProps } from "@react-email/components";

export default function MailButton({
  href,
  children,
  ...props
}: {
  children: React.ReactNode;
  href: string;
  props?: ButtonProps;
}) {
  return (
    <Button
      style={{
        backgroundColor: hexColors.primary,
        color: hexColors.primaryForeground,
        borderRadius: "12px",
        padding: "12px 24px",
        fontSize: "16px",
        fontWeight: "bold",
        textDecoration: "none",
      }}
      href={href}
      {...props}
    >
      {children}
    </Button>
  );
}
