import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_chat/_authenticated")({
  component: () => <Outlet />,
  beforeLoad: ({ context, location }) => {
    const { auth } = context;
    if (!auth.isSignedIn) {
      throw redirect({
        to: "/",
        search: { signin: true, redirect_url: location.href },
      });
    }

    return { auth: auth };
  },
});
