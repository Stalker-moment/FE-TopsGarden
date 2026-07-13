import React, { useState, useEffect } from "react";
import { FaTimes, FaPlus, FaTrash, FaEdit, FaSave, FaMicrochip, FaMapMarkerAlt, FaKey, FaArrowLeft } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { PzemDevice } from "@/types/pzem";
import ConfirmationModal from "./ConfirmationModal";

interface DeviceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: PzemDevice[];
  onDevicesUpdate: () => void; // Trigger refetch in parent
  apiUrl: string;
}

const DeviceSettingsModal: React.FC<DeviceSettingsModalProps> = ({ isOpen, onClose, devices, onDevicesUpdate, apiUrl }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ 
    name: string; 
    location: string;
    hasRelay: boolean;
    overcurrentThreshold: number;
    overcurrentDelay: number;
    autoReconnect: boolean;
    reconnectDelay: number;
  }>({ 
    name: "", 
    location: "", 
    hasRelay: false, 
    overcurrentThreshold: 10.0, 
    overcurrentDelay: 0, 
    autoReconnect: false, 
    reconnectDelay: 30 
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setEditingId(null);
      setDeletingId(null);
      setIsAddingMode(false);
      setFormData({ 
        name: "", 
        location: "", 
        hasRelay: false, 
        overcurrentThreshold: 10.0, 
        overcurrentDelay: 0, 
        autoReconnect: false, 
        reconnectDelay: 30 
      });
    }
  }, [isOpen]);

  const handleEditClick = (device: PzemDevice) => {
    setEditingId(device.id);
    setFormData({ 
      name: device.name, 
      location: device.location,
      hasRelay: device.hasRelay || false,
      overcurrentThreshold: device.overcurrentThreshold !== undefined ? device.overcurrentThreshold : 10.0,
      overcurrentDelay: device.overcurrentDelay !== undefined ? device.overcurrentDelay : 0,
      autoReconnect: device.autoReconnect || false,
      reconnectDelay: device.reconnectDelay !== undefined ? device.reconnectDelay : 30
    });
    setIsAddingMode(false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setIsAddingMode(false);
    setFormData({ 
      name: "", 
      location: "", 
      hasRelay: false, 
      overcurrentThreshold: 10.0, 
      overcurrentDelay: 0, 
      autoReconnect: false, 
      reconnectDelay: 30 
    });
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/device/pzem/${deletingId}`, { method: "DELETE" });
      if (res.ok) {
        onDevicesUpdate();
      } else {
        alert("Failed to delete device");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      setDeletingId(null);
    }
  };

  const calculateSave = async () => {
    if (!formData.name || !formData.location) {
      alert("Name and Location are required");
      return;
    }

    setIsLoading(true);
    try {
      if (isAddingMode) {
        // Create
        const res = await fetch(`${apiUrl}/api/device/pzem`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          onDevicesUpdate();
          handleCancelEdit();
        } else {
          alert("Failed to create device");
        }
      } else if (editingId) {
        // Update
        const res = await fetch(`${apiUrl}/api/device/pzem/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          onDevicesUpdate();
          handleCancelEdit();
        } else {
          alert("Failed to update device");
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-full animate-fadeIn space-y-6 relative z-10">
      
      {/* Header with back button */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={onClose}
          className="p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-900/60 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl transition-all cursor-pointer flex items-center justify-center active:scale-95 shadow-sm border border-gray-200 dark:border-gray-800"
          title="Back to Dashboard"
        >
          <FaArrowLeft size={16} />
        </button>
        <div>
          <h2 className="text-2xl font-black text-gray-850 dark:text-white flex items-center gap-3">
            <span className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
              <FaMicrochip size={16} />
            </span>
            Power Monitoring Sensors
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Configure safety thresholds, trip delays, auto-reconnection cooldowns, and register new sensors
          </p>
        </div>
      </div>

      {/* Two-Column Responsive Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Registered Sensors List */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900/50 border border-gray-150 dark:border-slate-800 rounded-3xl p-5 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-wider">Registered Sensors</h3>
            {!isAddingMode && (
              <button 
                onClick={() => { 
                  setIsAddingMode(true); 
                  setEditingId(null); 
                  setFormData({name:"", location:"", hasRelay: false, overcurrentThreshold: 10.0, overcurrentDelay: 0, autoReconnect: false, reconnectDelay: 30}); 
                }} 
                className="px-3 py-1.5 text-[10px] font-bold bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/10 cursor-pointer active:scale-95"
              >
                <FaPlus size={8} /> Register New
              </button>
            )}
          </div>

          {/* List Wrapper */}
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {devices.map((device) => {
                const isActive = editingId === device.id;
                return (
                  <motion.div 
                    key={device.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`group relative overflow-hidden p-4 rounded-2xl border transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/50 shadow-md shadow-blue-500/5' 
                        : 'bg-gray-50/50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-700/50 hover:border-blue-200 dark:hover:border-blue-800/30'
                    }`}
                    onClick={() => handleEditClick(device)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-bold truncate ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-100'}`}>{device.name}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <span className="inline-flex items-center gap-1.5 text-[9px] font-black px-2 py-0.5 rounded bg-blue-100/50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 uppercase">
                            <FaMapMarkerAlt size={7} />
                            {device.location}
                          </span>
                          {device.hasRelay && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-100/50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-450 uppercase">
                              🛡️ {device.overcurrentThreshold.toFixed(2)}A
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteClick(device.id); }} 
                          title="Delete Sensor"
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all shadow-sm cursor-pointer"
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {devices.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-650">
                <FaMicrochip size={36} className="mb-2 opacity-40 animate-pulse" />
                <p className="text-xs font-semibold">No sensors registered yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Form Panel (Edit / Add / Blank State) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900/50 border border-gray-150 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl backdrop-blur-md relative overflow-hidden min-h-[50vh] flex flex-col justify-between">
          {/* Background Decor */}
          <div className="absolute top-0 right-0 -mr-24 -mt-24 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-72 h-72 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none"></div>

          {editingId ? (
            /* Edit Mode Form */
            <div className="space-y-5 relative z-10">
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-3 mb-2">
                <div>
                  <h3 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-wider">Configure Sensor Settings</h3>
                  <p className="text-[10px] text-gray-400 dark:text-gray-550 font-mono mt-0.5">ID: {editingId}</p>
                </div>
                <button 
                  onClick={handleCancelEdit} 
                  className="p-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-955 dark:hover:bg-gray-900 rounded-lg text-gray-450 dark:text-gray-550 transition-all active:scale-95"
                >
                  <FaTimes size={14} />
                </button>
              </div>

              {/* Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-550 uppercase tracking-wider">Sensor Name</label>
                  <input 
                    className="w-full px-4 py-2.5 text-sm rounded-xl bg-white dark:bg-gray-955 border border-gray-200 dark:border-gray-800 focus:border-blue-500 outline-none focus:ring-1 focus:ring-blue-500 transition-all text-gray-855 dark:text-white font-semibold"
                    placeholder="e.g. Washing Machine" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-555 uppercase tracking-wider">Location</label>
                  <input 
                    className="w-full px-4 py-2.5 text-sm rounded-xl bg-white dark:bg-gray-955 border border-gray-200 dark:border-gray-800 focus:border-blue-500 outline-none focus:ring-1 focus:ring-blue-500 transition-all text-gray-855 dark:text-white font-semibold"
                    placeholder="e.g. Laundry Area" 
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                  />
                </div>
              </div>

              {/* Relay Protection Settings Block */}
              <div className="p-4 rounded-2xl bg-gray-50/50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800 space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.hasRelay}
                    onChange={e => setFormData({...formData, hasRelay: e.target.checked})}
                    className="rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-blue-500 focus:ring-blue-500/20"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-700 dark:text-slate-200 block">Has Protection Relay</span>
                    <span className="text-[9px] text-gray-455 dark:text-gray-500 block">Enable external relay for overcurrent trip protection</span>
                  </div>
                </label>

                {formData.hasRelay && (
                  <div className="space-y-6 pl-6 pt-2 border-l-2 border-blue-500/30 animate-fadeIn">
                    {/* Threshold Input & Slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Overcurrent Threshold Limit</label>
                        <span className="text-[10px] text-blue-500 dark:text-blue-400 font-bold bg-blue-500/5 px-2 py-0.5 rounded-full border border-blue-500/10">
                          Perkiraan Daya: ~{(220 * formData.overcurrentThreshold).toFixed(0)} Watt
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <input 
                          type="range"
                          min="0.20"
                          max="25.00"
                          step="0.01"
                          value={formData.overcurrentThreshold}
                          onChange={e => setFormData({...formData, overcurrentThreshold: parseFloat(parseFloat(e.target.value).toFixed(2))})}
                          className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <input 
                            type="number"
                            min="0.20"
                            max="25.00"
                            step="0.01"
                            value={formData.overcurrentThreshold}
                            onChange={e => {
                              let val = parseFloat(e.target.value);
                              if (val > 25.00) val = 25.00;
                              setFormData({...formData, overcurrentThreshold: isNaN(val) ? 0.20 : val});
                            }}
                            className="w-20 px-2 py-1.5 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-xl text-xs font-mono font-bold text-blue-600 dark:text-blue-400 text-center shadow-sm"
                          />
                          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 font-mono">A</span>
                        </div>
                      </div>
                      <div className="flex justify-between text-[9px] text-gray-400 dark:text-gray-550 font-semibold font-mono">
                        <span>Min: 0.20 A</span>
                        <span>Max: 25.00 A</span>
                      </div>
                    </div>

                    {/* Delay Input & Slider */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 dark:text-gray-555 uppercase tracking-wider block">Trip Delay (Filter Spikes)</label>
                      <div className="flex items-center gap-4">
                        <input 
                          type="range"
                          min="0"
                          max="15"
                          step="1"
                          value={formData.overcurrentDelay}
                          onChange={e => setFormData({...formData, overcurrentDelay: parseInt(e.target.value)})}
                          className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <input 
                            type="number"
                            min="0"
                            max="15"
                            step="1"
                            value={formData.overcurrentDelay}
                            onChange={e => {
                              let val = parseInt(e.target.value);
                              if (val > 15) val = 15;
                              setFormData({...formData, overcurrentDelay: isNaN(val) ? 0 : val});
                            }}
                            className="w-20 px-2 py-1.5 bg-white dark:bg-gray-955 border border-gray-200 dark:border-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-xl text-xs font-mono font-bold text-blue-600 dark:text-blue-400 text-center shadow-sm"
                          />
                          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-555 font-mono">detik</span>
                        </div>
                      </div>
                      <div className="flex justify-between text-[9px] text-gray-400 dark:text-gray-550 font-semibold font-mono">
                        <span>0s (Instant Spike Filter)</span>
                        <span>Max: 15s</span>
                      </div>
                    </div>

                    {/* Auto Reconnect */}
                    <div className="space-y-4 pt-2 border-t border-gray-150 dark:border-gray-850">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={formData.autoReconnect}
                          onChange={e => setFormData({...formData, autoReconnect: e.target.checked})}
                          className="rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-blue-500 focus:ring-blue-500/20"
                        />
                        <div>
                          <span className="text-xs font-bold text-gray-700 dark:text-slate-200 block">Auto-Reconnect Relay</span>
                          <span className="text-[9px] text-gray-405 dark:text-gray-500 block">Reconnect relay automatically after cutoff cooldown</span>
                        </div>
                      </label>

                      {/* Reconnect Delay */}
                      {formData.autoReconnect ? (
                        <div className="space-y-2 pl-6 animate-fadeIn">
                          <label className="text-[10px] font-black text-gray-400 dark:text-gray-555 uppercase tracking-wider block">Reconnect Delay Cooldown</label>
                          <div className="flex items-center gap-4">
                            <input 
                              type="range"
                              min="5"
                              max="120"
                              step="1"
                              value={formData.reconnectDelay}
                              onChange={e => setFormData({...formData, reconnectDelay: parseInt(e.target.value)})}
                              className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500"
                            />
                            <div className="flex items-center gap-1 shrink-0">
                              <input 
                                type="number"
                                min="5"
                                max="120"
                                step="1"
                                value={formData.reconnectDelay}
                                onChange={e => {
                                  let val = parseInt(e.target.value);
                                  if (val > 120) val = 120;
                                  setFormData({...formData, reconnectDelay: isNaN(val) ? 5 : val});
                                }}
                                className="w-20 px-2 py-1.5 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-xl text-xs font-mono font-bold text-blue-600 dark:text-blue-400 text-center shadow-sm"
                              />
                              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-555 font-mono">detik</span>
                            </div>
                          </div>
                          <div className="flex justify-between text-[9px] text-gray-400 dark:text-gray-550 font-semibold font-mono">
                            <span>Min: 5s</span>
                            <span>Max: 120s</span>
                          </div>
                        </div>
                      ) : (
                        <div className="pl-6 py-2 px-3 bg-rose-500/5 border border-rose-500/10 rounded-xl text-[10px] text-rose-500 dark:text-rose-455 font-medium leading-relaxed">
                          ⚠️ <b>Manual Reconnect:</b> Sirkuit akan tetap terputus (mati) setelah relay trip/putus. Anda harus menekan tombol &quot;Reset &amp; Reconnect (ON)&quot; secara manual di dashboard utama untuk menyalakannya kembali.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Save & Cancel Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-100 dark:border-slate-800">
                <button 
                  onClick={handleCancelEdit} 
                  disabled={isLoading} 
                  className="px-5 py-2.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-955 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={calculateSave} 
                  disabled={isLoading} 
                  className="px-6 py-2.5 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                >
                  {isLoading ? 'Saving...' : <><FaSave /> Save Changes</>}
                </button>
              </div>
            </div>
          ) : isAddingMode ? (
            /* Register Mode Form */
            <div className="space-y-5 relative z-10 animate-fadeIn">
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-3 mb-2">
                <div>
                  <h3 className="text-sm font-black text-yellow-600 dark:text-yellow-500 uppercase tracking-wider flex items-center gap-2">
                    <FaPlus size={10} /> Register New Sensor
                  </h3>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mt-0.5">Add a new PZEM metering node</p>
                </div>
                <button 
                  onClick={handleCancelEdit} 
                  className="p-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-955 dark:hover:bg-gray-900 rounded-lg text-gray-450 dark:text-gray-550 transition-all active:scale-95"
                >
                  <FaTimes size={14} />
                </button>
              </div>

              {/* Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-550 uppercase tracking-wider">Sensor Name</label>
                  <input 
                    className="w-full px-4 py-2.5 text-sm rounded-xl bg-white dark:bg-gray-955 border border-yellow-200 dark:border-yellow-900/30 focus:border-yellow-500 outline-none focus:ring-1 focus:ring-yellow-500 transition-all text-gray-855 dark:text-white font-semibold"
                    placeholder="e.g. Washing Machine" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-555 uppercase tracking-wider">Location</label>
                  <input 
                    className="w-full px-4 py-2.5 text-sm rounded-xl bg-white dark:bg-gray-955 border border-yellow-200 dark:border-yellow-900/30 focus:border-yellow-500 outline-none focus:ring-1 focus:ring-yellow-500 transition-all text-gray-855 dark:text-white font-semibold"
                    placeholder="e.g. Laundry Area" 
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                  />
                </div>
              </div>

              {/* Relay Protection Settings Block */}
              <div className="p-4 rounded-2xl bg-yellow-50/10 dark:bg-yellow-950/10 border border-yellow-200/20 dark:border-yellow-800/20 space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.hasRelay}
                    onChange={e => setFormData({...formData, hasRelay: e.target.checked})}
                    className="rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-yellow-550 focus:ring-yellow-550/20"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-700 dark:text-slate-200 block">Has Protection Relay</span>
                    <span className="text-[9px] text-gray-450 dark:text-gray-500 block">Enable external relay for overcurrent trip protection</span>
                  </div>
                </label>

                {formData.hasRelay && (
                  <div className="space-y-6 pl-6 pt-2 border-l-2 border-yellow-500/30 animate-fadeIn">
                    {/* Threshold Input & Slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-555 uppercase tracking-wider">Overcurrent Threshold Limit</label>
                        <span className="text-[10px] text-yellow-600 dark:text-yellow-500 font-bold bg-yellow-500/5 px-2 py-0.5 rounded-full border border-yellow-500/10">
                          Perkiraan Daya: ~{(220 * formData.overcurrentThreshold).toFixed(0)} Watt
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <input 
                          type="range"
                          min="0.20"
                          max="25.00"
                          step="0.01"
                          value={formData.overcurrentThreshold}
                          onChange={e => setFormData({...formData, overcurrentThreshold: parseFloat(parseFloat(e.target.value).toFixed(2))})}
                          className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <input 
                            type="number"
                            min="0.20"
                            max="25.00"
                            step="0.01"
                            value={formData.overcurrentThreshold}
                            onChange={e => {
                              let val = parseFloat(e.target.value);
                              if (val > 25.00) val = 25.00;
                              setFormData({...formData, overcurrentThreshold: isNaN(val) ? 0.20 : val});
                            }}
                            className="w-20 px-2 py-1.5 bg-white dark:bg-gray-955 border border-yellow-200 dark:border-yellow-900/30 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500 rounded-xl text-xs font-mono font-bold text-yellow-600 dark:text-yellow-500 text-center shadow-sm"
                          />
                          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-550 font-mono">A</span>
                        </div>
                      </div>
                      <div className="flex justify-between text-[9px] text-gray-400 dark:text-gray-550 font-semibold font-mono">
                        <span>Min: 0.20 A</span>
                        <span>Max: 25.00 A</span>
                      </div>
                    </div>

                    {/* Delay Input & Slider */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 dark:text-gray-555 uppercase tracking-wider block">Trip Delay (Filter Spikes)</label>
                      <div className="flex items-center gap-4">
                        <input 
                          type="range"
                          min="0"
                          max="15"
                          step="1"
                          value={formData.overcurrentDelay}
                          onChange={e => setFormData({...formData, overcurrentDelay: parseInt(e.target.value)})}
                          className="flex-1 h-1.5 bg-gray-255 dark:bg-gray-855 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <input 
                            type="number"
                            min="0"
                            max="15"
                            step="1"
                            value={formData.overcurrentDelay}
                            onChange={e => {
                              let val = parseInt(e.target.value);
                              if (val > 15) val = 15;
                              setFormData({...formData, overcurrentDelay: isNaN(val) ? 0 : val});
                            }}
                            className="w-20 px-2 py-1.5 bg-white dark:bg-gray-955 border border-yellow-200 dark:border-yellow-900/30 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500 rounded-xl text-xs font-mono font-bold text-yellow-600 dark:text-yellow-500 text-center shadow-sm"
                          />
                          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-555 font-mono">detik</span>
                        </div>
                      </div>
                      <div className="flex justify-between text-[9px] text-gray-400 dark:text-gray-550 font-semibold font-mono">
                        <span>0s (Instant Spike Filter)</span>
                        <span>Max: 15s</span>
                      </div>
                    </div>

                    {/* Auto Reconnect */}
                    <div className="space-y-4 pt-2 border-t border-gray-150 dark:border-gray-855">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={formData.autoReconnect}
                          onChange={e => setFormData({...formData, autoReconnect: e.target.checked})}
                          className="rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-yellow-500 focus:ring-yellow-500/20"
                        />
                        <div>
                          <span className="text-xs font-bold text-gray-700 dark:text-slate-200 block">Auto-Reconnect Relay</span>
                          <span className="text-[9px] text-gray-455 dark:text-gray-500 block">Reconnect relay automatically after cutoff cooldown</span>
                        </div>
                      </label>

                      {/* Reconnect Delay */}
                      {formData.autoReconnect ? (
                        <div className="space-y-2 pl-6 animate-fadeIn">
                          <label className="text-[10px] font-black text-gray-400 dark:text-gray-555 uppercase tracking-wider block">Reconnect Delay Cooldown</label>
                          <div className="flex items-center gap-4">
                            <input 
                              type="range"
                              min="5"
                              max="120"
                              step="1"
                              value={formData.reconnectDelay}
                              onChange={e => setFormData({...formData, reconnectDelay: parseInt(e.target.value)})}
                              className="flex-1 h-1.5 bg-gray-250 dark:bg-gray-855 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                            />
                            <div className="flex items-center gap-1 shrink-0">
                              <input 
                                type="number"
                                min="5"
                                max="120"
                                step="1"
                                value={formData.reconnectDelay}
                                onChange={e => {
                                  let val = parseInt(e.target.value);
                                  if (val > 120) val = 120;
                                  setFormData({...formData, reconnectDelay: isNaN(val) ? 5 : val});
                                }}
                                className="w-20 px-2 py-1.5 bg-white dark:bg-gray-955 border border-yellow-200 dark:border-yellow-900/30 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500 rounded-xl text-xs font-mono font-bold text-yellow-600 dark:text-yellow-500 text-center shadow-sm"
                              />
                              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-555 font-mono">detik</span>
                            </div>
                          </div>
                          <div className="flex justify-between text-[9px] text-gray-400 dark:text-gray-550 font-semibold font-mono">
                            <span>Min: 5s</span>
                            <span>Max: 120s</span>
                          </div>
                        </div>
                      ) : (
                        <div className="pl-6 py-2 px-3 bg-rose-500/5 border border-rose-500/10 rounded-xl text-[10px] text-rose-500 dark:text-rose-455 font-medium leading-relaxed">
                          ⚠️ <b>Manual Reconnect:</b> Sirkuit akan tetap terputus (mati) setelah relay trip/putus. Anda harus menekan tombol &quot;Reset &amp; Reconnect (ON)&quot; secara manual di dashboard utama untuk menyalakannya kembali.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Register Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-150 dark:border-slate-800">
                <button 
                  onClick={handleCancelEdit} 
                  className="px-5 py-2.5 text-xs font-bold text-gray-500 dark:text-gray-450 hover:bg-gray-50 dark:hover:bg-gray-955 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={calculateSave} 
                  disabled={isLoading} 
                  className="px-6 py-2.5 text-xs font-black bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl shadow-lg shadow-yellow-500/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                >
                  {isLoading ? 'Registering...' : <><FaPlus /> Register Sensor</>}
                </button>
              </div>
            </div>
          ) : (
            /* Blank State Mode (Nothing selected) */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 relative z-10 text-gray-400 dark:text-gray-600 min-h-[40vh]">
              <div className="p-4 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-900 rounded-3xl mb-4 shrink-0 shadow-inner">
                <FaMicrochip size={48} className="text-blue-500/60 dark:text-blue-400/40 animate-pulse" />
              </div>
              <h4 className="text-base font-black text-gray-750 dark:text-slate-200">No Sensor Active</h4>
              <p className="text-xs text-gray-450 dark:text-gray-500 max-w-sm mt-1 mb-6 leading-relaxed">
                Pilih salah satu sensor dari daftar di sebelah kiri untuk mengubah konfigurasinya, atau daftarkan sensor baru.
              </p>
              <button 
                onClick={() => { 
                  setIsAddingMode(true); 
                  setEditingId(null); 
                  setFormData({name:"", location:"", hasRelay: false, overcurrentThreshold: 10.0, overcurrentDelay: 0, autoReconnect: false, reconnectDelay: 30}); 
                }} 
                className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-lg shadow-blue-600/10 cursor-pointer active:scale-95 flex items-center gap-2"
              >
                <FaPlus size={10} /> Daftarkan Sensor Baru
              </button>
            </div>
          )}
        </div>

      </div>

      <ConfirmationModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={confirmDelete}
        title="Delete Sensor?"
        message="Are you sure you want to permanently delete this sensor? All historical data associated with it might be lost."
        confirmText="Yes, Delete"
        isDanger={true}
      />
    </div>
  );
};

export default DeviceSettingsModal;
