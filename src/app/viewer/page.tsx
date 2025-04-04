"use client";
import React, { useEffect, useRef } from "react";

// Deklarasikan properti global untuk menghindari error pada TypeScript
declare global {
  interface Window {
    Autodesk: any;
  }
}

const AutodeskViewer: React.FC = () => {
  const viewerDivRef = useRef<HTMLDivElement>(null);
  const viewerInstanceRef = useRef<any>(null);

  // Fungsi untuk memuat script secara dinamis
  const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => {
        console.log(`Script ${src} loaded successfully.`);
        resolve();
      };
      script.onerror = () =>
        reject(new Error(`Gagal memuat script: ${src}`));
      document.body.appendChild(script);
    });
  };

  useEffect(() => {
    const initializeViewer = async () => {
      try {
        // Muat script Autodesk Viewer jika belum ada
        if (!window.Autodesk) {
          await loadScript(
            "https://developer.api.autodesk.com/modelderivative/v2/viewers/viewer3D.min.js"
          );
        }

        // Pastikan access token valid dengan scope 'viewables:read'
        const options = {
          env: "AutodeskProduction",
          accessToken:
            "eyJhbGciOiJSUzI1NiIsImtpZCI6IlhrUFpfSmhoXzlTYzNZS01oRERBZFBWeFowOF9SUzI1NiIsInBpLmF0bSI6ImFzc2MifQ.eyJzY29wZSI6WyJidWNrZXQ6Y3JlYXRlIiwiYnVja2V0OnJlYWQiLCJkYXRhOnJlYWQiLCJkYXRhOmNyZWF0ZSIsImRhdGE6d3JpdGUiXSwiY2xpZW50X2lkIjoiQ1VYNE1TMDdXSExKdkI4MkF0VkVabjJDbWlUVXFrdkdhdDdqR0c5Z3N2SDBDVUZsIiwiaXNzIjoiaHR0cHM6Ly9kZXZlbG9wZXIuYXBpLmF1dG9kZXNrLmNvbSIsImF1ZCI6Imh0dHBzOi8vYXV0b2Rlc2suY29tIiwianRpIjoiWGlOcTh6QkU4R3ZMR0hpQTY5SVQ3QTVhYXVQa2xpMDlvMzFXcURuQ2pVODRDS0l0Z1ZSYzJPdXpRRVBKRHdKRiIsImV4cCI6MTczOTY3OTEzM30.VcKsaZP5Uf75_z5JV-QDhN1o_gQoxFqSIRQHeWHXL6PwAAgpUq_LxpAh41nzbXti52hDvYddSr657dP3Hj7vOTeO15nmmhyjcRNad6nfPouwp04ZKtLyKCXfGQz2fVwQTSJRLGEaRc287h9QSUEv1fKE3t8YRToXkIdUJE9eu1oxr9O5X09_JSiyLsIw-WBWmz_pnUQUTc8d5_RMS5VTtp4vCp_IuKxcPXJSmvt3bjDWNhipiyLAY3X7I6hmyhjOX8TL8q4aVWMr9kNEv4Xwv6wSHH3CdPUoylgls_fkYxBDU-QUV3f88Hu76cqO34hLtNcXWe-X2Y5W62IsgPfY9g", // Ganti dengan access token Anda dengan scope viewables:read
        };

        window.Autodesk.Viewing.Initializer(options, () => {
          if (viewerDivRef.current) {
            const viewer = new window.Autodesk.Viewing.GuiViewer3D(
              viewerDivRef.current
            );
            viewer.start();
            viewerInstanceRef.current = viewer;

            // Pastikan objectId sudah benar, dan lakukan encoding Base64
            const objectId =
              "urn:adsk.objects:os.object:cux4ms07whljvb82atvezn2cmituqkvgat7jgg9gsvh0cufl-myforgebucket/gripper.dwg";
            // Encode dengan btoa() di browser
            const encodedUrn = btoa(objectId);
            console.log("ObjectId:", objectId);
            console.log("Encoded URN:", encodedUrn);

            // Muat dokumen menggunakan URN yang sudah di-encode
            window.Autodesk.Viewing.Document.load(
              encodedUrn,
              (doc: any) => {
                console.log("Dokumen berhasil dimuat:", doc);
                // Cari viewable geometry di dalam dokumen
                const viewables = window.Autodesk.Viewing.Document.getSubItemsWithProperties(
                  doc.getRoot(),
                  { type: "geometry" },
                  true
                );
                if (viewables.length === 0) {
                  console.error("Dokumen tidak mengandung viewable.");
                  return;
                }
                const initialViewable = viewables[0];
                viewer
                  .loadDocumentNode(doc, initialViewable)
                  .then(() => {
                    console.log("Model berhasil dimuat.");
                  })
                  .catch((err: any) => {
                    console.error("Gagal memuat model:", err);
                  });
              },
              (errorCode: any, errorMsg: any) => {
                console.error("Gagal memuat dokumen:", errorMsg);
              }
            );
          } else {
            console.error("Viewer container tidak ditemukan.");
          }
        });
      } catch (error) {
        console.error("Error in initializeViewer:", error);
      }
    };

    initializeViewer();

    // Cleanup saat komponen unmount
    return () => {
      if (viewerInstanceRef.current) {
        viewerInstanceRef.current.finish();
      }
    };
  }, []);

  return (
    <div>
      <h1>Autodesk 3D Viewer</h1>
      <div
        ref={viewerDivRef}
        style={{ width: "100%", height: "600px", border: "1px solid #ccc" }}
      />
    </div>
  );
};

export default AutodeskViewer;