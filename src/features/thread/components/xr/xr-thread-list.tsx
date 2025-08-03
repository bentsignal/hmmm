import { hexColors, xrStyles } from "@/styles";
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
  const setMainThread = useThreadStore((state) => state.setMainThread);
  return (
    <Button
      padding={xrStyles.spacingMd}
      borderRadius={xrStyles.radiusLg}
      flexDirection="row"
      alignItems="center"
      gap={xrStyles.spacingMd}
      onClick={() => {
        setActiveThread(null);
        setMainThread(null);
      }}
    >
      <SquarePen
        width={xrStyles.textMd}
        height={xrStyles.textMd}
        color={hexColors.card}
      />
      <Text color={hexColors.card}>New Thread</Text>
    </Button>
  );
};

export default function XRThreadList() {
  const { threads, threadGroups, status, loadMoreThreads } = useThreadList();
  return (
    <group rotation={[0, 0.4, 0]} position={[-0.4, 0.3, 0.08]}>
      <Grabbable>
        <CustomContainer header={<NewThreadButton />}>
          {threads.length === 0 && status !== "LoadingFirstPage" && (
            <Container flexShrink={0}>
              <Text color={hexColors.foreground}>No threads found</Text>
            </Container>
          )}
          {threadGroups.map(
            (group) =>
              group.threads.length > 0 && (
                <Container
                  key={group.label}
                  marginBottom={xrStyles.spacingLg}
                  flexDirection="column"
                  flexShrink={0}
                  gap={xrStyles.spacingSm}
                >
                  <Text
                    color={hexColors.foreground}
                    fontWeight="bold"
                    fontSize={xrStyles.textMd - 2}
                    paddingX={xrStyles.spacingMd}
                    marginBottom={xrStyles.spacingSm}
                  >
                    {group.label}
                  </Text>
                  {group.threads.map((item) => (
                    <ThreadListItem
                      key={item.id}
                      thread={{
                        ...item,
                        active: false,
                        pinned: item.pinned ?? false,
                        status: item.state,
                      }}
                    />
                  ))}
                </Container>
              ),
          )}
          {status !== "Exhausted" && status !== "LoadingFirstPage" && (
            <Button onClick={loadMoreThreads} borderRadius={xrStyles.radiusLg}>
              <TextElement color={hexColors.card} textAlign="center">
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
