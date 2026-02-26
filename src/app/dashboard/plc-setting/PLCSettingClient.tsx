"use client";
import React, { useState } from "react";
import { FaServer, FaArrowLeft, FaExternalLinkAlt, FaCog, FaNetworkWired } from "react-icons/fa";

const PLCSettingClient = () => {
  const [selectedPLC, setSelectedPLC] = useState<"PLC1" | "PLC2" | null>(null);

  // Helper component for the PLC Card
  const PLCCard = ({ 
    title, 
    address, 
    status,
    onClick 
  }: { 
    title: string; 
    address: string; 
    status: "online" | "offline";
    onClick: () => void; 
  }) => (
    <div 
      onClick={onClick}
      className="group relative overflow-hidden rounded-xl bg-white p-8 shadow-card hover:shadow-lg dark:bg-gray-800 dark:shadow-none transition-all duration-300 border border-transparent hover:border-primary/50 dark:border-gray-700 cursor-pointer"
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-primary/5 blur-xl transition-all group-hover:bg-primary/10"></div>
      
      <div className="flex flex-col items-center text-center z-10 relative">
        <div className="mb-6 relative">
             <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-50 dark:bg-gray-700 text-primary shadow-sm group-hover:scale-110 transition-transform duration-300">
                <FaServer size={36} />
            </div>
            <div className={`absolute bottom-0 right-0 h-5 w-5 rounded-full border-4 border-white dark:border-gray-800 ${status === 'online' ? 'bg-success' : 'bg-danger'}`}></div>
        </div>
        
        <h3 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
          {title}
        </h3>
        
        <div className="mb-6 flex items-center gap-2 rounded-full bg-gray-100 dark:bg-gray-700 px-4 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300">
          <FaNetworkWired size={14} />
          {address}
        </div>

        <button className="flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3 font-medium text-white shadow-lg shadow-primary/20 transition-all hover:bg-opacity-90 hover:shadow-primary/40 active:scale-95 w-full sm:w-auto">
            <FaCog /> Configure
        </button>
      </div>
    </div>
  );

  return (
      <div className="flex flex-col gap-6">
        {!selectedPLC ? (
          <div>
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                   <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    PLC Configuration
                   </h2>
                   <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                      Select a PLC module to view interface and configure settings
                   </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
                <PLCCard 
                    title="PLC Siemens 1" 
                    address="plc1.tierkun.my.id" 
                    status="online"
                    onClick={() => setSelectedPLC("PLC1")}
                />
                <PLCCard 
                    title="PLC Siemens 2" 
                    address="plc2.tierkun.my.id" 
                    status="online"
                    onClick={() => setSelectedPLC("PLC2")}
                />
              </div>
          </div>
        ) : (
          /* Detail / Iframe View */
          <div className="flex flex-col h-[calc(100vh-180px)]">
            <div className="mb-4 flex items-center justify-between">
                <button 
                    onClick={() => setSelectedPLC(null)}
                    className="flex items-center gap-2 rounded-lg py-2 px-4 font-medium text-gray-700 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700 transition-colors group"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-gray-700 shadow-sm group-hover:scale-105 transition-transform">
                         <FaArrowLeft className="text-primary" size={12}/>
                    </div>
                    <span>Back to Selection</span>
                </button>

                <div className="hidden sm:flex items-center gap-3 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex h-2 w-2 rounded-full bg-success animate-pulse"></div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedPLC === "PLC1" ? "PLC Siemens 1" : "PLC Siemens 2"} Connected
                    </span>
                </div>
            </div>

            <div className="flex-1 flex flex-col rounded-xl border border-gray-200 bg-white shadow-default dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                <div className="flex items-center gap-4">
                   <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <FaServer size={20}/>
                   </div>
                   <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white leading-tight">
                            {selectedPLC === "PLC1" ? "PLC Siemens 1" : "PLC Siemens 2"} interface
                        </h3>
                        <a 
                             href={selectedPLC === "PLC1" ? "http://plc1.tierkun.my.id" : "http://plc2.tierkun.my.id"}
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5"
                        >
                            {selectedPLC === "PLC1" ? "plc1.tierkun.my.id" : "plc2.tierkun.my.id"}
                            <FaExternalLinkAlt size={8} />
                        </a>
                   </div>
                </div>
                
                <a 
                    href={selectedPLC === "PLC1" ? "http://plc1.tierkun.my.id" : "http://plc2.tierkun.my.id"}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-dark transition-colors bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-lg"
                >
                    Open in New Tab <FaExternalLinkAlt size={12}/>
                </a>
              </div>
              
              <div className="flex-1 relative bg-gray-100 dark:bg-gray-900 w-full h-full">
                 {/* Loading Placeholder (behind iframe) */}
                 <div className="absolute inset-0 flex items-center justify-center text-gray-400 z-0">
                     <div className="flex flex-col items-center gap-2">
                         <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
                         <p className="text-sm">Connecting to PLC Interface...</p>
                     </div>
                 </div>
                 
                <iframe
                    src={selectedPLC === "PLC1" ? "http://plc1.tierkun.my.id" : "http://plc2.tierkun.my.id"}
                    className="absolute inset-0 w-full h-full border-0 z-10 bg-transparent"
                    title={selectedPLC === "PLC1" ? "PLC Siemens 1" : "PLC Siemens 2"}
                    allowFullScreen
                    sandbox="allow-same-origin allow-scripts allow-forms"
                />
              </div>
            </div>
          </div>
        )}
      </div>
  );
};

export default PLCSettingClient;
