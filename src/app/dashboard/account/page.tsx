import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import TableAccount from "@/components/Tables/TableAccount";
import { Metadata } from "next";
import DefaultLayout from "@/components/Layouts/DefaultLaout";
import Cookies from "js-cookie";

export const metadata: Metadata = {
  title: "Account",
  description: "Settings for account control",
  icons: "/images/logo/sw-removebg-preview.png",
};

const TablesPage = () => {
  return (
    <DefaultLayout>
      <Breadcrumb pageName="Account" />

      <div className="flex flex-col gap-10">
        <TableAccount />
      </div>
    </DefaultLayout>
  );
};

export default TablesPage;
