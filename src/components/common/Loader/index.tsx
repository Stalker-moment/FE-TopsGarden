"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import useColorMode from "@/hooks/useColorMode"; 

const Loader = () => {
  // Hook color mode tetap dipanggil untuk inisialisasi class 'dark' di html/body
  // meskipun kita menggunakan styling Tailwind manual untuk background di bawah.
  useColorMode();

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center overflow-hidden bg-zinc-50 dark:bg-black transition-colors duration-500">
      
      {/* --- 1. AMBIENT BACKGROUND (Konsisten dengan Tema) --- */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-20%] w-[80vw] h-[80vw] bg-green-400/20 rounded-full blur-[150px] animate-pulse opacity-60 dark:opacity-30"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[80vw] h-[80vw] bg-blue-400/20 rounded-full blur-[150px] animate-pulse opacity-60 dark:opacity-30" style={{ animationDelay: "2s" }}></div>
      </div>

      {/* --- 2. MAIN LOADER CONTAINER --- */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        
        {/* Wrapper Lingkaran & Logo */}
        <div className="relative h-32 w-32 flex items-center justify-center">
            
            {/* A. Outer Ring (Slow, Dashed) */}
            <motion.span
              className="absolute h-full w-full rounded-full border-2 border-dashed border-green-300/50 dark:border-green-700/50"
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            ></motion.span>

            {/* B. Middle Ring (Medium, Gradient Stroke Effect via Border) */}
            <motion.span
              className="absolute h-24 w-24 rounded-full border-t-2 border-l-2 border-green-500 dark:border-green-400"
              animate={{ rotate: -360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            ></motion.span>

            {/* C. Inner Ring (Fast, Accent) */}
            <motion.span
              className="absolute h-16 w-16 rounded-full border-b-2 border-r-2 border-blue-500 dark:border-blue-400"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            ></motion.span>

            {/* D. Center Glass Circle */}
            <div className="absolute h-12 w-12 rounded-full bg-white/50 dark:bg-zinc-800/50 backdrop-blur-md shadow-lg flex items-center justify-center">
               {/* Logo Image dengan efek 'Breathing' */}
               <motion.div
                 animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
                 transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                 className="relative h-8 w-8"
               >
                  <Image
                    src="/images/logo/sw-removebg-preview.png"
                    alt="Logo"
                    fill
                    className="object-contain drop-shadow-md"
                    priority
                  />
               </motion.div>
            </div>
        </div>

        {/* --- 3. LOADING TEXT --- */}
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 flex flex-col items-center"
        >
            <h3 className="text-lg font-bold tracking-widest text-gray-800 dark:text-white uppercase">
                Tops<span className="text-green-500">Garden</span>
            </h3>
            <div className="flex items-center gap-1 mt-1">
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Initializing System</span>
                <motion.span 
                    animate={{ opacity: [0, 1, 0] }} 
                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5 }}
                    className="text-green-500 font-bold text-lg leading-none"
                >.</motion.span>
                <motion.span 
                    animate={{ opacity: [0, 1, 0] }} 
                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5, delay: 0.2 }}
                    className="text-green-500 font-bold text-lg leading-none"
                >.</motion.span>
                <motion.span 
                    animate={{ opacity: [0, 1, 0] }} 
                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5, delay: 0.4 }}
                    className="text-green-500 font-bold text-lg leading-none"
                >.</motion.span>
            </div>
        </motion.div>

      </div>
    </div>
  );
};

export default Loader;