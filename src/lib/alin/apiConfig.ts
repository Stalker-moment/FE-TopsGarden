import { ApplianceInfo } from "@/types/alin";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://gardenapi.tierkun.my.id";

export const KOS_DEVICE_ID = "35e824b5-8bd4-4bc1-b023-a133f7388259";

export const PLN_RATE_PER_KWH = 1444.70;

export const KOS_APPLIANCES: ApplianceInfo[] = [
  {
    id: "kipas_angin",
    name: "Kipas Angin",
    category: "Motor Induktif AC",
    usagePattern: "Sangat Sering (Siang & Malam)",
    nominalWatt: 42.0,
    nominalVA: 44.0,
    nominalVAR: 13.0,
    expectedPf: 0.95,
    color: "#06b6d4",
    icon: "🌪️",
    description: "Beban motor induktif steady-state. Aktif berjam-jam secara terus menerus terutama di sore & malam hari."
  },
  {
    id: "charger_laptop",
    name: "Charger Laptop",
    category: "Switched-Mode Power Supply (SMPS)",
    usagePattern: "Jam Produktif / Belajar",
    nominalWatt: 52.0,
    nominalVA: 56.5,
    nominalVAR: 22.0,
    expectedPf: 0.92,
    color: "#6366f1",
    icon: "💻",
    description: "Adaptor SMPS 45W - 65W saat pengisian daya baterai dan sesi komputasi aktif."
  },
  {
    id: "charger_hp",
    name: "Charger HP",
    category: "USB-PD Fast Charge",
    usagePattern: "Intermiten / Pulsa Pengisian",
    nominalWatt: 20.0,
    nominalVA: 22.0,
    nominalVAR: 8.5,
    expectedPf: 0.92,
    color: "#f59e0b",
    icon: "📱",
    description: "Pengisian cepat smartphone dengan kurva stepped power (15W - 30W), menurun saat mendekati 100%."
  },
  {
    id: "pompa_galon_standby",
    name: "Charger Pompa Galon & Standby",
    category: "Beban Parasitik / Siaga",
    usagePattern: "Kontinu 24 Jam",
    nominalWatt: 3.5,
    nominalVA: 9.5,
    nominalVAR: 8.8,
    expectedPf: 0.37,
    color: "#10b981",
    icon: "🚰",
    description: "Charger pompa dispenser USB, lampu indikator colokan, dan rangkaian catu daya siaga."
  },
  {
    id: "setrika",
    name: "Setrika Listrik",
    category: "Pemanas Resistif Murni",
    usagePattern: "Sangat Jarang (Idle)",
    nominalWatt: 350.0,
    nominalVA: 350.0,
    nominalVAR: 2.0,
    expectedPf: 1.0,
    color: "#ef4444",
    icon: "👔",
    description: "Elemen pemanas resistif murni 300W - 400W dengan faktor daya uniter (cos phi ≈ 1.0)."
  }
];

