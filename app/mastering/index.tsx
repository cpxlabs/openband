import { useRouter } from 'expo-router';
import { MasteringSuite } from '../../src/components';

export default function MasteringScreen() {
  const router = useRouter();

  return (
    <MasteringSuite
      onBack={() => router.back()}
    />
  );
}
