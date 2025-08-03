import { mailStyles } from "@/styles";
import {
  Heading,
  Html,
  Link,
  Markdown,
  Section,
  Text,
} from "@react-email/components";
import { pretty, render } from "@react-email/render";
import { Button } from "@/components/mail";

interface NewsletterProps {
  cleanTitle: string;
  summary: string;
  suggestions: {
    id: string;
    prompt: string;
  }[];
  promptsAndResponses: {
    prompt: string;
    response: string;
  }[];
}

const Newsletter = ({
  cleanTitle,
  summary,
  suggestions,
  promptsAndResponses,
}: NewsletterProps) => {
  return (
    <Html>
      <Section
        style={{
          display: "flex",
          flexDirection: "column",
          gap: mailStyles.spacing2xl,
          maxWidth: mailStyles.containerXl,
          margin: "0 auto",
        }}
      >
        <Heading as="h2">{cleanTitle}</Heading>
        <Markdown>{summary}</Markdown>
        <Section
          style={{
            display: "flex",
            flexDirection: "column",
            gap: mailStyles.spacingMd,
          }}
        >
          {suggestions.map((suggestion, index) => {
            const prompt = suggestion.prompt.replace(/ /g, "+");
            return (
              <Section
                key={suggestion.id}
                style={{
                  border: "1px solid #e0e0e0",
                  borderRadius: mailStyles.radiusLg,
                  paddingTop: mailStyles.spacingMd,
                  paddingBottom: mailStyles.spacingMd,
                  paddingLeft: mailStyles.spacingLg,
                  paddingRight: mailStyles.spacingLg,
                  marginBottom: mailStyles.spacingMd,
                }}
              >
                <Link
                  href={`https://qbe.sh/new?q=${prompt}`}
                  key={suggestion.id}
                  style={{
                    textDecoration: "none",
                  }}
                >
                  <Heading as="h3">{suggestion.prompt}</Heading>
                  <Markdown>
                    {promptsAndResponses[index].response.slice(0, 300)}
                  </Markdown>
                  <Text>
                    {promptsAndResponses[index].response.length > 300
                      ? "..."
                      : ""}
                  </Text>
                  <Section
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      marginTop: mailStyles.spacingMd,
                    }}
                  >
                    <Button href="https://qbe.sh/settings/general">
                      Read More
                    </Button>
                  </Section>
                </Link>
              </Section>
            );
          })}
        </Section>
        <Section
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Button href="https://qbe.sh/settings/general">
            Update your preferences
          </Button>
        </Section>
      </Section>
    </Html>
  );
};

export default async function getNewsletterHtml({
  cleanTitle,
  summary,
  suggestions,
  promptsAndResponses,
}: NewsletterProps) {
  return pretty(
    await render(
      <Newsletter
        cleanTitle={cleanTitle}
        summary={summary}
        suggestions={suggestions}
        promptsAndResponses={promptsAndResponses}
      />,
    ),
  );
}
