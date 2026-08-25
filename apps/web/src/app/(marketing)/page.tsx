import Link from "next/link";

import { MarketingShell } from "@/components/layout/MarketingShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const languages = [
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Mandarin" },
  { code: "th", name: "Thai" },
  { code: "vi", name: "Vietnamese" },
] as const;

export default function LandingPage() {
  return (
    <MarketingShell>
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-4 py-20 text-center">
        <h1 className="font-heading max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Situational fluency for your next trip
        </h1>
        <p className="text-muted-foreground max-w-xl text-lg">
          Learn the phrases that matter for where you are and why you&apos;re there — with
          spaced-repetition review, a situational phrasebook, dictionary lookup, and voice roleplay.
        </p>
        <div className="flex gap-3">
          <Button render={<Link href="/sign-up" />}>Get started</Button>
          <Button variant="outline" render={<Link href="/sign-in" />}>
            Sign in
          </Button>
        </div>
      </section>
      <section className="mx-auto w-full max-w-5xl px-4 pb-20">
        <Card>
          <CardHeader>
            <CardTitle>Languages</CardTitle>
            <CardDescription>
              Japanese, Korean, and Mandarin first; Thai and Vietnamese to follow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-wrap gap-2">
              {languages.map(({ code, name }) => (
                <li key={code} className="rounded-lg border px-3 py-1.5 text-sm font-medium">
                  {name} ({code})
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </MarketingShell>
  );
}
