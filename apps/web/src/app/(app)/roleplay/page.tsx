import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Roleplay — Asian" };

/** Placeholder — voice roleplay is blocked on the Track 6/3 backend. */
export default function RoleplayPage() {
  return (
    <div>
      <PageHeader
        title="Roleplay"
        description="Practice conversations with voice — coming in this sprint."
      />
      <Card>
        <CardHeader>
          <CardTitle>Waiting on backend</CardTitle>
          <CardDescription>
            Voice roleplay needs the Track 3 gateway and Track 6 LLM roleplay service before its UI
            can do anything real.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
