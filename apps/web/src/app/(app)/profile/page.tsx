import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Profile — Asian" };

/** Placeholder — account and language preferences land this sprint. */
export default function ProfilePage() {
  return (
    <div>
      <PageHeader
        title="Profile"
        description="Account details and language preferences — coming in this sprint."
      />
      <Card>
        <CardHeader>
          <CardTitle>Profile settings not built yet</CardTitle>
          <CardDescription>This placeholder is replaced by the real profile page.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
