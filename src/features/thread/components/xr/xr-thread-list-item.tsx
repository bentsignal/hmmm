import { useState } from "react";
import { XR_COLORS, XR_STYLES } from "@/styles/xr-styles";
import { Container, Text } from "@react-three/uikit";
import { Brain, ExternalLink } from "@react-three/uikit-lucide";
import useThreadStore from "../../store";
import { Thread } from "../../types";

export default function XRThreadListItem({ thread }: { thread: Thread }) {
  const setActiveThread = useThreadStore((state) => state.setActiveThread);
  const addXrThread = useThreadStore((state) => state.addXrThread);
  const setMainThread = useThreadStore((state) => state.setMainThread);
  const [isHovered, setIsHovered] = useState(false);
  return (
    <Container
      onHoverChange={(hovered) => {
        setIsHovered(hovered);
      }}
    >
      <Container
        flexGrow={1}
        flexShrink={0}
        alignItems="center"
        justifyContent="flex-start"
        gap={XR_STYLES.spacingMd}
        paddingY={XR_STYLES.spacingMd}
        paddingLeft={XR_STYLES.spacingMd}
        borderLeftRadius={XR_STYLES.radiusMd}
        backgroundColor={isHovered ? XR_COLORS.accent : XR_COLORS.card}
        onClick={() => {
          setActiveThread(thread.id);
          setMainThread(thread);
        }}
      >
        {(thread.status === "streaming" || thread.status === "waiting") && (
          <Brain
            width={XR_STYLES.textMd}
            height={XR_STYLES.textMd}
            color={XR_COLORS.foreground}
          />
        )}
        <Text color={XR_COLORS.foreground}>
          {thread.title === "New Chat" ? "" : thread.title}
        </Text>
      </Container>
      <Container
        backgroundColor={isHovered ? XR_COLORS.accent : XR_COLORS.card}
        paddingY={XR_STYLES.spacingMd}
        paddingRight={XR_STYLES.spacingMd}
        borderRightRadius={XR_STYLES.radiusMd}
        onClick={() => {
          setActiveThread(thread.id);
          addXrThread(thread);
        }}
        display={isHovered ? "flex" : "none"}
      >
        <ExternalLink
          width={XR_STYLES.textLg}
          height={XR_STYLES.textLg}
          color={XR_COLORS.foreground}
        />
      </Container>
    </Container>
  );
}
