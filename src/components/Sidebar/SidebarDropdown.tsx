// SidebarDropdown.tsx
import React from "react";
import SidebarItem from "@/components/Sidebar/SidebarItem";
import { usePathname } from "next/navigation";

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  route: string;
  isAdmin: boolean;
  message?: string;
  pro?: boolean;
  children?: MenuItem[];
}

interface SidebarDropdownProps {
  items: MenuItem[];
}

const SidebarDropdown: React.FC<SidebarDropdownProps> = ({ items }) => {
  const pathname = usePathname();
  const isAdmin = true; // Atur sesuai logika Anda

  return (
    <ul className="flex flex-col gap-2">
      {items
        .filter((item) => !item.isAdmin || isAdmin)
        .map((item, index) => {
          const isActive =
            item.route === "/"
              ? pathname === item.route
              : pathname?.startsWith(item.route) ?? false;

          return <SidebarItem key={index} item={item} isActive={isActive} />;
        })}
    </ul>
  );
};

export default SidebarDropdown;