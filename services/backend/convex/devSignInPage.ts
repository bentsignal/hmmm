import { httpAction } from "./_generated/server";
import { devToolsEnabled } from "./devSignIn";
import { requireEnvironment } from "./lib";

// Dev PDS only: `<site>/dev/sign-in?username=ios` is the dev sign-in link
// (`vera-dev:///dev-sign-in?username=…`, see `devSignIn`) as an https URL.
// Safari opens the custom scheme when it's pasted in, but other browsers
// search for it instead; any browser opens this page, which opens Vera Dev.

const USERNAME_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;

function page(title: string, body: string, status = 200) {
  return new Response(
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title}</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 17px/1.4 -apple-system, system-ui, sans-serif; margin: 0;
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    text-align: center; background: Canvas; color: CanvasText; }
  main { max-width: 340px; padding: 32px; }
  h1 { font-size: 28px; margin: 0 0 8px; }
  p { color: GrayText; margin: 0 0 24px; word-break: break-all; }
  a.button { display: block; padding: 14px; border-radius: 999px;
    background: #007aff; color: #fff; font-weight: 600; text-decoration: none; }
</style>
</head>
<body><main>${body}</main></body>
</html>`,
    {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/html; charset=utf-8",
      },
      status,
    },
  );
}

export const devSignInPage = httpAction((_ctx, request) => {
  const username = new URL(request.url).searchParams.get("username") ?? "";
  if (!devToolsEnabled() || !USERNAME_PATTERN.test(username)) {
    return Promise.resolve(page("Not Found", "<h1>Not Found</h1>", 404));
  }
  const address = `${username}@${requireEnvironment("FEDERATION_DOMAIN")}`;
  const open = `vera-dev:///dev-sign-in?username=${username}`;
  return Promise.resolve(
    page(
      `Sign in as ${address}`,
      `<h1>Sign in to Vera Dev</h1>
<p>${address}</p>
<a class="button" href="${open}">Open in Vera Dev</a>
<script>location.href = ${JSON.stringify(open)};</script>`,
    ),
  );
});
