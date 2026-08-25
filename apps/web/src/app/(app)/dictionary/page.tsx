import { PageHeader } from "@/components/layout/PageHeader";
import { DictionarySearch } from "@/features/dictionary/DictionarySearch";

export const metadata = { title: "Dictionary — Asian" };

/** Dictionary search (ja/ko/zh) — all logic lives in features/dictionary/. */
export default function DictionaryPage() {
  return (
    <div>
      <PageHeader title="Dictionary" description="Look up Japanese, Korean, and Mandarin words." />
      <DictionarySearch />
    </div>
  );
}
