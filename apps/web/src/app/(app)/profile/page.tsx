import { PageHeader } from "@/components/layout/PageHeader";

import { ProfileView } from "@/features/profile/ProfileView";

export const metadata = { title: "Profile — Asian" };

/** Account + learning preferences. Composition only (ADR 0004) — logic
 * and markup live in features/profile/. */
export default function ProfilePage() {
  return (
    <div className="grid gap-8">
      <PageHeader title="Profile" description="Your account details and learning preferences." />
      <ProfileView />
    </div>
  );
}
