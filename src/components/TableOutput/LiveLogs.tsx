"use client";
import React, { useEffect, useState, useRef } from "react";
import Cookies from "js-cookie";
import { 
  Terminal, Maximize2, Minimize2, Trash2, ChevronDown, ChevronUp, 
  Play, Pause, Download, Power, WifiOff, Activity, Server 
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
  const [isActive, setIsActive] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [logsPerSecond, setLogsPerSecond] = useState(0);
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef(false); 
  const backlogRef = useRef<LogEntry[]>([]);
  const incomingCounterRef = useRef(0);

  // --- Speedometer Logs ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) {
      interval = setInterval(() => {
        setLogsPerSecond(incomingCounterRef.current);
        incomingCounterRef.current = 0;
      }, 1000);
    } else {
      setLogsPerSecond(0);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  // --- WebSocket Logic ---
  useEffect(() => {
    if (!isActive) {
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      setIsConnected(false);
      return;
    }

    const token = Cookies.get("userAuth");
    if (!token || !HTTPSAPIURL) {
        addSystemLog("Error: Missing API Config");
        return;
    }

    const host = HTTPSAPIURL.replace(/^https?:\/\//, "");
    const wsUrl = `wss://${host}/logs?token=${token}`;
    
    addSystemLog("Connecting to WebSocket...");
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => { setIsConnected(true); addSystemLog(`Connected securely.`); };
    ws.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        let newLogs: LogEntry[] = [];
        if (response.type === "snapshot" && Array.isArray(response.logs)) newLogs = response.logs;
        else if (response.type === "log" && response.data) newLogs = [response.data];

        if (newLogs.length > 0) {
          incomingCounterRef.current += newLogs.length;
          if (isPausedRef.current) backlogRef.current = [...backlogRef.current, ...newLogs];
          else setLogs((prev) => [...prev, ...newLogs]);
        }
      } catch (error) { addSystemLog("Parse Error: " + String(event.data)); }
    };
    ws.onclose = () => { setIsConnected(false); if (isActive) addSystemLog("Disconnected."); };
    ws.onerror = () => { setIsConnected(false); addSystemLog("Connection error."); };

    return () => { if (ws.readyState === 1) ws.close(); };
  }, [isActive]);

  useEffect(() => {
    if (!isCollapsed && !isPaused && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isCollapsed, isExpanded, isPaused]);

  // --- Actions ---
  const addSystemLog = (msg: string) => setLogs((prev) => [...prev, { timestamp: new Date().toISOString(), level: "SYSTEM", scope: "Client", message: msg }]);
  const clearLogs = () => { setLogs([]); backlogRef.current = []; };
  
  const toggleConnection = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isActive) {
        setIsActive(false); setIsPaused(false); isPausedRef.current = false; backlogRef.current = [];
    } else {
        clearLogs(); setIsActive(true);
    }
  };

  const togglePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isActive) return;
    const nextState = !isPaused;
    setIsPaused(nextState); isPausedRef.current = nextState;
    if (!nextState && backlogRef.current.length > 0) {
      setLogs((prev) => [...prev, ...backlogRef.current]);
      backlogRef.current = [];
    }
  };

  const downloadLogs = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (logs.length === 0) return;
    const content = logs.map(l => `[${l.timestamp}] [${l.level}] ${l.message}`).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
    link.download = `logs-${Date.now()}.txt`;
    link.click();
  };

  const formatTime = (iso: string) => {
      try { return new Date(iso).toLocaleTimeString("id-ID", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }); } catch { return "--:--"; }
  };

  const getLevelColor = (level: string) => {
      switch(level?.toUpperCase()){
          case 'INFO': return 'text-blue-500';
          case 'WARN': return 'text-yellow-500';
          case 'ERROR': return 'text-red-500';
          case 'SYSTEM': return 'text-green-500';
          default: return 'text-gray-500';
      }
  };

  // --- Render ---
  return (
    <div className={`
        flex flex-col transition-all duration-300 border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden
        ${isExpanded ? "fixed inset-0 z-50 bg-white dark:bg-[#0f0f11]" : "relative mt-8 rounded-2xl bg-white dark:bg-[#0f0f11]"}
        ${isCollapsed ? "h-16" : isExpanded ? "h-screen" : "h-[500px]"}
    `}>
      {/* --- Header --- */}
      <div 
        className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5 cursor-pointer select-none"
        onClick={() => !isExpanded && setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-xl transition-colors ${isActive ? (isConnected ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600") : "bg-gray-200 text-gray-500"}`}>
            <Terminal size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Server Console
                {isActive && isPaused && <span className="px-2 py-0.5 rounded text-[10px] bg-yellow-100 text-yellow-700 font-extrabold uppercase">Paused</span>}
            </h3>
            <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
               <span className={`w-1.5 h-1.5 rounded-full ${isActive ? (isConnected ? "bg-green-500 animate-pulse" : "bg-red-500") : "bg-gray-400"}`}></span>
               {isActive ? (isConnected ? `Live - ${logsPerSecond} events/s` : "Connecting...") : "Offline"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
           <ControlButton onClick={toggleConnection} active={isActive} color="red" icon={Power} />
           <ControlButton onClick={togglePause} active={isPaused} disabled={!isActive} color="yellow" icon={isPaused ? Play : Pause} />
           <div className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-1"></div>
           <ControlButton onClick={downloadLogs} disabled={logs.length === 0} color="blue" icon={Download} />
           <ControlButton onClick={(e: { stopPropagation: () => void; }) => { e.stopPropagation(); clearLogs(); }} color="gray" icon={Trash2} />
           <div className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-1"></div>
           <ControlButton onClick={(e: { stopPropagation: () => void; }) => { e.stopPropagation(); setIsExpanded(!isExpanded); setIsCollapsed(false); }} color="gray" icon={isExpanded ? Minimize2 : Maximize2} />
           <ControlButton onClick={(e: { stopPropagation: () => void; }) => { e.stopPropagation(); setIsCollapsed(!isCollapsed); setIsExpanded(false); }} color="gray" icon={isCollapsed ? ChevronUp : ChevronDown} />
        </div>
      </div>

      {/* --- Body --- */}
      {!isCollapsed && (
        <div className="flex-1 relative bg-[#0c0c0e] font-mono text-xs overflow-hidden">
             {!isActive && logs.length === 0 && (
                 <div className="absolute inset-0 flex items-center justify-center flex-col text-gray-600">
                     <Server size={40} className="mb-3 opacity-20"/>
                     <p>Console Disconnected</p>
                 </div>
             )}
             
             <div className="h-full overflow-y-auto p-4 space-y-1 custom-scrollbar">
                 {logs.map((log, idx) => (
                     <div key={idx} className="flex gap-3 hover:bg-white/5 p-0.5 rounded px-2 transition-colors">
                         <span className="text-gray-500 shrink-0 select-none">{formatTime(log.timestamp)}</span>
                         <span className={`font-bold shrink-0 w-12 text-center ${getLevelColor(log.level)}`}>{log.level}</span>
                         <span className="text-gray-300 break-all">{log.scope && <span className="text-gray-500 mr-2">[{log.scope}]</span>}{log.message}</span>
                     </div>
                 ))}
                 <div ref={logsEndRef}></div>
             </div>
        </div>
      )}

      {/* --- Footer --- */}
      {!isCollapsed && (
          <div className="bg-gray-50 dark:bg-[#111] border-t border-gray-100 dark:border-gray-800 px-4 py-1.5 text-[10px] text-gray-500 flex justify-between">
              <span>Total Logs: {logs.length}</span>
              <span>{isPaused ? `${backlogRef.current.length} logs buffered` : 'Realtime Mode'}</span>
          </div>
      )}
    </div>
  );
};

const ControlButton = ({ onClick, active, disabled, color, icon: Icon }: any) => (
    <button 
        onClick={onClick} 
        disabled={disabled}
        className={`p-1.5 rounded-lg transition-all ${
            disabled ? "opacity-30 cursor-not-allowed" : 
            active ? `bg-${color}-100 text-${color}-600` : 
            "text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10"
        }`}
    >
        <Icon size={16} strokeWidth={2} />
    </button>
);

export default LiveLogs;