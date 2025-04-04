// src/components/3Dviewer/autodeskviewer.tsx

'use client';

import { useEffect, useRef } from 'react';
import axios from 'axios';

interface AutodeskViewerProps {
  urn: string;
}

declare global {
  interface Window {
    Autodesk: any;
  }
}

const AutodeskViewer: React.FC<AutodeskViewerProps> = ({ urn }) => {
  const viewerDiv = useRef<HTMLDivElement | null>(null);
  const viewer = useRef<any>(null);

  useEffect(() => {
    const initializeViewer = async () => {
      try {
        // Ambil token akses dari rute API menggunakan POST
        const tokenResponse = await axios.post<{ access_token: string }>('/api/forge/oauth/token', {});
        const { access_token } = tokenResponse.data;

        const options = {
          env: 'AutodeskProduction',
          accessToken: access_token,
        };

        // Inisialisasi Autodesk Viewer
        window.Autodesk.Viewing.Initializer(options, () => {
          viewer.current = new window.Autodesk.Viewing.GuiViewer3D(viewerDiv.current, {});
          const started = viewer.current.start();
          if (!started) {
            console.error('Gagal menginisialisasi viewer.');
            return;
          }

          // Muat model
          const documentId = `urn:${urn}`;
          window.Autodesk.Viewing.Document.load(
            documentId,
            (doc: any) => {
              const geometryItems = window.Autodesk.Viewing.Document.getSubItemsWithProperties(
                doc.getRootItem(),
                { type: 'geometry' },
                true
              );

              if (geometryItems.length === 0) {
                console.error('Tidak ada geometri yang dapat ditampilkan.');
                return;
              }

              viewer.current.loadDocumentNode(doc, geometryItems[0]);
            },
            (errorMsg: any) => {
              console.error('Error loading document:', errorMsg);
            }
          );
        });
      } catch (error) {
        console.error('Error initializing Autodesk Viewer:', error);
      }
    };

    if (urn) {
      initializeViewer();
    }

    // Cleanup saat komponen di-unmount
    return () => {
      if (viewer.current) {
        viewer.current.finish();
        viewer.current = null;
      }
    };
  }, [urn]);

  return (
    <div
      ref={viewerDiv}
      style={{ width: '100%', height: '100vh', backgroundColor: '#aaaaaa' }}
    ></div>
  );
};

export default AutodeskViewer;