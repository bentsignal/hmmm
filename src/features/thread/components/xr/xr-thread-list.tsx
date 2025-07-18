import { XR_COLORS, XR_STYLES } from "@/styles/xr-styles";
import { Container, Text } from "@react-three/uikit";
import { Button } from "@react-three/uikit-default";
import { SquarePen } from "@react-three/uikit-lucide";
import { ThreadListItem } from ".";
import useThreadList from "../../hooks/use-thread-list";
import useThreadStore from "../../store/thread-store";
import {
  CustomContainer,
  Grabbable,
  TextElement,
  XRHandle,
} from "@/components/xr";

const NewThreadButton = () => {
  const setActiveThread = useThreadStore((state) => state.setActiveThread);
  return (
    <Button
      padding={XR_STYLES.spacingMd}
      borderRadius={XR_STYLES.radiusLg}
      flexDirection="row"
      alignItems="center"
      gap={XR_STYLES.spacingMd}
      onClick={() => setActiveThread(null)}
    >
      <SquarePen
        width={XR_STYLES.textMd}
        height={XR_STYLES.textMd}
        color={XR_COLORS.card}
      />
      <Text color={XR_COLORS.card}>New Thread</Text>
    </Button>
  );
};

export default function XRThreadList() {
  const { threads, threadGroups, status, loadMoreThreads } = useThreadList();
  const setActiveThread = useThreadStore((state) => state.setActiveThread);

  return (
    <group rotation={[0, 0.4, 0]} position={[-0.4, 0.28, 0.08]}>
      <Grabbable>
        <CustomContainer header={<NewThreadButton />}>
          {threads.length === 0 && status !== "LoadingFirstPage" && (
            <Container flexShrink={0}>
              <Text color={XR_COLORS.foreground}>No threads found</Text>
            </Container>
          )}
          {threadGroups.map(
            (group) =>
              group.threads.length > 0 && (
                <Container
                  key={group.label}
                  marginBottom={XR_STYLES.spacingLg}
                  flexDirection="column"
                  flexShrink={0}
                  gap={XR_STYLES.spacingSm}
                >
                  <Text
                    color={XR_COLORS.foreground}
                    fontWeight="bold"
                    fontSize={XR_STYLES.textMd - 2}
                    paddingX={XR_STYLES.spacingMd}
                    marginBottom={XR_STYLES.spacingSm}
                  >
                    {group.label}
                  </Text>
                  {group.threads.map((item) => (
                    <ThreadListItem
                      key={item.id}
                      title={item.title}
                      id={item.id}
                      status={item.state}
                      active={false}
                      pinned={item.pinned ?? false}
                      onClick={() => setActiveThread(item.id)}
                    />
                  ))}
                </Container>
              ),
          )}
          {status !== "Exhausted" && status !== "LoadingFirstPage" && (
            <Button onClick={loadMoreThreads} borderRadius={XR_STYLES.radiusLg}>
              <TextElement color={XR_COLORS.card} textAlign="center">
                Load More
              </TextElement>
            </Button>
          )}
        </CustomContainer>
        <XRHandle show={true} />
      </Grabbable>
    </group>
  );
}
