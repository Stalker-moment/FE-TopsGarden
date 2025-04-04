// components/CoolerChart.tsx
"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import useIsDarkMode from "@/hooks/UseIsDarkMode";

Chart.register(LineElement, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend);

interface CoolerChartProps {
  coolerId: number;
  token: string;
}

interface ChartDataResponse {
  TimeChart: string[];
  Speed: number[];
  Mode: string[];
}

const CoolerChart: React.FC<CoolerChartProps> = ({ coolerId, token }) => {
  const [chartData, setChartData] = useState<ChartDataResponse>({
    TimeChart: [],
    Speed: [],
    Mode: [],
  });

  const ws = useRef<WebSocket | null>(null);
  const isDarkMode = useIsDarkMode(); // Menggunakan hook untuk mendeteksi dark mode

  useEffect(() => {
    const wsUrl = `wss://${process.env.NEXT_PUBLIC_HTTPS_API_URL}/ChartCooler?token=${token}&id=${coolerId}`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log(`WebSocket Chart Cooler ${coolerId} Terhubung.`);
    };

    ws.current.onmessage = (event) => {
      console.log(`Menerima data chart dari Cooler ${coolerId}:`, event.data);
      try {
        const data: ChartDataResponse = JSON.parse(event.data);
        setChartData(data);
      } catch (err) {
        console.error(`Error parsing chart data untuk Cooler ${coolerId}:`, err);
      }
    };

    ws.current.onerror = (error) => {
      console.error(`WebSocket Chart Cooler ${coolerId} Error:`, error);
    };

    ws.current.onclose = (event) => {
      console.log(`WebSocket Chart Cooler ${coolerId} Ditutup:`, event.reason);
    };

    // Cleanup saat komponen unmount
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [coolerId, token]);

  const data = useMemo(() => ({
    labels: chartData.TimeChart,
    datasets: [
      {
        label: "Speed (%)",
        data: chartData.Speed,
        fill: false,
        backgroundColor: "rgba(59, 130, 246, 0.5)", // Biru Tailwind
        borderColor: "rgba(59, 130, 246, 1)", // Biru Tailwind
        tension: 0.1,
      },
      // Tambahkan dataset lain jika diperlukan
    ],
  }), [chartData]);

  const options = useMemo(() => ({
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: isDarkMode ? "#ffffff" : "#000000", // Menyesuaikan warna teks legenda
        },
      },
      title: {
        display: true,
        text: "Speed Cooler",
        color: isDarkMode ? "#ffffff" : "#000000", // Menyesuaikan warna judul
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)',
        titleColor: isDarkMode ? '#000000' : '#ffffff',
        bodyColor: isDarkMode ? '#000000' : '#ffffff',
      },
    },
    scales: {
      x: {
        ticks: {
          color: isDarkMode ? "#ffffff" : "#000000", // Menyesuaikan warna teks sumbu X
        },
        grid: {
          color: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0, 0, 0, 0.1)", // Menyesuaikan warna grid sumbu X
        },
      },
      y: {
        ticks: {
          color: isDarkMode ? "#ffffff" : "#000000", // Menyesuaikan warna teks sumbu Y
          beginAtZero: true,
          max: 100,
        },
        grid: {
          color: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0, 0, 0, 0.1)", // Menyesuaikan warna grid sumbu Y
        },
      },
    },
  }), [isDarkMode]);

  return (
    <div className="mt-4">
      <Line data={data} options={options} />
    </div>
  );
};

export default CoolerChart;
