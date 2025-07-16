import { XR_COLORS, XR_STYLES } from "@/styles/xr-styles";
import { Handle, HandleTarget } from "@react-three/handle";
import { Container, Root, Text } from "@react-three/uikit";
import { Button } from "@react-three/uikit-default";
import { SquarePen } from "@react-three/uikit-lucide";
import { ThreadListItem } from ".";
import useThreadList from "../../hooks/use-thread-list";
import useThreadStore from "../../store/thread-store";
import XRHandle from "@/components/xr/xr-handle";

const NewThreadButton = () => {
  const setActiveThread = useThreadStore((state) => state.setActiveThread);
  return (
    <Button
      padding={10}
      borderRadius={XR_STYLES.radiusLg}
      flexDirection="row"
      alignItems="center"
      gap={10}
      onClick={() => setActiveThread(null)}
    >
      <SquarePen width={16} height={16} />
      <Text>New Thread</Text>
    </Button>
  );
};

export default function XRThreadList() {
  const { threads, threadGroups, status, loadMoreThreads } = useThreadList();
  const setActiveThread = useThreadStore((state) => state.setActiveThread);

  return (
    <group rotation={[0, 0.4, 0]} position={[-0.4, 0.28, 0.08]}>
      <HandleTarget>
        <Handle>
          <Root flexDirection="column" pixelSize={0.001} gap={10}>
            <NewThreadButton />
            <Container
              backgroundColor={XR_COLORS.card}
              flexDirection="column"
              padding={28}
              borderRadius={XR_STYLES.radiusLg}
              castShadow
              width={370}
              height={500}
              overflow="scroll"
              gap={10}
              scrollbarBorderRadius={XR_STYLES.radiusXs}
            >
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
                      marginBottom={20}
                      flexDirection="column"
                      flexShrink={0}
                      gap={5}
                    >
                      <Text
                        color={XR_COLORS.foreground}
                        fontWeight="bold"
                        fontSize={14}
                        paddingX={10}
                        marginBottom={5}
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
                          onClick={() => setActiveThread(item.id)}
                        />
                      ))}
                    </Container>
                  ),
              )}
              {status !== "Exhausted" && status !== "LoadingFirstPage" && (
                <Button onClick={loadMoreThreads}>
                  <Text>Load More</Text>
                </Button>
              )}
            </Container>
            <XRHandle show={true} />
          </Root>
        </Handle>
      </HandleTarget>
    </group>
  );
}
