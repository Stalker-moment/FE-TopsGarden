import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import NotificationManager from "@/components/Notification";
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
      <Breadcrumb pageName="Notification" />

      <div className="flex flex-col gap-10">
        <NotificationManager />
      </div>
    </DefaultLayout>
  );
};

export default TablesPage;
