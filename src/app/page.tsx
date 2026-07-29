import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Job Track Central",
  description: "Automated Job Monitoring & Reporting Application",
};

export default function Home() {
  redirect("/critical-jobs");
}
