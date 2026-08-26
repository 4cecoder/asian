import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";

/**
 * Shared chrome for the (auth) group's cards. Product logic stays out of
 * here — this only knows how to frame a heading, a blurb, a body, and a
 * footer link row.
 */
export function AuthCard({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        {/* Real h1, styled like CardTitle — sign-in/sign-up pages have no
            other heading, and CardTitle renders a div. */}
        <h1 className="font-heading text-lg leading-snug font-semibold">{title}</h1>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
      <CardFooter className="text-sm">{footer}</CardFooter>
    </Card>
  );
}
