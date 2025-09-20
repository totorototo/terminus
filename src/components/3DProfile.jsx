import { memo, useMemo, useEffect } from 'react'
import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls, Environment, AccumulativeShadows, RandomizedLight, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { scaleLinear } from "d3-scale";
import * as THREE from 'three';


const gridSize = [10, 10];


function ElevationProfile({ gpsPoints }) {

    const topVertices = gpsPoints.map(([long, ele, lat]) => [long, ele, lat]);
    const baseVertices = gpsPoints.map(([long, _ele, lat]) => [long, 0, lat]);

    // Build triangles between consecutive points to fill area between elevation and zero
    const vertices = [];
    for (let i = 0; i < gpsPoints.length - 1; i++) {
        // Triangle 1: top current, base current, top next
        vertices.push(
            ...topVertices[i],
            ...baseVertices[i],
            ...topVertices[i + 1]
        );
        // Triangle 2: top next, base current, base next
        vertices.push(
            ...topVertices[i + 1],
            ...baseVertices[i],
            ...baseVertices[i + 1]
        );
    }

    const positions = new Float32Array(vertices);

    return (
        <mesh castShadow>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={positions.length / 3}
                    array={positions}
                    itemSize={3}
                />
            </bufferGeometry>
            {/* <meshPhysicalMaterial
                color="#35507a"
                roughness={0.5}
                metalness={0.12}
                clearcoat={0.18}
                clearcoatRoughness={0.25}
                transmission={0.08}
                thickness={0.18}
                ior={1.18}
                side={THREE.DoubleSide}
            /> */}
            <meshPhongMaterial color="#fefefeff" side={THREE.DoubleSide} />
        </mesh>
    );
}





export default function ThreeDimensionalProfile({ width, height, coordinates }) {

    // Memoize scales and points3D for performance
    const { xScale, yScale, zScale, points3D } = useMemo(() => {
        const xExtent = [Math.min(...coordinates.map(coord => coord[0])), Math.max(...coordinates.map(coord => coord[0]))]; // longitude
        const yExtent = [Math.min(...coordinates.map(coord => coord[2])), Math.max(...coordinates.map(coord => coord[2]))]; // elevation
        const zExtent = [Math.min(...coordinates.map(coord => coord[1])), Math.max(...coordinates.map(coord => coord[1]))]; // latitude

        const xScale = scaleLinear().domain(xExtent).range([-5, 5]);
        const yScale = scaleLinear().domain([0, yExtent[1]]).range([0, 1]);
        const zScale = scaleLinear().domain(zExtent).range([-10, 10]);
        const points3D = coordinates.map(coord => [
            xScale(coord[0]), // longitude → x
            yScale(coord[2]), // elevation → y
            zScale(coord[1])  // latitude → z
        ]);
        return { xScale, yScale, zScale, points3D };
    }, [coordinates]);



    return (
        <>
            <Canvas
                camera={{ position: [8, 7, 10], fov: 10 }}
                style={{ width, height }}
                shadows
            >

                <OrbitControls makeDefault enablePan enableZoom enableRotate />
                <Environment preset='city' background={false} />
                <Shadows />

                {/* <mesh>
                    <boxGeometry args={[2, 2, 2]} />
                    <meshPhongMaterial />
                </mesh> */}

                <Grid position={[0, -0.01, 0]} args={gridSize} cellColor="#b3c6e0" sectionColor="#7a8fa6" fadeDistance={20} fadeStrength={1.5} />
                {points3D && points3D.length > 0 && <ElevationProfile gpsPoints={points3D} />}
                <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
                    <GizmoViewport axisColors={['#9d4b4b', '#2f7f4f', '#3b5b9d']} labelColor="white" />
                </GizmoHelper>
                <ambientLight intensity={1} />
                <directionalLight color="white" position={[0, 0, 5]} />
                <pointLight
                    position={[1, 1, -3]}
                    castShadow
                    shadow-mapSize={[1024, 1024]}
                />

            </Canvas>
        </>
    );
}



const Shadows = memo(() => (
    <AccumulativeShadows temporal frames={100} color="#9d4b4b" colorBlend={0.5} alphaTest={0.9} scale={20}>
        <RandomizedLight amount={8} radius={4} position={[5, 5, -10]} />
    </AccumulativeShadows>
))
