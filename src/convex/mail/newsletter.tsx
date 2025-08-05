import {
  Body,
  Button,
  Head,
  Hr,
  Html,
  Link,
  pixelBasedPreset,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { pretty, render } from "@react-email/render";

interface NewsletterProps {
  title: string;
  stories: {
    prompt: string;
    response: string;
  }[];
  userId: string;
}

const Newsletter = ({ title, stories, userId }: NewsletterProps) => {
  return (
    <Html>
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
        }}
      >
        <Head />
        <Body className="mx-auto flex max-w-xl flex-col px-4 pt-2 pb-8">
          <Text className="text-2xl font-bold">{title}</Text>
          {stories.map((story) => {
            const prompt = encodeURIComponent(story.prompt);
            return (
              <Section key={story.prompt}>
                <Text className="text-lg font-bold">{story.prompt}</Text>
                <Text className="text-sm">{story.response}</Text>
                <Section className="flex items-center justify-center">
                  <Link
                    href={`https://qbe.sh/new?q=${prompt}`}
                    className="w-full text-center text-sm font-bold no-underline"
                  >
                    Read More
                  </Link>
                </Section>
                <Hr className="mt-6 mb-2" />
              </Section>
            );
          })}
          <Section className="mt-4 text-center">
            <Section className="mb-4">
              <Button
                href="https://qbe.sh/settings/general"
                className="rounded-lg bg-blue-200 px-4 py-2 text-sm 
                          font-bold text-black no-underline"
              >
                Update your preferences
              </Button>
            </Section>
            <Section>
              <Link
                href={`https://qbe.sh/mail?userId=${userId}&status=false`}
                className="text-sm text-red-500 no-underline"
              >
                Unsubscribe
              </Link>
            </Section>
          </Section>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default async function getNewsletterHtml({
  title,
  stories,
  userId,
}: NewsletterProps) {
  return pretty(
    await render(
      <Newsletter title={title} stories={stories} userId={userId} />,
    ),
  );
}
