"use client";

import * as React from "react";
import { Button } from "./ui/button";

interface ErrorBoundaryProps extends React.PropsWithChildren {
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

class ErrorBoundaryClass extends React.Component<
  ErrorBoundaryProps,
  { hasError: boolean }
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error(error);
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(error, info);
    this.props.onError?.(error, info);
  }

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props;

      return fallback ?? null;
    }

    return this.props.children;
  }
}

export default function ErrorBoundary({
  children,
  ...props
}: ErrorBoundaryProps) {
  return <ErrorBoundaryClass {...props}>{children}</ErrorBoundaryClass>;
}

export const PageFallback = () => {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4">
      <div className="rounded-md bg-red-400 p-4 text-black">
        <h1 className="text-2xl font-bold">Error</h1>
        <p className="text-sm">
          An error occurred while loading the page. Please try again later.
        </p>
      </div>
      <Button variant="outline" asChild>
        {/* force full page refresh to get composer to re render */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/">Back to safety</a>
      </Button>
    </div>
  );
};

export const PageError = ({ children }: { children: React.ReactNode }) => {
  return <ErrorBoundary fallback={<PageFallback />}>{children}</ErrorBoundary>;
};
