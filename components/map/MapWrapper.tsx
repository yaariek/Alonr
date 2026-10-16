'use client';

import dynamic from 'next/dynamic';
import { PageHeading } from '@/components/page-heading';

const MapView = dynamic(
  () => import('@/components/map/map-view').then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center font-medium text-muted-foreground">
        Loading interactive map...
      </div>
    ),
  }
);

export function MapWrapper() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-4 py-3 sm:px-6">
        <PageHeading title="Explore the map" tagline="Browse student accommodation across London." />
      </div>
      <div className="min-h-0 flex-1">
        <MapView />
      </div>
    </div>
  );
}
