"use client";

import * as React from "react";

class ErrorBoundaryClass extends React.Component<
  React.PropsWithChildren,
  { hasError: boolean }
> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error(error);
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full items-center justify-center">
          <div className="rounded-md bg-red-400 p-4 text-black">
            <h1 className="text-2xl font-bold">Error</h1>
            <p className="text-sm">
              An error occurred while loading the page. Please try again later.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function ErrorBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ErrorBoundaryClass>{children}</ErrorBoundaryClass>;
}
