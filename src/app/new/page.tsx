import { Suspense } from "react";
import NewPageRedirector from "./redirector";
import DefaultLoading from "@/components/default-loading";

export default async function NewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center">
          <DefaultLoading />
        </div>
      }
    >
      <NewPageRedirector />
    </Suspense>
  );
}
