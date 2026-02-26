import React from "react";
import DefaultLayout from "@/components/Layouts/DefaultLaout";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { Metadata } from "next";
import PLCSettingClient from "./PLCSettingClient";

export const metadata: Metadata = {
  title: "PLC Setting | Smart Watering",
  description: "PLC Configuration Pages",
};

const PLCSettingPage = () => {
  return (
    <DefaultLayout>
      <Breadcrumb pageName="PLC Setting" />
      <PLCSettingClient />
    </DefaultLayout>
  );
};

export default PLCSettingPage;
