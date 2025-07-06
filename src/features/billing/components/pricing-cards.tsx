"use client";

import * as Card from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import { markdownComponents } from "@/features/message/components/markdown-components";
import { cn } from "@/lib/utils";
import { CheckoutLink, CustomerPortalLink } from "@convex-dev/polar/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import useCurrentPlan from "@/features/billing/hooks/use-current-plan";
import DefaultLoading from "@/components/default-loading";
import Link from "next/link";
import { X } from "lucide-react";

interface Product {
  name: string;
  id: string;
  description: string;
  price: number;
  period: "month" | "year" | undefined | null;
}

export default function PricingCards({ products }: { products: Product[] }) {
  const { plan, planLoading } = useCurrentPlan();

  if (planLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <DefaultLoading />
      </div>
    );
  }

  return (
    <div className="my-8 flex min-h-screen w-full flex-col items-center justify-center gap-4 xl:my-0">
      <div className="absolute top-4 right-4 p-2 sm:p-4">
        <Link href="/">
          <X className="h-6 w-6" />
        </Link>
      </div>
      <span className="text-2xl font-bold">Pricing</span>
      {plan ? (
        <div className="flex min-h-20 flex-col items-center gap-2">
          <span>
            Current plan:{" "}
            <span className="text-primary font-bold">{plan.name}</span>
          </span>
          <CustomerPortalLink
            polarApi={{
              generateCustomerPortalUrl: api.polar.generateCustomerPortalUrl,
            }}
          >
            <Button className="animate-in fade-in duration-300">
              Manage subscription
            </Button>
          </CustomerPortalLink>
        </div>
      ) : (
        <span className="text-muted-foreground mb-2">
          Choose a plan to get started.
        </span>
      )}
      <div className="flex flex-col items-center gap-6">
        <div className="mx-4 flex flex-col gap-4 xl:flex-row">
          {products.map((product) => (
            <Card.Card
              key={product.id}
              className={cn(
                "w-full max-w-96 xl:w-96",
                product.name === "Premium" && "border-premium",
                product.name === "Ultra" && "border-ultra",
              )}
            >
              <Card.CardHeader className="sr-only">
                <Card.CardTitle>{product.name}</Card.CardTitle>
              </Card.CardHeader>
              <Card.CardContent className="w-full max-w-96 xl:w-96">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-2xl font-bold",
                      product.name === "Premium" && "text-premium",
                      product.name === "Ultra" && "text-ultra",
                    )}
                  >
                    {product.name}
                  </span>
                  <span className="text-muted-foreground">
                    {product.price === 0
                      ? "Free"
                      : `$${product.price / 100} ${product.period ? `/ ${product.period}` : ""}`}
                  </span>
                </div>
                <div className="prose dark:prose-invert relative min-h-[250px] w-full max-w-full">
                  <ReactMarkdown components={markdownComponents}>
                    {product.description}
                  </ReactMarkdown>
                </div>
                {product.price !== 0 && !plan && (
                  <CheckoutLink
                    polarApi={{
                      generateCheckoutLink: api.polar.generateCheckoutLink,
                    }}
                    productIds={[product.id]}
                    embed={false}
                  >
                    <Button className="w-full">Upgrade</Button>
                  </CheckoutLink>
                )}
              </Card.CardContent>
            </Card.Card>
          ))}
        </div>
      </div>
    </div>
  );
}
