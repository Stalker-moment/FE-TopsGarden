import { Metadata } from "next";
import DefaultLayout from "@/components/Layouts/DefaultLaout";
import React from "react";
import PowerDashboard from "@/components/PowerDashboard";

export const metadata: Metadata = {
  title: "Power Monitoring | Smart Watering Dashboard",
  description: "Realtime Power Monitoring for Garden",
  icons: "/images/logo/sw-removebg-preview.png",
};

export default function PowerPage() {
  return (
    <DefaultLayout>
      <PowerDashboard />
    </DefaultLayout>
  );
}
