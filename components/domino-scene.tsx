"use client"

import { useRef, useEffect, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { RoundedBox, OrbitControls, Environment } from "@react-three/drei"
import { Physics, RigidBody, CuboidCollider } from "@react-three/rapier"
import type { RapierRigidBody } from "@react-three/rapier"

interface DominoProps {
  position: [number, number, number]
  rotation: [number, number, number]
  opacity: number
}

function DominoBox({ position, rotation, opacity }: DominoProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null)

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={position}
      rotation={rotation}
      colliders={false}
      restitution={0.2}
      friction={0.8}
      linearDamping={0.4}
      angularDamping={0.3}
      mass={0.5}
    >
      <CuboidCollider args={[0.25, 0.5, 0.1]} />

      <group>
        <RoundedBox args={[0.5, 1, 0.2]} radius={0.03} smoothness={8} castShadow receiveShadow>
          <meshPhysicalMaterial
            color="#F2F7F7"
            roughness={0.2}
            metalness={0.1}
            clearcoat={0.4}
            clearcoatRoughness={0.15}
            envMapIntensity={2.5}
            transparent
            opacity={opacity}
          />
        </RoundedBox>

        <mesh position={[0, 0, 0.108]}>
          <boxGeometry args={[0.5, 0.015, 0.001]} />
          <meshStandardMaterial
            color="#1a1a2e"
            roughness={0.8}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
            transparent
            opacity={opacity}
          />
        </mesh>

        <group position={[0, 0.25, 0.108]}>
          {Array.from({ length: Math.floor(Math.random() * 6) + 1 }).map((_, i) => {
            const positions = [
              [0, 0],
              [-0.1, 0.1],
              [0.1, -0.1],
              [-0.1, 0.1],
              [0, 0],
              [0.1, -0.1],
            ]
            const dotCount = Math.floor(Math.random() * 6) + 1
            if (i >= dotCount) return null

            const [x, y] = positions[i] || [0, 0]
            return (
              <mesh key={i} position={[x, y, 0]} castShadow>
                <sphereGeometry args={[0.035, 16, 16]} />
                <meshStandardMaterial
                  color="#1a1a2e"
                  roughness={0.9}
                  polygonOffset
                  polygonOffsetFactor={-1}
                  polygonOffsetUnits={-1}
                  transparent
                  opacity={opacity}
                />
              </mesh>
            )
          })}
        </group>

        <group position={[0, -0.25, 0.108]}>
          {Array.from({ length: Math.floor(Math.random() * 6) + 1 }).map((_, i) => {
            const positions = [
              [0, 0],
              [-0.1, 0.1],
              [0.1, -0.1],
              [-0.1, 0.1],
              [0, 0],
              [0.1, -0.1],
            ]
            const dotCount = Math.floor(Math.random() * 6) + 1
            if (i >= dotCount) return null

            const [x, y] = positions[i] || [0, 0]
            return (
              <mesh key={i} position={[x, y, 0]} castShadow>
                <sphereGeometry args={[0.035, 16, 16]} />
                <meshStandardMaterial
                  color="#1a1a2e"
                  roughness={0.9}
                  polygonOffset
                  polygonOffsetFactor={-1}
                  polygonOffsetUnits={-1}
                  transparent
                  opacity={opacity}
                />
              </mesh>
            )
          })}
        </group>
      </group>
    </RigidBody>
  )
}

function DominoSpawner({ onShake, shakeDetected }: { onShake: () => void; shakeDetected: boolean }) {
  const [dominoes, setDominoes] = useState<
    Array<{ id: number; position: [number, number, number]; rotation: [number, number, number]; opacity: number }>
  >([])
  const dominoIdCounter = useRef(0)
  const lastSpawnTime = useRef(0)
  const rigidBodiesRef = useRef<Array<RapierRigidBody | null>>([])

  useEffect(() => {
    if (typeof window !== "undefined" && "DeviceMotionEvent" in window) {
      if (typeof (DeviceMotionEvent as any).requestPermission === "function") {
        const button = document.createElement("button")
        button.textContent = "Enable Shake Detection"
        button.style.cssText = `
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          padding: 12px 24px;
          background: #1a1a2e;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
        `
        button.onclick = async () => {
          try {
            const permission = await (DeviceMotionEvent as any).requestPermission()
            if (permission === "granted") {
              button.remove()
              setupShakeDetection()
            }
          } catch (error) {
            console.error("Permission denied:", error)
          }
        }
        document.body.appendChild(button)
      } else {
        setupShakeDetection()
      }
    }

    function setupShakeDetection() {
      let lastX = 0,
        lastY = 0,
        lastZ = 0
      let lastTime = Date.now()

      const handleMotion = (event: DeviceMotionEvent) => {
        const acceleration = event.accelerationIncludingGravity
        if (!acceleration) return

        const currentTime = Date.now()
        const timeDiff = currentTime - lastTime

        if (timeDiff > 100) {
          const x = acceleration.x || 0
          const y = acceleration.y || 0
          const z = acceleration.z || 0

          const deltaX = Math.abs(x - lastX)
          const deltaY = Math.abs(y - lastY)
          const deltaZ = Math.abs(z - lastZ)

          if (deltaX + deltaY + deltaZ > 30) {
            onShake()
          }

          lastX = x
          lastY = y
          lastZ = z
          lastTime = currentTime
        }
      }

      window.addEventListener("devicemotion", handleMotion)
      return () => window.removeEventListener("devicemotion", handleMotion)
    }
  }, [onShake])

  useEffect(() => {
    if (shakeDetected) {
      rigidBodiesRef.current.forEach((rb) => {
        if (rb) {
          rb.applyImpulse(
            {
              x: (Math.random() - 0.5) * 5,
              y: Math.random() * 3,
              z: (Math.random() - 0.5) * 5,
            },
            true,
          )
          rb.applyTorqueImpulse(
            {
              x: (Math.random() - 0.5) * 2,
              y: (Math.random() - 0.5) * 2,
              z: (Math.random() - 0.5) * 2,
            },
            true,
          )
        }
      })
    }
  }, [shakeDetected])

  useFrame((state) => {
    const time = state.clock.getElapsedTime()

    if (time - lastSpawnTime.current > 0.5 && dominoes.length < 28) {
      lastSpawnTime.current = time

      const newDomino = {
        id: dominoIdCounter.current++,
        position: [(Math.random() - 0.5) * 12, 10 + Math.random() * 2, (Math.random() - 0.5) * 8] as [
          number,
          number,
          number,
        ],
        rotation: [(Math.random() - 0.5) * 0.4, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.4] as [
          number,
          number,
          number,
        ],
        opacity: 0,
      }

      setDominoes((prev) => [...prev, newDomino])

      setTimeout(() => {
        setDominoes((prev) => prev.map((d) => (d.id === newDomino.id ? { ...d, opacity: 1 } : d)))
      }, 50)
    }
  })

  return (
    <>
      {dominoes.map((domino) => (
        <DominoBox key={domino.id} position={domino.position} rotation={domino.rotation} opacity={domino.opacity} />
      ))}
    </>
  )
}

export default function DominoScene() {
  const [shakeDetected, setShakeDetected] = useState(false)

  const handleShake = () => {
    setShakeDetected(true)
    setTimeout(() => setShakeDetected(false), 100)
  }

  return (
    <div className="fixed inset-0">
      <Canvas shadows camera={{ position: [0, 5, 15], fov: 50 }} gl={{ alpha: false, antialias: true }}>
        <color attach="background" args={["#1a1a2e"]} />
        <fog attach="fog" args={["#1a1a2e", 15, 40]} />

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={30}
          maxPolarAngle={Math.PI / 2.1}
        />

        <Environment preset="sunset" />

        <hemisphereLight skyColor="#ffe6e0" groundColor="#1a0a0a" intensity={0.5} />

        <directionalLight
          position={[8, 20, 10]}
          intensity={2.5}
          color="#fff3e0"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-bias={-0.0001}
        />

        <spotLight position={[-10, 15, -10]} intensity={1.8} angle={0.45} penumbra={0.8} color="#ffd4b8" castShadow />

        <ambientLight intensity={0.3} />

        <Physics gravity={[0, -9.81, 0]} timeStep={1 / 60}>
          <RigidBody type="fixed" restitution={0.2} friction={0.8}>
            <CuboidCollider args={[100, 0.1, 100]} position={[0, -0.1, 0]} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
              <planeGeometry args={[200, 200]} />
              <meshStandardMaterial color="#050505" roughness={0.9} metalness={0.1} />
            </mesh>
          </RigidBody>

          <DominoSpawner onShake={handleShake} shakeDetected={shakeDetected} />
        </Physics>
      </Canvas>
    </div>
  )
}
