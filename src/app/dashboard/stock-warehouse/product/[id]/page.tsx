import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import WarehouseDetail from "@/components/OrderWarehouse/detailProduct";
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
      <Breadcrumb pageName="Stock Warehouse" />

      <div className="flex flex-col gap-10">
        <WarehouseDetail />
      </div>
    </DefaultLayout>
  );
};

export default TablesPage;