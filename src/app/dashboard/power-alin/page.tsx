import { Metadata } from "next";
import DefaultLayout from "@/components/Layouts/DefaultLaout";
import React from "react";
import PowerALIN from "@/components/PowerALIN";

export const metadata: Metadata = {
  title: "Power-ALIN (NILM) | Tops Garden Dashboard",
  description: "Platform Disagregasi Beban Listrik Non-Intrusif (NILM) Kamar Kos Berbasis Non-Negative Matrix Factorization (NMF)",
  icons: "/images/logo/sw-removebg-preview.png",
};

export default function PowerAlinPage() {
  return (
    <DefaultLayout>
      <PowerALIN />
    </DefaultLayout>
  );
}

