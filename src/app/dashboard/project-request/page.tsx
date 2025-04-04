import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import TableAccount from "@/components/Tables/TableAccount";
import { Metadata } from "next";
import DefaultLayout from "@/components/Layouts/DefaultLaout";
import Cookies from "js-cookie";

export const metadata: Metadata = {
  title: "Next.js Tables Page | NextAdmin - Next.js Dashboard Kit",
  description: "This is Next.js Tables page for NextAdmin Dashboard Kit",
  icons: "/images/logo/akti.png",
};

const TablesPage = () => {
  return (
    <DefaultLayout>
      <Breadcrumb pageName="Project Request" />

      <div className="flex flex-col gap-10">
        <TableAccount />
      </div>
    </DefaultLayout>
  );
};

export default TablesPage;
