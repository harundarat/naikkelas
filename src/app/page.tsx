import { Metadata } from "next";
import ChatLoader from "@/components/ChatLoader";

export const metadata: Metadata = {
  title: "Naikkelas",
  description: "Cognition & Connection",
};

export default function Home() {
  return <ChatLoader />;
}