import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import Machine from "@/components/Machine";
import { Metadata } from "next";
import DefaultLayout from "@/components/Layouts/DefaultLaout";
import Cookies from "js-cookie";

export const metadata: Metadata = {
  title: "Next.js Tables Page | NextAdmin - Next.js Dashboard Kit",
  description: "This is Next.js Tables page for NextAdmin Dashboard Kit",
  icons: "/images/logo/sw-removebg-preview.png",
};

const TablesPage = () => {
  return (
    <DefaultLayout>
      <Breadcrumb pageName="Monitoring TEFA Machine" />

      <div className="flex flex-col gap-10">
        <Machine />
      </div>
    </DefaultLayout>
  );
};

export default TablesPage;