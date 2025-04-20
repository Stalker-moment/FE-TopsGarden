import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import GardenLightsControl from "@/components/smartwatering";
import { Metadata } from "next";
import DefaultLayout from "@/components/Layouts/DefaultLaout";
import Cookies from "js-cookie";

export const metadata: Metadata = {
  title: "Light Control",
  description: "Settings for light control",
  icons: "/images/logo/sw-removebg-preview.png",
};

const TablesPage = () => {
  return (
    <DefaultLayout>
      <Breadcrumb pageName="Light Control" />

      <div className="flex flex-col gap-10">
        <GardenLightsControl />
      </div>
    </DefaultLayout>
  );
};

export default TablesPage;
