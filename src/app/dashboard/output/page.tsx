import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import TableOutput from "@/components/TableOutput/index";
import LiveLogs from "@/components/TableOutput/LiveLogs";
import { Metadata } from "next";
import DefaultLayout from "@/components/Layouts/DefaultLaout";
import Cookies from "js-cookie";

export const metadata: Metadata = {
  title: "Output Setings",
  description: "Settings for output control",
  icons: "/images/logo/sw-removebg-preview.png",
};

const TablesPage = () => {
  return (
    <DefaultLayout>
      <Breadcrumb pageName="Output" />

      <div className="flex flex-col gap-10">
        <TableOutput />
        <LiveLogs />
      </div>
    </DefaultLayout>
  );
};

export default TablesPage;
