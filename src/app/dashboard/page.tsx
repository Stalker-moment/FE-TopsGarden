import { Metadata } from "next";
import DefaultLayout from "@/components/Layouts/DefaultLaout";
import React from "react";
import 'leaflet/dist/leaflet.css';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import Summary from "@/components/HomeDashboard";

export const metadata: Metadata = {
  title:
    "Dashboard | Monitoring Garden",
  description: "Monitoring Garden",
  icons: "/images/logo/sw-removebg-preview.png",
};

export default function Home() {
  return (
    <>
      <DefaultLayout>
        <Summary />
      </DefaultLayout>
    </>
  );
}