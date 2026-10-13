import dynamic from 'next/dynamic';

const MapView = dynamic(
  () => import('@/components/map/map-view').then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-full items-center justify-center font-medium text-muted-foreground">
        Loading interactive map...
      </div>
    ),
  }
);

export default function MapPage() {
  return <MapView />;
}
