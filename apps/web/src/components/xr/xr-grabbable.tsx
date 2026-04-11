import { Handle, HandleTarget } from "@react-three/handle";
import { Root } from "@react-three/uikit";

import { xrStyles } from "~/styles";

export default function XRGrabbable({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <HandleTarget>
      <Handle>
        <Root flexDirection="column" pixelSize={0.001} gap={xrStyles.spacingMd}>
          {children}
        </Root>
      </Handle>
    </HandleTarget>
  );
}
