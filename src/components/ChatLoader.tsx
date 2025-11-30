"use client";

import dynamic from "next/dynamic";

const AIChatInterface = dynamic(
  () => import("@/components/AIChatInterface"),
  { ssr: false }
);

export default function ChatLoader() {
  return <AIChatInterface />;
}
