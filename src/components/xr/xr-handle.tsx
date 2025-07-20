import { xrColors, xrStyles } from "@/styles/xr-styles";
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
      marginBottom={xrStyles.spacing3xl}
    >
      <Container
        backgroundColor={xrColors.foreground}
        width={width}
        height={xrStyles.sizeSm}
        borderRadius={xrStyles.radiusSm}
        backgroundOpacity={show ? 1 : 0}
      />
    </Container>
  );
}
