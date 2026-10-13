import assert from "node:assert/strict";
import test from "node:test";

import { tidyReddit, tweetApiUrl, tweetId, tweetPreview } from "./sites.ts";

void test("tweetId reads x.com and twitter.com status links", () => {
  assert.equal(
    tweetId("https://x.com/NASA/status/2039473910987534599"),
    "2039473910987534599",
  );
  assert.equal(tweetId("https://twitter.com/jack/status/20?s=20&t=abc"), "20");
  assert.equal(
    tweetId("https://mobile.twitter.com/jack/status/20/photo/1"),
    "20",
  );
  assert.equal(tweetId("https://www.x.com/i/web/status/20"), "20");
  assert.equal(tweetId("https://x.com/i/status/20"), "20");
  assert.equal(tweetId("https://x.com/NASA"), undefined);
  assert.equal(tweetId("https://notx.com/a/status/20"), undefined);
  assert.equal(tweetId("not a url"), undefined);
});

void test("tweetApiUrl computes the embed token", () => {
  assert.equal(
    tweetApiUrl("20"),
    "https://cdn.syndication.twimg.com/tweet-result?id=20&lang=en&token=6dq1a2xwd93",
  );
});

const videoTweet = {
  __typename: "Tweet",
  entities: {
    media: [{ display_url: "pic.x.com/media", url: "https://t.co/media" }],
    urls: [{ display_url: "youtube.com/live/thf…", url: "https://t.co/7g" }],
  },
  id_str: "2105025233229156630",
  mediaDetails: [
    {
      media_url_https: "https://pbs.twimg.com/poster.jpg",
      original_info: { height: 1080, width: 1920 },
      type: "video",
      video_info: {
        duration_millis: 18473,
        variants: [
          {
            content_type: "application/x-mpegURL",
            url: "https://video.twimg.com/pl.m3u8",
          },
          {
            bitrate: 256000,
            content_type: "video/mp4",
            url: "https://video.twimg.com/270.mp4",
          },
          {
            bitrate: 2176000,
            content_type: "video/mp4",
            url: "https://video.twimg.com/720.mp4",
          },
          {
            bitrate: 10368000,
            content_type: "video/mp4",
            url: "https://video.twimg.com/1080.mp4",
          },
        ],
      },
    },
  ],
  text: "Rocket &amp; hangar 🚀 live: https://t.co/7g https://t.co/media",
  user: { name: "Spaceflight Now", screen_name: "SpaceflightNow" },
};

void test("tweetPreview gives a video tweet its 720p MP4 and poster", () => {
  assert.deepEqual(tweetPreview(videoTweet), {
    description: "Rocket & hangar 🚀 live: youtube.com/live/thf…",
    imageUrl: "https://pbs.twimg.com/poster.jpg",
    siteName: "X",
    title: "Spaceflight Now (@SpaceflightNow)",
    url: "https://x.com/SpaceflightNow/status/2105025233229156630",
    video: {
      durationMs: 18473,
      height: 1080,
      url: "https://video.twimg.com/720.mp4",
      width: 1920,
    },
  });
});

void test("tweetPreview shows a photo tweet's first photo, with no video", () => {
  const preview = tweetPreview({
    __typename: "Tweet",
    id_str: "1",
    mediaDetails: [
      { media_url_https: "https://pbs.twimg.com/a.jpg", type: "photo" },
      { media_url_https: "https://pbs.twimg.com/b.jpg", type: "photo" },
    ],
    text: "Two photos",
    user: { name: "A", screen_name: "a" },
  });
  assert.equal(preview?.imageUrl, "https://pbs.twimg.com/a.jpg");
  assert.equal(preview.video, undefined);
});

void test("tweetPreview has nothing for a missing tweet", () => {
  assert.equal(tweetPreview({}), null);
  assert.equal(tweetPreview({ __typename: "TweetTombstone" }), null);
});

void test("tidyReddit shows the post, from its subreddit", () => {
  assert.deepEqual(
    tidyReddit({
      description: "Explore this post and more from the soccer community",
      imageUrl: "https://share.redd.it/preview/post/1x390rl",
      siteName: "Reddit",
      title: "From the soccer community on Reddit: \u200BA staff member fell",
      url: "https://www.reddit.com/r/soccer/comments/1x390rl/a_staff/",
    }),
    {
      description: undefined,
      imageUrl: "https://share.redd.it/preview/post/1x390rl",
      siteName: "r/soccer",
      title: "A staff member fell",
      url: "https://www.reddit.com/r/soccer/comments/1x390rl/a_staff/",
    },
  );
});

void test("tidyReddit leaves other sites alone", () => {
  const preview = {
    description: "Explore this post and more from the soccer community",
    title: "From the soccer community on Reddit: x",
    url: "https://example.com/",
  };
  assert.equal(tidyReddit(preview), preview);
});
