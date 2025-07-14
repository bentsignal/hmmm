import { XR_COLORS } from "@/styles/xr-colors";
import { Handle, HandleTarget } from "@react-three/handle";
import { Container, Root, Text } from "@react-three/uikit";
import { ThreadListItem } from ".";
import useThreadList from "../../hooks/use-thread-list";
import useThreadStore from "../../store/thread-store";

export default function XRThreadList({
  activeThread,
}: {
  activeThread: string | null;
}) {
  const { threads, threadGroups, status } = useThreadList();
  const setActiveThread = useThreadStore((state) => state.setActiveThread);

  return (
    <group rotation={[0, 0.4, 0]} position={[-0.4, 1.3, -0.45]}>
      <HandleTarget>
        <Handle>
          <Root flexDirection="column" pixelSize={0.001} gap={10}>
            <Container
              backgroundColor={XR_COLORS.card}
              flexDirection="column"
              padding={28}
              borderRadius={20}
              castShadow
              width={370}
              height={500}
              overflow="scroll"
              gap={10}
              marginBottom={40}
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
                          active={activeThread === item.id}
                          onClick={() => setActiveThread(item.id)}
                        />
                      ))}
                    </Container>
                  ),
              )}
            </Container>
          </Root>
        </Handle>
      </HandleTarget>
    </group>
  );
}
