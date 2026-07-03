import { AppHeader } from "@/components/AppHeader";
import { SkeletonGrid } from "@/components/SkeletonGrid";

export default function Loading() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-[1440px] px-4 py-6 md:px-6">
        <SkeletonGrid />
      </main>
    </>
  );
}
