'use client';

import { useState } from 'react';
import type { MediaManifest } from '@/lib/data';
import { mediaManifests as initialMediaManifests } from '@/lib/data';
import { Header } from '@/components/header';
import { DashboardView } from '@/components/dashboard-view';
import { VerifierView } from '@/components/verifier-view';
import { ManifestModal } from '@/components/manifest-modal';
import blake2b from 'blake2b';

export type View = 'dashboard' | 'verify';

export default function Home() {
  const [view, setView] = useState<View>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedManifest, setSelectedManifest] = useState<MediaManifest | null>(
    null
  );
  const [mediaManifests, setMediaManifests] = useState<MediaManifest[]>(initialMediaManifests);

  const handleViewManifest = (provenanceId: string) => {
    const manifest = mediaManifests.find((m) => m.provenanceId === provenanceId);
    if (manifest) {
      setSelectedManifest(manifest);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedManifest(null);
  };

  const handleCreateAnchor = (file: File, gps: string, agencyId: string) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const fileContent = event.target?.result;
      if (fileContent) {
        const hash = blake2b(64).update(new Uint8Array(fileContent as ArrayBuffer)).digest('hex');
        const newManifest: MediaManifest = {
          id: (mediaManifests.length + 1).toString(),
          fileName: file.name,
          type: 'image',
          status: 'Verified',
          provenanceId: `0x${Math.random().toString(16).slice(2)}...${Math.random().toString(16).slice(2, 6)}`,
          captured: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          description: '"Original Master"',
          imageSrc: URL.createObjectURL(file),
          imageHint: 'A newly uploaded image',
          modalImageSrc: URL.createObjectURL(file),
          modalImageHint: 'A newly uploaded image',
          metadata: {
            gps: gps || 'N/A',
            agencyId: agencyId || 'N/A',
            contentHash: hash,
            captureDate: new Date().toUTCString(),
          },
        };
        setMediaManifests([newManifest, ...mediaManifests]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header currentView={view} onNavigate={setView} />
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {view === 'dashboard' && <DashboardView onViewManifest={handleViewManifest} mediaManifests={mediaManifests} onCreateAnchor={handleCreateAnchor} />}
        {view === 'verify' && <VerifierView />}
      </main>
      {isModalOpen && selectedManifest && (
        <ManifestModal manifest={selectedManifest} onClose={handleCloseModal} />
      )}
    </div>
  );
}
