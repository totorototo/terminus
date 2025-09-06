// Example JavaScript integration for OptimizedTrace
// This demonstrates how to efficiently use the new batch operations

import { OptimizedTrace, __zigar } from "../zig/trace_optimized.zig";

export class EfficientGPSProcessor {
    constructor() {
        this.trace = null;
        this.isInitialized = false;
    }

    async initialize(gpxCoordinates) {
        if (!this.isInitialized) {
            const { init } = __zigar;
            await init();
            this.isInitialized = true;
        }

        // Single initialization call
        this.trace = OptimizedTrace.init(gpxCoordinates);
        
        // Get all basic stats in one call instead of multiple
        const stats = this.trace.getStats();
        console.log('Route loaded:', stats);
        
        return stats;
    }

    // Efficient route visualization - single call for all points
    generateRouteVisualization(targetPointCount = 200) {
        if (!this.trace) throw new Error('Trace not initialized');

        // OLD WAY (200 individual calls):
        // const points = [];
        // for (let i = 0; i < targetPointCount; i++) {
        //     const distance = (totalDistance / targetPointCount) * i;
        //     points.push(this.trace.pointAtDistance(distance)); // 200 JS-WASM calls!
        // }

        // NEW WAY (1 batch call):
        const points = new Array(targetPointCount);
        const actualCount = this.trace.samplePoints(targetPointCount, points);
        
        return points.slice(0, actualCount).map(point => ({
            lat: point[0],
            lng: point[1], 
            elevation: point[2]
        }));
    }

    // Efficient elevation profile generation
    generateElevationProfile(segmentCount = 100) {
        if (!this.trace) throw new Error('Trace not initialized');

        const stats = this.trace.getStats();
        const totalDistance = stats.total_distance_km;
        
        // Generate distance points for profile
        const distances = [];
        for (let i = 0; i <= segmentCount; i++) {
            distances.push((totalDistance / segmentCount) * i);
        }

        // OLD WAY (100+ individual calls):
        // const profilePoints = distances.map(d => this.trace.pointAtDistance(d));

        // NEW WAY (1 batch call):
        const profilePoints = new Array(distances.length);
        const count = this.trace.pointsAtDistances(distances, profilePoints);
        
        return profilePoints.slice(0, count).map((point, i) => ({
            distance: distances[i],
            elevation: point[2],
            lat: point[0],
            lng: point[1]
        }));
    }

    // Efficient range queries for map viewport
    getPointsInViewport(startKm, endKm, maxPoints = 500) {
        if (!this.trace) throw new Error('Trace not initialized');

        // OLD WAY (multiple slice operations):
        // const slice = this.trace.sliceBetweenDistances(startKm, endKm);
        // return slice.map(point => ({ lat: point[0], lng: point[1], elevation: point[2] }));

        // NEW WAY (optimized range query):
        const points = this.trace.pointsInRange(startKm, endKm, maxPoints);
        
        return Array.from(points).map(point => ({
            lat: point[0],
            lng: point[1],
            elevation: point[2]
        }));
    }

    // Interactive point lookup with caching benefits
    findNearestPoint(targetKm) {
        if (!this.trace) throw new Error('Trace not initialized');

        // Benefits from internal caching for nearby searches
        const point = this.trace.pointAtDistance(targetKm);
        
        return point ? {
            lat: point[0],
            lng: point[1],
            elevation: point[2]
        } : null;
    }

    // Batch lookup for multiple targets (e.g., waypoints, POIs)
    findMultiplePoints(targetDistances) {
        if (!this.trace) throw new Error('Trace not initialized');

        // OLD WAY (multiple individual calls):
        // return targetDistances.map(d => this.findNearestPoint(d));

        // NEW WAY (single batch call):
        const points = new Array(targetDistances.length);
        const count = this.trace.pointsAtDistances(targetDistances, points);
        
        return points.slice(0, count).map(point => ({
            lat: point[0],
            lng: point[1],
            elevation: point[2]
        }));
    }

    // Performance monitoring
    getPerformanceStats() {
        if (!this.trace) return null;

        const cacheStats = this.trace.getCacheStats();
        const routeStats = this.trace.getStats();
        
        return {
            cache: {
                hits: cacheStats.hits,
                misses: cacheStats.misses,
                hitRatio: `${(cacheStats.ratio * 100).toFixed(1)}%`
            },
            route: routeStats
        };
    }

    // Reset performance cache (useful for benchmarking)
    resetPerformanceCache() {
        if (this.trace) {
            this.trace.resetCache();
        }
    }

    // Cleanup
    dispose() {
        if (this.trace) {
            this.trace.deinit();
            this.trace = null;
        }
    }
}

// Usage example for React component
export function useEfficientGPS(gpxData) {
    const [processor, setProcessor] = useState(null);
    const [routeStats, setRouteStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function initializeProcessor() {
            try {
                const gpsProcessor = new EfficientGPSProcessor();
                const stats = await gpsProcessor.initialize(gpxData.features[0].geometry.coordinates);
                
                setProcessor(gpsProcessor);
                setRouteStats(stats);
                setIsLoading(false);
                
                console.log('Performance optimized GPS processor ready:', stats);
            } catch (error) {
                console.error('Failed to initialize GPS processor:', error);
                setIsLoading(false);
            }
        }

        if (gpxData) {
            initializeProcessor();
        }

        return () => {
            if (processor) {
                processor.dispose();
            }
        };
    }, [gpxData]);

    return { processor, routeStats, isLoading };
}

// Performance comparison helper
export async function benchmarkOptimizedTrace(gpxData, iterations = 1000) {
    console.log('🚀 Benchmarking OptimizedTrace performance...');
    
    const processor = new EfficientGPSProcessor();
    await processor.initialize(gpxData.features[0].geometry.coordinates);
    
    const stats = processor.getPerformanceStats();
    console.log('Route stats:', stats.route);
    
    // Benchmark 1: Single point lookups (common for interactive use)
    console.log('\n📍 Benchmarking single point lookups...');
    const start1 = performance.now();
    
    for (let i = 0; i < iterations; i++) {
        const randomKm = Math.random() * stats.route.total_distance_km;
        processor.findNearestPoint(randomKm);
    }
    
    const end1 = performance.now();
    const avgSingleLookup = (end1 - start1) / iterations;
    
    // Benchmark 2: Batch operations  
    console.log('\n📊 Benchmarking batch operations...');
    const start2 = performance.now();
    
    for (let i = 0; i < iterations / 10; i++) { // Fewer iterations since each does more work
        const distances = Array.from({length: 10}, () => Math.random() * stats.route.total_distance_km);
        processor.findMultiplePoints(distances);
    }
    
    const end2 = performance.now();
    const avgBatchLookup = (end2 - start2) / (iterations / 10) / 10; // Per point in batch
    
    // Benchmark 3: Route visualization
    console.log('\n🗺️ Benchmarking route visualization...');
    const start3 = performance.now();
    
    for (let i = 0; i < 100; i++) {
        processor.generateRouteVisualization(200);
    }
    
    const end3 = performance.now();
    const avgVisualization = (end3 - start3) / 100;
    
    const finalStats = processor.getPerformanceStats();
    
    console.log('\n✅ Benchmark Results:');
    console.log(`Single point lookup: ${avgSingleLookup.toFixed(4)}ms average`);
    console.log(`Batch point lookup: ${avgBatchLookup.toFixed(4)}ms average per point`);
    console.log(`Route visualization (200 points): ${avgVisualization.toFixed(2)}ms`);
    console.log(`Cache performance: ${finalStats.cache.hitRatio} hit ratio`);
    console.log(`Speedup vs individual: ${(avgSingleLookup / avgBatchLookup).toFixed(1)}x faster with batching`);
    
    processor.dispose();
    
    return {
        singleLookupMs: avgSingleLookup,
        batchLookupMs: avgBatchLookup,
        visualizationMs: avgVisualization,
        cacheHitRatio: finalStats.cache.ratio,
        batchSpeedup: avgSingleLookup / avgBatchLookup
    };
}
