import React, { useState, useEffect } from "react";
import { FaTimes, FaPlus, FaTrash, FaEdit, FaSave, FaMicrochip, FaMapMarkerAlt, FaKey } from "react-icons/fa";
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      
      {/* Modal Content */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-lg rounded-[2rem] bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/40 dark:border-gray-800/40 max-h-[85vh] flex flex-col"
      >
        {/* Background Decor */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex justify-between items-center mb-6 relative z-10">
          <div>
            <h2 className="text-2xl font-black text-gray-800 dark:text-white flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                <FaMicrochip />
              </span>
              Sensors
            </h2>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-widest">Management</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all cursor-pointer"
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* List of Devices */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-6 custom-scrollbar relative z-10">
            <AnimatePresence mode="popLayout">
                {devices.map((device) => (
                <motion.div 
                    key={device.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`group relative overflow-hidden p-4 rounded-2xl border transition-all ${
                        editingId === device.id 
                        ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50' 
                        : 'bg-gray-50/50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-700/50 hover:border-blue-200 dark:hover:border-blue-800/30 hover:shadow-md'
                    }`}
                >
                    {editingId === device.id ? (
                    // Edit Mode Row
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Device Name</label>
                                <input 
                                className="w-full px-4 py-2.5 text-sm rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-850 dark:text-white"
                                placeholder="e.g. Living Room" 
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Location</label>
                                <input 
                                className="w-full px-4 py-2.5 text-sm rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-850 dark:text-white"
                                placeholder="e.g. First Floor" 
                                value={formData.location}
                                onChange={e => setFormData({...formData, location: e.target.value})}
                                />
                            </div>
                        </div>

                        {/* Relay Configuration Fields */}
                        <div className="p-3.5 rounded-xl bg-gray-100/50 dark:bg-gray-950/40 border border-gray-150 dark:border-gray-800 space-y-4">
                            <label className="flex items-center gap-2.5 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={formData.hasRelay}
                                    onChange={e => setFormData({...formData, hasRelay: e.target.checked})}
                                    className="rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-blue-500 focus:ring-blue-500/20"
                                />
                                <div>
                                    <span className="text-xs font-bold text-gray-700 dark:text-slate-200 block">Has Protection Relay</span>
                                    <span className="text-[9px] text-gray-400 dark:text-gray-500 block">Enable external relay for overcurrent trip protection</span>
                                </div>
                            </label>

                            {formData.hasRelay && (
                                <div className="space-y-4 pl-6 pt-1 border-l-2 border-blue-500/25">
                                    {/* Threshold Slider */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-[9px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wide">Overcurrent Threshold Limit</label>
                                            <span className="text-xs font-mono font-bold text-blue-500 dark:text-blue-400">{formData.overcurrentThreshold.toFixed(1)} A</span>
                                        </div>
                                        <input 
                                            type="range"
                                            min="0.5"
                                            max="25.0"
                                            step="0.5"
                                            value={formData.overcurrentThreshold}
                                            onChange={e => setFormData({...formData, overcurrentThreshold: parseFloat(e.target.value)})}
                                            className="w-full h-1 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500"
                                        />
                                        <div className="flex justify-between text-[8px] text-gray-400 font-semibold font-mono">
                                            <span>0.5 A</span>
                                            <span>10.0 A</span>
                                            <span>25.0 A</span>
                                        </div>
                                    </div>

                                    {/* Delay Slider */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-[9px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wide">Trip Delay (Filter Spikes)</label>
                                            <span className="text-xs font-mono font-bold text-blue-500 dark:text-blue-400">
                                                {formData.overcurrentDelay === 0 ? "Instant (Spike)" : `${formData.overcurrentDelay} seconds`}
                                            </span>
                                        </div>
                                        <input 
                                            type="range"
                                            min="0"
                                            max="15"
                                            step="1"
                                            value={formData.overcurrentDelay}
                                            onChange={e => setFormData({...formData, overcurrentDelay: parseInt(e.target.value)})}
                                            className="w-full h-1 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500"
                                        />
                                        <div className="flex justify-between text-[8px] text-gray-400 font-semibold font-mono">
                                            <span>0s (Instant)</span>
                                            <span>5s</span>
                                            <span>10s</span>
                                            <span>15s</span>
                                        </div>
                                    </div>

                                    {/* Auto Reconnect */}
                                    <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.autoReconnect}
                                            onChange={e => setFormData({...formData, autoReconnect: e.target.checked})}
                                            className="rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-blue-500 focus:ring-blue-500/20"
                                        />
                                        <div>
                                            <span className="text-xs font-bold text-gray-700 dark:text-slate-200 block">Auto-Reconnect Relay</span>
                                            <span className="text-[9px] text-gray-400 dark:text-gray-500 block">Reconnect relay automatically after cutoff cooldown</span>
                                        </div>
                                    </label>

                                    {/* Reconnect Delay */}
                                    {formData.autoReconnect && (
                                        <div className="space-y-1 pl-6">
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-[9px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wide">Reconnect Delay Cooldown</label>
                                                <span className="text-xs font-mono font-bold text-blue-500 dark:text-blue-400">{formData.reconnectDelay} seconds</span>
                                            </div>
                                            <input 
                                                type="range"
                                                min="5"
                                                max="120"
                                                step="5"
                                                value={formData.reconnectDelay}
                                                onChange={e => setFormData({...formData, reconnectDelay: parseInt(e.target.value)})}
                                                className="w-full h-1 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500"
                                            />
                                            <div className="flex justify-between text-[8px] text-gray-400 font-semibold font-mono">
                                                <span>5s</span>
                                                <span>30s</span>
                                                <span>60s</span>
                                                <span>120s</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 justify-end">
                            <button 
                                onClick={handleCancelEdit} 
                                disabled={isLoading} 
                                className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={calculateSave} 
                                disabled={isLoading} 
                                className="px-5 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer"
                            >
                                {isLoading ? 'Saving...' : <><FaSave /> Update</>}
                            </button>
                        </div>
                    </div>
                    ) : (
                    // View Mode Row
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-800 dark:text-gray-100 truncate">{device.name}</h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full bg-blue-100/50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 uppercase tracking-tighter">
                                    <FaMapMarkerAlt size={8} />
                                    {device.location}
                                </span>
                                {device.hasRelay && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100/50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-450 uppercase tracking-tighter" title={`Threshold: ${device.overcurrentThreshold}A, Delay: ${device.overcurrentDelay}s, AutoRec: ${device.autoReconnect ? `${device.reconnectDelay}s` : 'OFF'}`}>
                                        🛡️ {device.overcurrentThreshold.toFixed(1)}A · {device.overcurrentDelay}s {device.autoReconnect && `· 🔄 ${device.reconnectDelay}s`}
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 font-mono bg-gray-100 dark:bg-gray-900/50 px-2 py-1 rounded-md">
                                    <FaKey size={8} />
                                    {device.id.slice(0, 8)}...
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => handleEditClick(device)} 
                                title="Edit Sensor"
                                className="p-2.5 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl transition-all cursor-pointer"
                            >
                                <FaEdit size={14} />
                            </button>
                            <button 
                                onClick={() => handleDeleteClick(device.id)} 
                                title="Delete Sensor"
                                className="p-2.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl transition-all cursor-pointer"
                            >
                                <FaTrash size={14} />
                            </button>
                        </div>
                    </div>
                    )}
                </motion.div>
                ))}
            </AnimatePresence>
            
            {devices.length === 0 && !isAddingMode && (
                <div className="flex flex-col items-center justify-center py-10 opacity-40">
                    <FaMicrochip size={40} className="mb-3" />
                    <p className="text-sm font-medium">No sensors registered yet.</p>
                </div>
            )}
        </div>

        {/* Add New Section */}
        <div className="relative z-10">
            {isAddingMode ? (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 border border-yellow-200 dark:border-yellow-800/30 overflow-y-auto max-h-[45vh]"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 rounded-lg bg-yellow-500 text-white shadow-sm">
                            <FaPlus size={10} />
                        </div>
                        <h4 className="text-sm font-black text-yellow-700 dark:text-yellow-500 uppercase tracking-wider">New Sensor</h4>
                    </div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-3">
                            <input 
                                className="w-full px-4 py-2.5 text-sm rounded-xl bg-white/80 dark:bg-gray-950/50 border border-yellow-200 dark:border-yellow-900/30 outline-none focus:ring-2 focus:ring-yellow-500 transition-all placeholder:text-gray-400 text-gray-855 dark:text-white"
                                placeholder="Sensor Name (e.g. Washing Machine)" 
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                            />
                            <input 
                                className="w-full px-4 py-2.5 text-sm rounded-xl bg-white/80 dark:bg-gray-950/50 border border-yellow-200 dark:border-yellow-900/30 outline-none focus:ring-2 focus:ring-yellow-500 transition-all placeholder:text-gray-400 text-gray-855 dark:text-white"
                                placeholder="Location (e.g. Laundry Area)" 
                                value={formData.location}
                                onChange={e => setFormData({...formData, location: e.target.value})}
                            />
                        </div>

                        {/* Relay Configuration Fields for Add Mode */}
                        <div className="p-3.5 rounded-xl bg-white dark:bg-gray-900/60 border border-yellow-100 dark:border-yellow-950/30 space-y-4">
                            <label className="flex items-center gap-2.5 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={formData.hasRelay}
                                    onChange={e => setFormData({...formData, hasRelay: e.target.checked})}
                                    className="rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-yellow-500 focus:ring-yellow-500/20"
                                />
                                <div>
                                    <span className="text-xs font-bold text-gray-700 dark:text-slate-200 block">Has Protection Relay</span>
                                    <span className="text-[9px] text-gray-450 dark:text-gray-500 block">Enable external relay for overcurrent trip protection</span>
                                </div>
                            </label>

                            {formData.hasRelay && (
                                <div className="space-y-4 pl-6 pt-1 border-l-2 border-yellow-500/20">
                                    {/* Threshold Limit */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-[9px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wide">Overcurrent Threshold Limit</label>
                                            <span className="text-xs font-mono font-bold text-yellow-600 dark:text-yellow-500">{formData.overcurrentThreshold.toFixed(1)} A</span>
                                        </div>
                                        <input 
                                            type="range"
                                            min="0.5"
                                            max="25.0"
                                            step="0.5"
                                            value={formData.overcurrentThreshold}
                                            onChange={e => setFormData({...formData, overcurrentThreshold: parseFloat(e.target.value)})}
                                            className="w-full h-1 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                                        />
                                        <div className="flex justify-between text-[8px] text-gray-400 font-semibold font-mono">
                                            <span>0.5 A</span>
                                            <span>10.0 A</span>
                                            <span>25.0 A</span>
                                        </div>
                                    </div>

                                    {/* Trip Delay */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-[9px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wide">Trip Delay (Filter Spikes)</label>
                                            <span className="text-xs font-mono font-bold text-yellow-600 dark:text-yellow-500">
                                                {formData.overcurrentDelay === 0 ? "Instant (Spike)" : `${formData.overcurrentDelay} seconds`}
                                            </span>
                                        </div>
                                        <input 
                                            type="range"
                                            min="0"
                                            max="15"
                                            step="1"
                                            value={formData.overcurrentDelay}
                                            onChange={e => setFormData({...formData, overcurrentDelay: parseInt(e.target.value)})}
                                            className="w-full h-1 bg-gray-250 dark:bg-gray-850 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                                        />
                                        <div className="flex justify-between text-[8px] text-gray-400 font-semibold font-mono">
                                            <span>0s (Instant)</span>
                                            <span>5s</span>
                                            <span>10s</span>
                                            <span>15s</span>
                                        </div>
                                    </div>

                                    {/* Auto Reconnect */}
                                    <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.autoReconnect}
                                            onChange={e => setFormData({...formData, autoReconnect: e.target.checked})}
                                            className="rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-yellow-500 focus:ring-yellow-500/20"
                                        />
                                        <div>
                                            <span className="text-xs font-bold text-gray-700 dark:text-slate-200 block">Auto-Reconnect Relay</span>
                                            <span className="text-[9px] text-gray-450 dark:text-gray-500 block">Reconnect relay automatically after cutoff cooldown</span>
                                        </div>
                                    </label>

                                    {/* Reconnect Delay */}
                                    {formData.autoReconnect && (
                                        <div className="space-y-1 pl-6">
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-[9px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wide">Reconnect Delay Cooldown</label>
                                                <span className="text-xs font-mono font-bold text-yellow-600 dark:text-yellow-500">{formData.reconnectDelay} seconds</span>
                                            </div>
                                            <input 
                                                type="range"
                                                min="5"
                                                max="120"
                                                step="5"
                                                value={formData.reconnectDelay}
                                                onChange={e => setFormData({...formData, reconnectDelay: parseInt(e.target.value)})}
                                                className="w-full h-1 bg-gray-250 dark:bg-gray-850 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                                            />
                                            <div className="flex justify-between text-[8px] text-gray-400 font-semibold font-mono">
                                                <span>5s</span>
                                                <span>30s</span>
                                                <span>60s</span>
                                                <span>120s</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                            <button 
                                onClick={handleCancelEdit} 
                                className="px-5 py-2 text-xs font-bold text-gray-500 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={calculateSave} 
                                disabled={isLoading} 
                                className="px-6 py-2 text-xs font-bold bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 shadow-lg shadow-yellow-500/20 flex items-center gap-2 transition-all cursor-pointer"
                            >
                                {isLoading ? 'Saving...' : <><FaSave /> Save Sensor</>}
                            </button>
                        </div>
                    </div>
                </motion.div>
            ) : (
                <button 
                    onClick={() => { setIsAddingMode(true); setEditingId(null); setFormData({name:"", location:"", hasRelay: false, overcurrentThreshold: 10.0, overcurrentDelay: 0, autoReconnect: false, reconnectDelay: 30}); }} 
                    className="group w-full py-4 border-2 border-dashed border-gray-250 dark:border-gray-800 rounded-[1.5rem] text-gray-400 hover:border-blue-450 hover:text-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all flex items-center justify-center gap-3 font-bold text-sm cursor-pointer"
                >
                    <div className="p-1 rounded-md bg-gray-100 dark:bg-gray-800 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                        <FaPlus size={10} />
                    </div>
                    Register New Sensor
                </button>
            )}
        </div>
      </motion.div>

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
