"use client";
import React, { useEffect, useState, useRef } from "react";
import Cookies from "js-cookie";
import { 
  Terminal, 
  Maximize2, 
  Minimize2, 
  Trash2, 
  Info,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Download,
  Power,     // Icon baru untuk Connect/Disconnect
  WifiOff    // Icon untuk status disconnected
} from "lucide-react"; 

const HTTPSAPIURL = process.env.NEXT_PUBLIC_HTTPS_API_URL;

interface LogEntry {
  timestamp: string;
  level: string;
  scope: string;
  message: string;
}

const LiveLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // State Utama
  const [isActive, setIsActive] = useState(false); // Kontrol Koneksi (ON/OFF)
  const [isConnected, setIsConnected] = useState(false); // Status WebSocket Real
  const [isPaused, setIsPaused] = useState(false); // Kontrol Scrolling (Buffering)

  // State UI Layout
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  // Refs untuk logika buffering
  const isPausedRef = useRef(false); 
  const backlogRef = useRef<LogEntry[]>([]); 

  // --- WebSocket Logic ---
  useEffect(() => {
    // Jika tidak aktif (User belum klik Start), jangan lakukan apa-apa
    if (!isActive) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    const token = Cookies.get("userAuth");
    if (!token || !HTTPSAPIURL) {
        addSystemLog("Error: Missing API URL or Auth Token");
        return;
    }

    const host = HTTPSAPIURL.replace(/^https?:\/\//, "");
    const wsUrl = `wss://${host}/logs?token=${token}`;
    
    addSystemLog("Initiating connection...");
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      addSystemLog(`Connection established.`);
    };

    ws.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        let newLogs: LogEntry[] = [];

        if (response.type === "snapshot" && Array.isArray(response.logs)) {
          newLogs = response.logs;
        } else if (response.type === "log" && response.data) {
          newLogs = [response.data];
        }

        if (newLogs.length > 0) {
          // Jika sedang Pause (Buffering), simpan ke backlog
          if (isPausedRef.current) {
            backlogRef.current = [...backlogRef.current, ...newLogs];
          } else {
            setLogs((prev) => [...prev, ...newLogs]);
          }
        }
      } catch (error) {
        addSystemLog(String(event.data));
      }
    };

    ws.onclose = () => { 
      setIsConnected(false); 
      // Jika close terjadi bukan karena user mematikan (misal server mati), beri info
      if (isActive) addSystemLog("Disconnected from server."); 
    };

    ws.onerror = () => { 
      setIsConnected(false); 
      addSystemLog("Connection error occurred."); 
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [isActive]); // Re-run effect jika isActive berubah

  // Auto scroll logic
  useEffect(() => {
    if (!isCollapsed && !isPaused && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isCollapsed, isExpanded, isPaused]);

  // --- Helper Functions ---

  const addSystemLog = (msg: string) => {
    setLogs((prev) => [...prev, { timestamp: new Date().toISOString(), level: "SYSTEM", scope: "Client", message: msg }]);
  };

  const clearLogs = () => {
    setLogs([]);
    backlogRef.current = []; 
  };

  // Toggle Koneksi (ON/OFF)
  const toggleConnection = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isActive) {
        // Matikan
        setIsActive(false);
        setIsPaused(false); // Reset pause state
        isPausedRef.current = false;
        backlogRef.current = [];
        addSystemLog("Session stopped by user.");
    } else {
        // Nyalakan
        clearLogs(); // Optional: Bersihkan log lama saat start baru
        setIsActive(true);
    }
  };

  // Toggle Buffering (Pause Scrolling)
  const togglePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isActive) return;

    const nextState = !isPaused;
    setIsPaused(nextState);
    isPausedRef.current = nextState;

    // Flush backlog jika unpause
    if (!nextState && backlogRef.current.length > 0) {
      setLogs((prev) => [...prev, ...backlogRef.current]);
      backlogRef.current = []; 
      addSystemLog(`Resumed. Added ${backlogRef.current.length} buffered logs.`);
    }
  };

  const downloadLogs = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (logs.length === 0) return;

    const content = logs.map(log => {
      const time = log.timestamp ? new Date(log.timestamp).toLocaleString("id-ID") : "UNKNOWN TIME";
      const scopeStr = log.scope ? `[${log.scope}]` : "";
      return `[${time}] [${log.level?.toUpperCase()}] ${scopeStr} ${log.message}`;
    }).join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `server-logs-${new Date().toISOString().slice(0,19).replace(/:/g,"-")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getLevelStyle = (level: string) => {
    switch (level?.toUpperCase()) {
      case "INFO": return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800";
      case "WARN": return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800";
      case "ERROR": return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800";
      case "DEBUG": return "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800";
      default: return "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700";
    }
  };

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString("id-ID", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch { return "--:--"; }
  };

  // --- Render ---
  return (
    <div 
      className={`
        transition-all duration-300 ease-in-out flex flex-col
        border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden
        ${isExpanded ? "fixed inset-0 z-50 m-0 rounded-none" : "relative mt-6 rounded-2xl"}
        ${isCollapsed ? "h-14" : isExpanded ? "h-screen" : "h-[500px]"}
        bg-white/80 dark:bg-[#0f0f11]/90 backdrop-blur-xl
      `}
    >
      {/* Header Toolbar */}
      <div 
        className="flex items-center justify-between px-4 py-3 border-b border-gray-200/50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-white/5 cursor-pointer select-none"
        onClick={() => !isExpanded && setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg transition-colors ${
              isActive 
                ? (isConnected ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" : "bg-yellow-100 text-yellow-600")
                : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
            }`}>
            <Terminal size={16} />
          </div>
          <div className="flex flex-col">
            <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Server Console
            </h3>
            <div className="flex items-center gap-1.5">
              {!isActive ? (
                 <span className="text-[10px] font-medium text-gray-400">Offline (Standby)</span>
              ) : isPaused ? (
                 <span className="flex items-center gap-1 text-[10px] font-medium text-amber-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Buffering ({backlogRef.current.length})
                 </span>
              ) : (
                <>
                  <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`}></span>
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                    {isConnected ? "Live Streaming" : "Connecting..."}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
           {/* POWER BUTTON (Start/Stop Connection) */}
           <button 
            onClick={toggleConnection}
            className={`p-1.5 rounded-lg transition-colors mr-2 ${
              isActive 
                ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 bg-red-50/50 dark:bg-red-900/10" 
                : "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 bg-green-50/50 dark:bg-green-900/10"
            }`}
            title={isActive ? "Stop Connection" : "Start Connection"}
          >
            <Power size={16} strokeWidth={2.5} />
          </button>

           {/* Pause/Resume Button (Hanya aktif jika koneksi hidup) */}
           <button 
            onClick={togglePause}
            disabled={!isActive}
            className={`p-1.5 rounded-lg transition-colors ${
                !isActive ? "text-gray-300 dark:text-gray-700 cursor-not-allowed" :
                isPaused 
                    ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20" 
                    : "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            }`}
            title={isPaused ? "Resume Scrolling" : "Pause Scrolling"}
          >
            {isPaused ? <Play size={16} /> : <Pause size={16} />}
          </button>

          {/* Download Button */}
          <button 
            onClick={downloadLogs}
            disabled={logs.length === 0}
            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Download Logs"
          >
            <Download size={16} />
          </button>

          <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1"></div>

          {/* Clear Button */}
          <button 
            onClick={(e) => { e.stopPropagation(); clearLogs(); }}
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 size={16} />
          </button>

          <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1"></div>

          <button 
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); setIsCollapsed(false); }}
            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors hidden sm:block"
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

           <button 
            onClick={(e) => { e.stopPropagation(); setIsCollapsed(!isCollapsed); setIsExpanded(false); }}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
             {isCollapsed ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      {!isCollapsed && (
        <div className="flex-1 p-4 overflow-y-auto font-mono text-xs custom-scrollbar bg-white dark:bg-[#0f0f11] relative">
          
          {/* Overlay jika belum Start */}
          {!isActive && logs.length === 0 && (
             <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/50 dark:bg-[#0f0f11]/50 backdrop-blur-sm">
                <button 
                    onClick={toggleConnection}
                    className="flex flex-col items-center gap-3 group"
                >
                    <div className="p-4 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 group-hover:scale-110 transition-transform shadow-lg">
                        <Power size={32} />
                    </div>
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-black/40 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-800">
                        Klik untuk Memulai Live Logs
                    </span>
                </button>
             </div>
          )}

          {logs.length === 0 && isActive ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 gap-2">
              <Info size={32} className="opacity-50" />
              <span className="italic">Menunggu log masuk...</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              {logs.map((log, index) => (
                <div 
                  key={index} 
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
                >
                  <span className="text-gray-400 dark:text-gray-600 shrink-0 w-14 text-right select-none pt-0.5">
                    {formatTime(log.timestamp)}
                  </span>

                  <span 
                    className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getLevelStyle(log.level)} w-14 text-center flex items-center justify-center h-fit`}
                  >
                    {log.level?.toUpperCase().slice(0, 4)}
                  </span>

                  <div className="flex-1 min-w-0">
                    {log.scope && (
                        <span className="text-purple-600 dark:text-purple-400 font-bold mr-2 text-[11px]">
                            [{log.scope}]
                        </span>
                    )}
                    <span className="text-gray-700 dark:text-gray-300 break-all whitespace-pre-wrap leading-relaxed">
                      {log.message}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={logsEndRef} className="pt-2" />
            </div>
          )}
        </div>
      )}

        {/* Footer Info */}
        {!isCollapsed && (
             <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#151518] text-[10px] text-gray-500 flex justify-between items-center select-none">
                <div className="flex items-center gap-3">
                     <span>Total Events: {logs.length}</span>
                     {!isActive && <span className="text-red-500 flex items-center gap-1"><WifiOff size={10}/> Disconnected</span>}
                </div>
                
                <span className="flex items-center gap-1">
                    {isPaused && isActive ? (
                        <>
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> 
                            Paused ({backlogRef.current.length} hidden)
                        </>
                    ) : isActive ? (
                        <>
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> 
                            Realtime Mode
                        </>
                    ) : null}
                </span>
            </div>
        )}
    </div>
  );
};

export default LiveLogs;