import { XR_COLORS, XR_STYLES } from "@/styles/xr-styles";
import { Container } from "@react-three/uikit";

export default function XRHandle({
  show,
  width = 150,
}: {
  show: boolean;
  width?: number;
}) {
  return (
    <Container
      display="flex"
      justifyContent="center"
      alignItems="center"
      marginBottom={XR_STYLES.spacing3xl}
    >
      <Container
        backgroundColor={XR_COLORS.foreground}
        width={width}
        height={XR_STYLES.sizeSm}
        borderRadius={XR_STYLES.radiusSm}
        backgroundOpacity={show ? 1 : 0}
      />
    </Container>
  );
}
