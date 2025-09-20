import { memo, useMemo, useEffect } from 'react'
import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls, Environment, AccumulativeShadows, RandomizedLight, Line } from '@react-three/drei';
import { scaleLinear } from "d3-scale";


const gridSize = [10, 10];

export default function ThreeDimensionalProfile({ width, height, coordinates }) {


    // Memoize scales and points3D for performance
    const { xScale, yScale, zScale, points3D } = useMemo(() => {
        const xExtent = [Math.min(...coordinates.map(coord => coord[0])), Math.max(...coordinates.map(coord => coord[0]))]; // longitude
        const yExtent = [Math.min(...coordinates.map(coord => coord[2])), Math.max(...coordinates.map(coord => coord[2]))]; // elevation
        const zExtent = [Math.min(...coordinates.map(coord => coord[1])), Math.max(...coordinates.map(coord => coord[1]))]; // latitude

        const xScale = scaleLinear().domain(xExtent).range([-5, 5]);
        const yScale = scaleLinear().domain([0, yExtent[1]]).range([0, 1]);
        const zScale = scaleLinear().domain(zExtent).range([-5, 5]);
        const points3D = coordinates.map(coord => [
            xScale(coord[0]), // longitude → x
            yScale(coord[2]), // elevation → y
            zScale(coord[1])  // latitude → z
        ]);
        return { xScale, yScale, zScale, points3D };
    }, [coordinates]);



    return (
        <>
            <Canvas camera={{ position: [10, 12, 12], fov: 25 }} style={{ width, height }}>
                <OrbitControls makeDefault />
                <Environment preset="city" />
                <Shadows />
                <ambientLight intensity={0.8} />
                <pointLight position={[10, 10, 10]} />
                <Grid position={[0, -0.01, 0]} args={gridSize} />
                {points3D && points3D.length > 0 && <Line points={points3D} color="red" lineWidth={2} />}
            </Canvas>
        </>
    );
}


const Shadows = memo(() => (
    <AccumulativeShadows temporal frames={100} color="#9d4b4b" colorBlend={0.5} alphaTest={0.9} scale={20}>
        <RandomizedLight amount={8} radius={4} position={[5, 5, -10]} />
    </AccumulativeShadows>
))