"use client";

import React, { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { KOS_APPLIANCES } from "@/lib/alin/apiConfig";
import { FaBookOpen, FaLightbulb, FaCheck, FaExclamationCircle } from "react-icons/fa";
import { MdFunctions, MdElectricalServices } from "react-icons/md";

function MathBlock({ formula }: { formula: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(formula, containerRef.current, {
          displayMode: true,
          throwOnError: false,
        });
      } catch (err) {
        if (containerRef.current) containerRef.current.innerText = formula;
      }
    }
  }, [formula]);

  return <div ref={containerRef} className="py-2 overflow-x-auto text-blue-600 dark:text-blue-400" />;
}

function InlineMath({ formula }: { formula: string }) {
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (spanRef.current) {
      try {
        katex.render(formula, spanRef.current, {
          displayMode: false,
          throwOnError: false,
        });
      } catch (err) {
        if (spanRef.current) spanRef.current.innerText = formula;
      }
    }
  }, [formula]);

  return <span ref={spanRef} className="font-semibold text-blue-600 dark:text-blue-400" />;
}

export default function TeoriALIN() {
  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="rounded-3xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 p-6 md:p-8 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 text-2xl">
            <MdFunctions />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-gray-800 dark:text-white tracking-tight">
              Landasan Teori Aljabar Linear (ALIN): Non-Intrusive Load Monitoring (NILM)
            </h2>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
              Penerapan Faktorisasi Matriks Non-Negatif (NMF) untuk Memisahkan Daya Agregat Listrik Kamar Kos
            </p>
          </div>
        </div>

        <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
          Dalam sistem kelistrikan satu fasa, sensor PZEM-004T yang terpasang di MCB kamar kos hanya mencatat total daya agregat gabungan seluruh peralatan yang menyala secara simultan. Untuk mengetahui konsumsi masing-masing alat tanpa memasang sensor pada tiap colokan (<InlineMath formula="\text{Non-Intrusive}" />), digunakan metode dekomposisi matriks Aljabar Linear yaitu <strong>Non-Negative Matrix Factorization (NMF)</strong>.
        </p>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Formulasi Matematika */}
        <div className="rounded-3xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 p-6 md:p-8 shadow-lg space-y-5">
          <div className="flex items-center gap-2.5 text-base md:text-lg font-bold text-gray-800 dark:text-white">
            <FaBookOpen className="text-blue-500" />
            <h3>1. Formulasi Matriks Daya Agregat</h3>
          </div>

          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Misalkan telemetri sensor terdiri dari <InlineMath formula="N" /> langkah waktu dan <InlineMath formula="M = 3" /> fitur kelistrikan: Daya Nyata (<InlineMath formula="P" /> [Watt]), Daya Semu (<InlineMath formula="S" /> [VA]), dan Daya Reaktif (<InlineMath formula="Q" /> [VAR]). Matriks observasi non-negatif <InlineMath formula="\mathbf{V} \in \mathbb{R}_{\ge 0}^{N \times M}" /> didekomposisi menjadi dua matriks berdimensi rendah:
          </p>

          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200/80 dark:border-gray-700/80">
            <MathBlock formula="\mathbf{V}_{N \times M} \approx \mathbf{W}_{N \times K} \times \mathbf{H}_{K \times M}" />
          </div>

          <ul className="text-xs md:text-sm text-gray-600 dark:text-gray-300 space-y-2 list-disc pl-5">
            <li>
              <strong><InlineMath formula="\mathbf{W} \in \mathbb{R}_{\ge 0}^{N \times K}" /></strong>: Matriks Aktivasi Beban, mewakili fraksi pengoperasian atau koefisien daya dari <InlineMath formula="K = 5" /> peralatan pada setiap langkah waktu <InlineMath formula="t" />.
            </li>
            <li>
              <strong><InlineMath formula="\mathbf{H} \in \mathbb{R}_{\ge 0}^{K \times M}" /></strong>: Matriks Tanda Tangan Listrik (Basis Beban), memuat daya nominal dan karakteristik impedansi tiap alat kos.
            </li>
            <li>
              <strong>Kendala Non-Negatif</strong>: Daya listrik tidak bernilai negatif (<InlineMath formula="W_{ik} \ge 0, H_{kj} \ge 0" />), menjamin interpretasi fisik peralatan listrik yang nyata.
            </li>
          </ul>
        </div>

        {/* Column 2: Fungsi Tujuan & Update Rules */}
        <div className="rounded-3xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 p-6 md:p-8 shadow-lg space-y-5">
          <div className="flex items-center gap-2.5 text-base md:text-lg font-bold text-gray-800 dark:text-white">
            <FaLightbulb className="text-amber-500" />
            <h3>2. Optimasi & Multiplicative Update Rules</h3>
          </div>

          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Faktorisasi dicapai dengan meminimalkan norma Frobenius (jarak kuadrat Euclidean) antara matriks observasi <InlineMath formula="\mathbf{V}" /> dan aproksimasi <InlineMath formula="\mathbf{WH}" />:
          </p>

          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200/80 dark:border-gray-700/80">
            <MathBlock formula="\min_{\mathbf{W} \ge 0, \mathbf{H} \ge 0} \mathcal{L}(\mathbf{W}, \mathbf{H}) = \frac{1}{2} \|\mathbf{V} - \mathbf{WH}\|_F^2 = \frac{1}{2} \sum_{i=1}^{N} \sum_{j=1}^{M} \left( V_{ij} - [\mathbf{WH}]_{ij} \right)^2" />
          </div>

          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Pembaruan parameter dilakukan dengan aturan perkalian Lee & Seung (2001) yang menjamin sifat non-negatif secara intrinsik tanpa step-size manual:
          </p>

          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200/80 dark:border-gray-700/80 space-y-2">
            <MathBlock formula="\mathbf{W} \leftarrow \mathbf{W} \odot \frac{\mathbf{V}\mathbf{H}^T}{\mathbf{W}\mathbf{H}\mathbf{H}^T + \varepsilon}" />
            <MathBlock formula="\mathbf{H} \leftarrow \mathbf{H} \odot \frac{\mathbf{W}^T\mathbf{V}}{\mathbf{W}^T\mathbf{W}\mathbf{H} + \varepsilon}" />
          </div>
        </div>
      </div>

      {/* Row 3: Tabel Tanda Tangan Listrik 5 Peralatan Kos */}
      <div className="rounded-3xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 p-6 md:p-8 shadow-lg">
        <div className="flex items-center gap-2.5 text-base md:text-lg font-bold text-gray-800 dark:text-white mb-4">
          <MdElectricalServices className="text-emerald-500 text-xl" />
          <h3>3. Tanda Tangan Listrik (Matriks H) 5 Peralatan Kos Terverifikasi</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-semibold">
                <th className="py-3 px-3">Peralatan</th>
                <th className="py-3 px-3">Kategori Beban</th>
                <th className="py-3 px-3 text-right">Daya Nyata P (W)</th>
                <th className="py-3 px-3 text-right">Daya Semu S (VA)</th>
                <th className="py-3 px-3 text-right">Daya Reaktif Q (VAR)</th>
                <th className="py-3 px-3 text-right">Faktor Daya (cos φ)</th>
                <th className="py-3 px-3">Karakteristik Operasional</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
              {KOS_APPLIANCES.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30">
                  <td className="py-3.5 px-3 font-semibold flex items-center gap-2">
                    <span className="text-base">{app.icon}</span>
                    <span style={{ color: app.color }}>{app.name}</span>
                  </td>
                  <td className="py-3.5 px-3 text-gray-500 dark:text-gray-400">{app.category}</td>
                  <td className="py-3.5 px-3 text-right font-mono font-bold">{app.nominalWatt.toFixed(1)}</td>
                  <td className="py-3.5 px-3 text-right font-mono">{app.nominalVA.toFixed(1)}</td>
                  <td className="py-3.5 px-3 text-right font-mono">{app.nominalVAR.toFixed(1)}</td>
                  <td className="py-3.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    {app.expectedPf.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-3 text-xs text-gray-500 dark:text-gray-400">{app.usagePattern}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 4: Konservasi Daya Listrik */}
      <div className="rounded-3xl bg-blue-50/60 dark:bg-blue-900/10 border border-blue-200/60 dark:border-blue-800/40 p-6 md:p-8">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-blue-500 text-white shrink-0">
            <FaCheck />
          </div>
          <div>
            <h4 className="text-base md:text-lg font-bold text-gray-900 dark:text-white">
              Prinsip Konservasi Daya & Normalisasi Residual
            </h4>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed">
              Hasil estimasi dari perkalian baris matriks <InlineMath formula="\hat{P}_i = \sum_{k=1}^5 W_{ik} H_{k1}" /> selalu dinormalisasikan terhadap daya nyata terukur sensor <InlineMath formula="P_{\text{ukur}, i}" />. Ini menjamin bahwa jumlah daya tiap peralatan kos pada setiap titik waktu selalu tepat sama dengan daya yang dibaca oleh meteran PLN / PZEM (<InlineMath formula="\sum_{k=1}^5 P_{k, t} = P_{\text{total}, t}" />), sehingga perhitungan biaya tagihan listrik (Rp 1.444,70 / kWh) terbukti presisi 100% dan bebas dari penyimpangan energi virtual.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

