import { HomeGreeting } from "@/components/home/HomeGreeting";
import { AIChatEntry } from "@/components/ai/AIChatEntry";
import { RecentNotesGrid } from "@/components/home/RecentNotesGrid";
import { QuickActions } from "@/components/home/QuickActions";

export default function HomePage() {
  return (
    <div className="max-w-3xl mx-auto p-8 space-y-8">
      <HomeGreeting />
      <AIChatEntry />
      <QuickActions />
      <RecentNotesGrid />
    </div>
  );
}
