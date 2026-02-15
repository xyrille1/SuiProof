'use client';

import { useState } from 'react';
import type { MediaManifest } from '@/lib/data';
import { mediaManifests } from '@/lib/data';
import { Header } from '@/components/header';
import { DashboardView } from '@/components/dashboard-view';
import { VerifierView } from '@/components/verifier-view';
import { ManifestModal } from '@/components/manifest-modal';

export type View = 'dashboard' | 'verify';

export default function Home() {
  const [view, setView] = useState<View>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedManifest, setSelectedManifest] = useState<MediaManifest | null>(
    null
  );

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

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header currentView={view} onNavigate={setView} />
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {view === 'dashboard' && <DashboardView onViewManifest={handleViewManifest} />}
        {view === 'verify' && <VerifierView />}
      </main>
      {isModalOpen && selectedManifest && (
        <ManifestModal manifest={selectedManifest} onClose={handleCloseModal} />
      )}
    </div>
  );
}
