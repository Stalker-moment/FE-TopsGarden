// /app/dashboard/stock-warehouse/page.tsx

"use client";

import React, { useState, ChangeEvent } from "react";
import Image from "next/image";
import Link from "next/link"; // Impor Link dari Next.js
import { useRouter } from "next/navigation";
import { FiShoppingCart } from "react-icons/fi";

// Tipe data Produk
interface Product {
  id: string;
  name: string;
  image: string;
  stock: number;
  category: string;
  rak: string;
}

// Data Dummy
const dummyProducts: Product[] = [
  {
    id: "1",
    name: "Aluminium Profile 40x40",
    image: "https://spkapi.tierkun.my.id/files/img/warehouse/aluminiumProfile4040.png",
    stock: 10,
    category: "Aluminium",
    rak: "B3A",
  },
  {
    id: "2",
    name: "Aluminium Profile L Join 40x40",
    image: "https://spkapi.tierkun.my.id/files/img/warehouse/aluminiumProfileL4040.png",
    stock: 5,
    category: "Elektronik",
    rak: "B3B",
  },
  {
    id: "3",
    name: "Sealent",
    image: "https://spkapi.tierkun.my.id/files/img/warehouse/sealent.jpg",
    stock: 15,
    category: "Utilities",
    rak: "C1A",
  },
  // Tambahkan lebih banyak data dummy sesuai kebutuhan
];

const WarehouseDashboard: React.FC = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState<string>("");

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredProducts = dummyProducts.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fungsi untuk Menambahkan ke Keranjang (Sementara, hanya alert)
  const handleAddToCart = (product: Product) => {
    alert(`${product.name} telah ditambahkan ke keranjang!`);
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Header dengan Pencarian dan Ikon Keranjang */}
        <div className="flex items-center justify-between mb-6">
          {/* Search Bar */}
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Cari produk..."
            className="flex-grow mr-4 px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
            aria-label="Cari produk"
          />
          {/* Cart Icon di Pojok Kanan Atas */}
          <button
            className="relative text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white focus:outline-none"
            aria-label="Lihat Keranjang"
            onClick={() => router.push("/dashboard/stock-warehouse/cart")}
          >
            <FiShoppingCart size={24} />
          </button>
        </div>

        {/* Grid Produk */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden flex flex-col"
            >
              {/* Bagian Gambar dan Label Stok */}
              <div className="relative">
                <Link
                  href={`/dashboard/stock-warehouse/product/${product.id}`}
                  className="block"
                >
                  <Image
                    src={product.image}
                    alt={product.name}
                    width={400}
                    height={200}
                    className="w-full h-48 object-cover"
                  />
                </Link>
                <span
                  className={`absolute top-2 left-2 px-3 py-1 rounded-full text-sm font-semibold ${
                    product.stock > 0
                      ? "bg-green-500/75 text-white"
                      : "bg-red-500/75 text-white"
                  }`}
                >
                  {product.stock > 0 ? "Tersedia" : "Habis"}
                </span>
              </div>

              {/* Bagian Detail Produk */}
              <div className="p-4 flex flex-col flex-1">
                <Link
                  href={`/dashboard/stock-warehouse/product/${product.id}`}
                  className="block"
                >
                  <h2 className="text-sm font-semibold text-gray-800 dark:text-white line-clamp-2 hover:underline">
                    {product.name}
                  </h2>
                </Link>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Kategori:</span> {product.category}
                </p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Lokasi Rak:</span> {product.rak}
                </p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Stok:</span> {product.stock}
                </p>

                {/* Tombol Tambah ke Keranjang */}
                <button
                  onClick={() => handleAddToCart(product)}
                  disabled={product.stock <= 0}
                  className={`mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${
                    product.stock <= 0 ? "opacity-50 cursor-not-allowed" : ""
                  } hidden md:block`}
                  aria-label={`Tambah ${product.name} ke keranjang`}
                >
                  Tambah ke Keranjang
                </button>
              </div>
            </div>
          ))}
          {filteredProducts.length === 0 && (
            <p className="col-span-full text-center text-gray-500 dark:text-gray-400">
              Tidak ada data produk yang ditemukan.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WarehouseDashboard;