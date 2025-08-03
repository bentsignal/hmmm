import { hexColors, mailStyles } from "@/styles";
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
        borderRadius: mailStyles.radiusLg,
        paddingLeft: mailStyles.spacingLg,
        paddingRight: mailStyles.spacingLg,
        paddingTop: mailStyles.spacingMd,
        paddingBottom: mailStyles.spacingMd,
        fontSize: mailStyles.textMd,
        fontWeight: "bold",
        textDecoration: "none",
        border: `1px solid ${hexColors.borderInput}`,
      }}
      href={href}
      {...props}
    >
      {children}
    </Button>
  );
}
