import { Suspense } from "react";
import DailyFormLong from "@/components/DailyForm/DailyFormLong";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <DailyFormLong />
    </Suspense>
  );
}
