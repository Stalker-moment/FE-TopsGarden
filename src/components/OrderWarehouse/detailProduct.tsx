"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { LuArrowLeft } from "react-icons/lu";
import { FiShoppingCart, FiPackage, FiGrid, FiMapPin } from "react-icons/fi";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode, Navigation, Thumbs } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/navigation";
import "swiper/css/thumbs";
import "./styles.css";

interface Product {
  id: string;
  name: string;
  images: string[];
  stock: number;
  category: string;
  rak: string;
  description: string;
}

const dummyProducts: Product[] = [
  {
    id: "1",
    name: "Aluminium Profile 40x40",
    images: [
      "https://spkapi.tierkun.my.id/files/img/warehouse/aluminiumProfile4040.png",
      "https://spkapi.tierkun.my.id/files/img/warehouse/aluminiumProfile4040.png",
      "https://spkapi.tierkun.my.id/files/img/warehouse/aluminiumProfile4040.png",
      "https://spkapi.tierkun.my.id/files/img/warehouse/aluminiumProfile4040.png",
      "https://spkapi.tierkun.my.id/files/img/warehouse/aluminiumProfile4040.png",
      "https://spkapi.tierkun.my.id/files/img/warehouse/aluminiumProfile4040.png",
    ],
    stock: 10,
    category: "Aluminium",
    rak: "B3A",
    description:
      "Aluminium profile 40x40 ini cocok digunakan untuk berbagai keperluan konstruksi dan pembuatan rangka struktur.",
  },
  {
    id: "2",
    name: "Aluminium Profile L Join 40x40",
    images: [
      "https://spkapi.tierkun.my.id/files/img/warehouse/aluminiumProfileL4040.png",
      "https://spkapi.tierkun.my.id/files/img/warehouse/aluminiumProfileL4040.png",
    ],
    stock: 5,
    category: "Elektronik",
    rak: "B3B",
    description:
      "Aluminium profile L join 40x40 dengan kualitas tinggi, ideal untuk pembuatan sambungan pada rangka struktur.",
  },
  {
    id: "3",
    name: "Sealent",
    images: [
      "https://spkapi.tierkun.my.id/files/img/warehouse/sealent.jpg",
      "https://spkapi.tierkun.my.id/files/img/warehouse/sealent.jpg",
    ],
    stock: 15,
    category: "Utilities",
    rak: "C1A",
    description:
      "Sealent berkualitas tinggi, cocok untuk berbagai keperluan penyegelan dan perbaikan di rumah maupun industri.",
  },
];

const WarehouseDetail: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const [thumbsSwiper, setThumbsSwiper] = useState<any>(null);

  const productId = params.id;
  const product = dummyProducts.find((p) => p.id === productId);

  const handleAddToCart = (product: Product) => {
    alert(`${product.name} telah ditambahkan ke keranjang!`);
  };

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 sm:p-6">
        <p className="text-gray-500 dark:text-gray-400 text-lg">Produk tidak ditemukan.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
      <header className="flex items-center justify-between mb-8">
        <button
          className="flex items-center text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white transition-colors"
          onClick={() => router.push("/dashboard/stock-warehouse")}
        >
          <LuArrowLeft size={24} className="mr-2" />
          <span className="font-medium">Kembali</span>
        </button>

        <button
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          onClick={() => router.push("/dashboard/stock-warehouse/cart")}
        >
          <FiShoppingCart size={26} className="text-gray-600 dark:text-gray-300" />
        </button>
      </header>

      <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
              <Swiper
                style={{
                  '--swiper-navigation-color': '#3B82F6',
                  '--swiper-pagination-color': '#3B82F6',
                } as React.CSSProperties}
                spaceBetween={10}
                navigation
                thumbs={{ swiper: thumbsSwiper }}
                modules={[FreeMode, Navigation, Thumbs]}
                className="h-full"
              >
                {product.images.map((imgUrl, index) => (
                  <SwiperSlide key={index}>
                    <Image
                      src={imgUrl}
                      alt={`${product.name} ${index + 1}`}
                      fill
                      className="object-contain"
                      priority
                    />
                  </SwiperSlide>
                ))}
              </Swiper>
              
              <div className="absolute top-4 left-4 z-10">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  product.stock > 0 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                }`}>
                  {product.stock > 0 ? `${product.stock} Tersedia` : 'Stok Habis'}
                </span>
              </div>
            </div>

            <Swiper
              onSwiper={setThumbsSwiper}
              spaceBetween={10}
              slidesPerView={4}
              freeMode
              watchSlidesProgress
              modules={[FreeMode, Navigation, Thumbs]}
              className="!pb-2"
            >
              {product.images.map((imgUrl, index) => (
                <SwiperSlide key={index} className="!w-24 cursor-pointer">
                  <div className="aspect-square relative border-2 border-transparent hover:border-blue-500 rounded-lg transition-all overflow-hidden">
                    <Image
                      src={imgUrl}
                      alt={`Thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>

          {/* Product Info */}
          <div className="py-4 space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {product.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
                {product.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <FiGrid className="w-6 h-6 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Kategori</p>
                  <p className="font-medium text-gray-900 dark:text-white">{product.category}</p>
                </div>
              </div>
              
              <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <FiMapPin className="w-6 h-6 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Lokasi Rak</p>
                  <p className="font-medium text-gray-900 dark:text-white">{product.rak}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleAddToCart(product)}
              disabled={product.stock <= 0}
              className={`w-full flex items-center justify-center space-x-3 py-4 px-6 rounded-xl text-lg font-semibold transition-all ${
                product.stock > 0 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed text-gray-400'
              }`}
            >
              <FiShoppingCart className="w-6 h-6" />
              <span>Tambah ke Keranjang</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseDetail;