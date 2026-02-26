import React, { useState, useEffect } from "react";
import { FaTimes, FaPlus, FaTrash, FaEdit, FaSave } from "react-icons/fa";
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
  const [formData, setFormData] = useState<{ name: string; location: string }>({ name: "", location: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setEditingId(null);
      setDeletingId(null);
      setIsAddingMode(false);
      setFormData({ name: "", location: "" });
    }
  }, [isOpen]);

  const handleEditClick = (device: PzemDevice) => {
    setEditingId(device.id);
    setFormData({ name: device.name, location: device.location });
    setIsAddingMode(false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setIsAddingMode(false);
    setFormData({ name: "", location: "" });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold dark:text-white">Sensor Management</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <FaTimes size={20} />
          </button>
        </div>

        {/* List of Devices */}
        <div className="space-y-3 mb-6">
            {devices.map((device) => (
              <div key={device.id} className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
                {editingId === device.id ? (
                  // Edit Mode Row
                  <div className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
                    <input 
                      className="flex-1 px-3 py-2 rounded-lg border dark:bg-gray-800 dark:border-gray-600 outline-none focus:ring-2 focus:ring-yellow-500"
                      placeholder="Sensor Name" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                    <input 
                      className="flex-1 px-3 py-2 rounded-lg border dark:bg-gray-800 dark:border-gray-600 outline-none focus:ring-2 focus:ring-yellow-500"
                      placeholder="Location" 
                      value={formData.location}
                      onChange={e => setFormData({...formData, location: e.target.value})}
                    />
                    <div className="flex gap-2">
                        <button onClick={calculateSave} disabled={isLoading} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"><FaSave /></button>
                        <button onClick={handleCancelEdit} disabled={isLoading} className="p-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"><FaTimes /></button>
                    </div>
                  </div>
                ) : (
                  // View Mode Row
                  <>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200">{device.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            {device.location}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">{device.id}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 sm:mt-0">
                      <button onClick={() => handleEditClick(device)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                        <FaEdit />
                      </button>
                      <button onClick={() => handleDeleteClick(device.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                        <FaTrash />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            
            {devices.length === 0 && !isAddingMode && (
                <p className="text-center text-gray-400 py-4">No sensors found.</p>
            )}
        </div>

        {/* Add New Section */}
        {isAddingMode ? (
            <div className="p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 mb-4 animate-in fade-in slide-in-from-bottom-2">
                <h4 className="text-sm font-bold text-yellow-700 dark:text-yellow-500 mb-3">Add New Sensor</h4>
                <div className="flex flex-col gap-3">
                    <input 
                      className="px-3 py-2 rounded-lg border dark:bg-gray-800 dark:border-gray-600 outline-none focus:ring-2 focus:ring-yellow-500"
                      placeholder="Sensor Name (e.g. Main Panel)" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                    <input 
                      className="px-3 py-2 rounded-lg border dark:bg-gray-800 dark:border-gray-600 outline-none focus:ring-2 focus:ring-yellow-500"
                      placeholder="Location (e.g. Warehouse)" 
                      value={formData.location}
                      onChange={e => setFormData({...formData, location: e.target.value})}
                    />
                    <div className="flex gap-2 justify-end mt-2">
                        <button onClick={handleCancelEdit} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
                        <button onClick={calculateSave} disabled={isLoading} className="px-4 py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 shadow-sm flex items-center gap-2">
                            {isLoading ? 'Saving...' : <><FaSave /> Save Sensor</>}
                        </button>
                    </div>
                </div>
            </div>
        ) : (
            <button 
                onClick={() => { setIsAddingMode(true); setEditingId(null); setFormData({name:"", location:""}); }} 
                className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 hover:border-yellow-500 hover:text-yellow-500 transition-all flex items-center justify-center gap-2 font-medium"
            >
                <FaPlus /> Add New Sensor
            </button>
        )}
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
