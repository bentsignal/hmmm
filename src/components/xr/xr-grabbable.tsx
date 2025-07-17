import { XR_STYLES } from "@/styles/xr-styles";
import { Handle, HandleTarget } from "@react-three/handle";
import { Root } from "@react-three/uikit";

export default function XRGrabbable({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <HandleTarget>
      <Handle>
        <Root
          flexDirection="column"
          pixelSize={0.001}
          gap={XR_STYLES.spacingMd}
        >
          {children}
        </Root>
      </Handle>
    </HandleTarget>
  );
}
