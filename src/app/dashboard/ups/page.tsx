import { Metadata } from "next";
import DefaultLayout from "@/components/Layouts/DefaultLaout";
import React from "react";
import UPSDashboard from "@/components/UPSDashboard";

export const metadata: Metadata = {
  title: "UPS Monitoring | Smart Watering Dashboard",
  description: "High-tech Smart DIY UPS Monitoring System Dashboard",
};

export default function UPSPage() {
  return (
    <DefaultLayout>
      <UPSDashboard />
    </DefaultLayout>
  );
}
