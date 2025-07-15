import { XR_COLORS } from "@/styles/xr-colors";
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
      marginBottom={40}
    >
      <Container
        backgroundColor={XR_COLORS.foreground}
        width={width}
        height={8}
        borderRadius={10}
        backgroundOpacity={show ? 1 : 0}
      />
    </Container>
  );
}
