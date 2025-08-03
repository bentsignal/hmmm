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
}

const Newsletter = ({ title, stories }: NewsletterProps) => {
  return (
    <Html>
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
        }}
      >
        <Head />
        <Body className="flex flex-col mx-auto max-w-xl px-4 pt-2 pb-8">
          <Text className="text-2xl font-bold">{title}</Text>
          {stories.map((story) => {
            const prompt = encodeURIComponent(story.prompt);
            return (
              <Section key={story.prompt}>
                <Text className="text-lg font-bold">{story.prompt}</Text>
                <Text className="text-sm">{story.response}</Text>
                <Section className="flex justify-center items-center">
                  <Link
                    href={`https://qbe.sh/new?q=${prompt}`}
                    className="text-sm font-bold no-underline w-full text-center"
                  >
                    Read More
                  </Link>
                </Section>
                <Hr className="mt-6 mb-2" />
              </Section>
            );
          })}
          <Section className="text-center mt-4">
            <Section className="mb-4">
              <Button
                href="https://qbe.sh/settings/general"
                className="bg-blue-200 text-black rounded-lg py-2 px-4 
                          text-sm font-bold no-underline"
              >
                Update your preferences
              </Button>
            </Section>
            <Section>
              <Link
                href="https://qbe.sh/mail/unsubscribe"
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
}: NewsletterProps) {
  return pretty(await render(<Newsletter title={title} stories={stories} />));
}
