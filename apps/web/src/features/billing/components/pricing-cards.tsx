import { CheckoutLink, CustomerPortalLink } from "@convex-dev/polar/react";
import { X } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { api } from "@acme/db/api";
import { useCurrentPlan } from "@acme/features/billing";
import { Button } from "@acme/ui/button";
import * as Card from "@acme/ui/card";

import { DefaultLoading } from "~/components/default-loading";
import { markdownComponents } from "~/features/messages/components/markdown-components";
import { QuickLink as Link } from "~/features/quick-link/quick-link";
import { cn } from "~/lib/utils";

interface Product {
  name: string;
  id: string;
  description: string;
  price: number;
  period: "month" | "year" | undefined | null;
}

function getPlanStyle(name: string) {
  switch (name) {
    case "Premium":
      return {
        border: "border-premium shadow-premium/10 shadow-xl",
        text: "text-premium",
      };
    case "Ultra":
      return {
        border: "border-ultra shadow-ultra/10 shadow-xl",
        text: "text-ultra",
      };
    case "Light":
      return {
        border: "border-light shadow-light/10 shadow-xl",
        text: "text-light",
      };
  }
}

function formatPrice(price: number, period: Product["period"]) {
  if (price === 0) return "Free";
  return `$${price / 100} ${period ? `/ ${period}` : ""}`;
}

function ProductCard({
  product,
  showUpgrade,
}: {
  product: Product;
  showUpgrade: boolean;
}) {
  const style = getPlanStyle(product.name);
  return (
    <Card.Card className={cn("w-full max-w-96 xl:w-96", style?.border)}>
      <Card.CardHeader className="sr-only">
        <Card.CardTitle>{product.name}</Card.CardTitle>
      </Card.CardHeader>
      <Card.CardContent className="w-full max-w-96 xl:w-96">
        <div className="flex items-center gap-2">
          <span className={cn("text-2xl font-bold", style?.text)}>
            {product.name}
          </span>
          <span className="text-muted-foreground">
            {formatPrice(product.price, product.period)}
          </span>
        </div>
        <div className="prose dark:prose-invert relative min-h-[250px] w-full max-w-full">
          <ReactMarkdown components={markdownComponents}>
            {product.description}
          </ReactMarkdown>
        </div>
        {product.price !== 0 && showUpgrade && (
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
  );
}

export function PricingCards({ products }: { products: Product[] }) {
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
        <Link to="/">
          <X className="h-6 w-6" />
        </Link>
      </div>
      <span className="text-2xl font-bold">Pricing</span>
      {plan && plan.name !== "Free" ? (
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
            <ProductCard
              key={product.id}
              product={product}
              showUpgrade={plan?.name === "Free"}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
