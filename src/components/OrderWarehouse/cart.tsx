"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MdDeleteForever } from "react-icons/md";
import { LuArrowLeft } from "react-icons/lu";

// Tipe data Produk
interface Product {
  id: string;
  name: string;
  image: string;
  stock: number;
  category: string;
  rak: string;
}

// Tipe data Keranjang
interface CartItem {
  product: Product;
  quantity: number;
}

// Data Dummy untuk Keranjang
const dummyCart: CartItem[] = [
  {
    product: {
      id: "1",
      name: "Aluminium Profile 40x40",
      image: "https://spkapi.tierkun.my.id/files/img/warehouse/aluminiumProfile4040.png",
      stock: 10,
      category: "Aluminium",
      rak: "B3A",
    },
    quantity: 2,
  },
  {
    product: {
      id: "3",
      name: "Sealent",
      image: "https://spkapi.tierkun.my.id/files/img/warehouse/sealent.jpg",
      stock: 15,
      category: "Utilities",
      rak: "C1A",
    },
    quantity: 1,
  },
  // Tambahkan lebih banyak data dummy sesuai kebutuhan
];

const WarehouseCart: React.FC = () => {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>(dummyCart);

  // Fungsi untuk Menambah Jumlah Item
  const handleIncrement = (productId: string) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId && item.product.stock > 0
          ? { ...item, quantity: item.quantity + 1, product: { ...item.product, stock: item.product.stock - 1 } }
          : item
      )
    );
  };

  // Fungsi untuk Mengurangi Jumlah Item
  const handleDecrement = (productId: string) => {
    setCart((prevCart) =>
      prevCart
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity - 1, product: { ...item.product, stock: item.product.stock + 1 } }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  // Fungsi untuk Menghapus Item dari Keranjang
  const handleRemove = (productId: string) => {
    setCart((prevCart) =>
      prevCart.filter((item) => {
        if (item.product.id === productId) {
          // Kembalikan stok produk saat dihapus dari keranjang
          item.product.stock += item.quantity;
          return false;
        }
        return true;
      })
    );
  };

  // Fungsi untuk Checkout
  const handleCheckout = () => {
    alert("Barang berhasil diambil!");
    setCart([]);
    router.push("/dashboard/stock-warehouse");
  };

  // Fungsi untuk Mengubah Jumlah melalui Input (Sementara, hanya handle jika diperlukan)
  const handleQuantityChange = (productId: string, quantity: number) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.product.id === productId) {
          const difference = quantity - item.quantity;
          if (difference > 0 && item.product.stock >= difference) {
            return { ...item, quantity, product: { ...item.product, stock: item.product.stock - difference } };
          } else if (difference < 0) {
            return { ...item, quantity, product: { ...item.product, stock: item.product.stock - difference } };
          }
        }
        return item;
      })
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Header Keranjang dengan Tombol Kembali */}
        <div className="flex items-center mb-6">
          <button
            className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white focus:outline-none mr-4"
            aria-label="Kembali ke Dashboard"
            onClick={() => router.push("/dashboard/stock-warehouse")}
          >
            <LuArrowLeft size={24} />
          </button>
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
            Keranjang Belanja
          </h2>
        </div>
        {/* Daftar Item Keranjang */}
        {cart.length > 0 ? (
          <ul className="space-y-4">
            {cart.map((item) => (
              <li
                key={item.product.id}
                className="flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-md shadow hover:shadow-md transition-shadow duration-200"
              >
                {/* Bagian Kiri: Gambar dan Info Produk */}
                <div className="flex items-center w-full sm:w-auto">
                  {/* Gambar Produk */}
                  <div
                    className="block cursor-pointer"
                    onClick={() => router.push(`/dashboard/stock-warehouse/product/${item.product.id}`)}
                  >
                    <Image
                      src={item.product.image}
                      alt={item.product.name}
                      width={80}
                      height={80}
                      className="w-20 h-20 object-cover rounded-md"
                    />
                  </div>
                  <div className="ml-4 flex-1">
                    {/* Nama Produk */}
                    <div
                      className="block cursor-pointer"
                      onClick={() => router.push(`/dashboard/stock-warehouse/product/${item.product.id}`)}
                    >
                      <h3 className="text-sm font-medium text-gray-800 dark:text-white line-clamp-2 hover:underline">
                        {item.product.name}
                      </h3>
                    </div>
                    {/* Lokasi Rak */}
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Lokasi Rak: {item.product.rak}
                    </p>
                  </div>
                </div>
                {/* Bagian Kanan: Kontrol Quantity dan Hapus */}
                <div className="mt-4 sm:mt-0 flex items-center space-x-4">
                  {/* Kontrol Quantity */}
                  <div className="flex items-center">
                    <button
                      onClick={() => handleDecrement(item.product.id)}
                      className="px-2 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-l-md focus:outline-none hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors duration-200"
                      aria-label={`Kurangi jumlah ${item.product.name}`}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        handleQuantityChange(item.product.id, parseInt(e.target.value))
                      }
                      className="w-12 text-center border-t border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label={`Ubah jumlah ${item.product.name}`}
                    />
                    <button
                      onClick={() => handleIncrement(item.product.id)}
                      className="px-2 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-r-md focus:outline-none hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors duration-200"
                      aria-label={`Tambah jumlah ${item.product.name}`}
                    >
                      +
                    </button>
                  </div>
                  {/* Tombol Hapus */}
                  <button
                    onClick={() => handleRemove(item.product.id)}
                    className="text-red-500 hover:text-red-700 focus:outline-none"
                    aria-label={`Hapus ${item.product.name} dari keranjang`}
                  >
                    <MdDeleteForever size={24} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">Keranjang Anda kosong.</p>
        )}
        {/* Tombol Checkout */}
        {cart.length > 0 && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleCheckout}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
              aria-label="Checkout Keranjang"
            >
              Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WarehouseCart;