import { XR_COLORS } from "@/styles/xr-styles";
import { Container } from "@react-three/uikit";
import type { Schema } from "hast-util-sanitize";
import ReactMarkdown, { Components } from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { Heading, TextElement } from "@/components/xr";

export default function XRMarkdown({ content }: { content: string }) {
  return (
    <Container flexDirection="column" flexShrink={0} width="100%" gap={20}>
      <ReactMarkdown
        rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </Container>
  );
}

const sanitizeSchema: Schema = {
  tagNames: [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "ul",
    "ol",
    "li",
    "strong",
    "code",
    "table",
  ],
};

const List = ({ children }: { children: React.ReactNode }) => (
  <Container
    flexDirection="column"
    flexShrink={0}
    width="100%"
    gap={10}
    paddingLeft={20}
  >
    {children}
  </Container>
);

const markdownComponents: Partial<Components> = {
  p: ({ children }) => <TextElement>{children}</TextElement>,
  ul: ({ children }) => <List>{children}</List>,
  ol: ({ children }) => <List>{children}</List>,
  li: ({ children }) => <TextElement>- {children}</TextElement>,
  strong: ({ children }) => (
    <TextElement fontWeight="bold">{children}</TextElement>
  ),
  h1: ({ children }) => <Heading size={24}>{children}</Heading>,
  h2: ({ children }) => <Heading size={20}>{children}</Heading>,
  h3: ({ children }) => <Heading size={16}>{children}</Heading>,
  h4: ({ children }) => <Heading size={14}>{children}</Heading>,
  h5: ({ children }) => <Heading size={12}>{children}</Heading>,
  h6: ({ children }) => <Heading size={10}>{children}</Heading>,
  code: () => (
    <TextElement color={XR_COLORS.destructive}>
      Currently unable to render code. Please view in the browser.
    </TextElement>
  ),
  table: () => (
    <TextElement color={XR_COLORS.destructive}>
      Currently unable to render tables. Please view in the browser.
    </TextElement>
  ),
};
