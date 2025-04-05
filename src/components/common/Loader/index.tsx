"use client";

import Image from "next/image";
import useColorMode from "@/hooks/useColorMode"; 
// ganti path di atas sesuai lokasi sebenarnya dari useColorMode.ts

const Loader = () => {
  // Panggil custom hook untuk memastikan class "dark" ditambahkan/dihapus sesuai mode
  const [colorMode] = useColorMode();

  return (
    <div
      className="
        relative flex h-screen items-center justify-center
        bg-white dark:bg-gray-900
      "
    >
      {/* Spinner */}
      <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>

      {/* Logo dengan Animasi Scaling */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Logo untuk Light Mode */}
        <Image
          src="/images/logo/sw-removebg-preview.png"
          alt="sw-removebg-preview"
          width={32}
          height={32}
          className="animate-scale-pulse dark:hidden"
        />

        {/* Logo untuk Dark Mode */}
        <Image
          src="/images/logo/sw-removebg-preview.png"
          alt="sw-removebg-preview"
          width={32}
          height={32}
          className="animate-scale-pulse hidden dark:block"
        />
      </div>
    </div>
  );
};

export default Loader;