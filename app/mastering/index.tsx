import { useRouter, useLocalSearchParams } from 'expo-router';
import { MasteringSuite } from '../../src/components/MasteringSuite';
import type { Plugin } from '../../src/lib/types';

export default function MasteringScreen() {
  const router = useRouter();
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();

  const handleExport = (plugins: Plugin[], format: { type: 'wav' | 'mp3'; bitDepth?: number; sampleRate: number }) => {
    console.log('Exporting master with plugins:', plugins.length, 'format:', format.type);
  };

  return (
    <MasteringSuite
      initialProjectId={projectId}
      onBack={() => router.back()}
      onExport={handleExport}
    />
  );
}
