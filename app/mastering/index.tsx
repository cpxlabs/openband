import { useRouter, useLocalSearchParams } from 'expo-router';
import { MasteringSuite } from '../../src/components';

export default function MasteringScreen() {
  const router = useRouter();
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();

  return (
    <MasteringSuite
      initialProjectId={projectId}
      onBack={() => router.back()}
    />
  );
}
