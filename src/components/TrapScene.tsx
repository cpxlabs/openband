import { useRef, useState } from "react";
import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";

export function TrapScene() {
  const [triggered, setTriggered] = useState(false);
  const jaw1Ref = useRef<Mesh>(null);
  const jaw2Ref = useRef<Mesh>(null);
  const doneRef = useRef(false);

  useFrame(() => {
    if (!triggered || doneRef.current) return;
    const j1 = jaw1Ref.current;
    const j2 = jaw2Ref.current;
    if (!j1 || !j2) return;

    j1.rotation.x += (1.5 - j1.rotation.x) * 0.08;
    j2.rotation.x += (-1.5 - j2.rotation.x) * 0.08;

    if (
      Math.abs(j1.rotation.x - 1.5) < 0.01 &&
      Math.abs(j2.rotation.x + 1.5) < 0.01
    ) {
      doneRef.current = true;
    }
  });

  return (
    <group position={[0, -0.8, 0]}>
      <mesh
        name="trigger"
        position={[0, 0, 0]}
        onPointerDown={() => setTriggered(true)}
      >
        <boxGeometry args={[2, 0.2, 3]} />
        <meshStandardMaterial color="#88aaff" roughness={0.3} metalness={0.7} />
      </mesh>

      <mesh ref={jaw1Ref} position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[3, 0.15, 12, 24, Math.PI]} />
        <meshStandardMaterial color="#88aaff" roughness={0.3} metalness={0.7} />
      </mesh>

      <mesh ref={jaw2Ref} position={[0, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <torusGeometry args={[3, 0.15, 12, 24, Math.PI]} />
        <meshStandardMaterial color="#88aaff" roughness={0.3} metalness={0.7} />
      </mesh>

      <Text
        position={[0, 2.3, 0]}
        fontSize={0.8}
        color="#ff4466"
        font="https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json"
      >
        MISSÃO
      </Text>

      <ambientLight intensity={0.4} color="#404060" />
      <directionalLight position={[5, 10, 7]} intensity={2} />
      <directionalLight position={[-5, 0, 5]} intensity={0.5} color="#4488ff" />
    </group>
  );
}
