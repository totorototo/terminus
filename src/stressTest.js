// GPS Processing Stress Test Suite
// Tests Web Worker performance under various high-load scenarios

export class GPSStressTest {
  constructor(gpsWorker) {
    this.gpsWorker = gpsWorker;
    this.isRunning = false;
    this.results = [];
  }

  // Generate synthetic GPS data for stress testing
  generateSyntheticGPSData(pointCount) {
    const coordinates = [];
    let lat = 43.2630; // Starting near Bilbao
    let lon = -2.9350;
    
    for (let i = 0; i < pointCount; i++) {
      // Simulate realistic GPS track movement
      lat += (Math.random() - 0.5) * 0.001; // Small random movement
      lon += (Math.random() - 0.5) * 0.001;
      
      // Add realistic elevation (0-2000m)
      const elevation = Math.sin(i / 100) * 1000 + 500 + Math.random() * 500;
      
      coordinates.push([lon, lat, elevation]);
    }
    
    return coordinates;
  }

  // Test 1: Burst Load - Multiple simultaneous requests
  async testBurstLoad(options = {}) {
    const {
      concurrentRequests = 10,
      pointsPerRequest = 5000,
      onProgress = () => {},
      onResult = () => {}
    } = options;

    console.log(`🚀 Burst Load Test: ${concurrentRequests} concurrent requests with ${pointsPerRequest} points each`);
    
    const startTime = performance.now();
    const promises = [];
    
    for (let i = 0; i < concurrentRequests; i++) {
      const coordinates = this.generateSyntheticGPSData(pointsPerRequest);
      
      const promise = this.gpsWorker.processGPSData(coordinates)
        .then(result => {
          onProgress(i + 1, concurrentRequests);
          return { requestId: i, result, success: true };
        })
        .catch(error => {
          console.error(`Request ${i} failed:`, error);
          return { requestId: i, error: error.message, success: false };
        });
      
      promises.push(promise);
    }
    
    const results = await Promise.all(promises);
    const endTime = performance.now();
    
    const summary = {
      testType: 'burstLoad',
      totalTime: endTime - startTime,
      totalRequests: concurrentRequests,
      successfulRequests: results.filter(r => r.success).length,
      failedRequests: results.filter(r => !r.success).length,
      avgTimePerRequest: (endTime - startTime) / concurrentRequests,
      results
    };
    
    onResult(summary);
    return summary;
  }

  // Test 2: Sustained Load - Continuous processing over time
  async testSustainedLoad(options = {}) {
    const {
      duration = 30000, // 30 seconds
      requestInterval = 1000, // 1 second between requests
      pointsPerRequest = 3000,
      onProgress = () => {},
      onResult = () => {}
    } = options;

    console.log(`⏱️ Sustained Load Test: ${duration/1000}s duration, request every ${requestInterval}ms`);
    
    const startTime = performance.now();
    const results = [];
    let requestCount = 0;
    
    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        const currentTime = performance.now();
        
        if (currentTime - startTime >= duration) {
          clearInterval(interval);
          
          const summary = {
            testType: 'sustainedLoad',
            totalTime: currentTime - startTime,
            totalRequests: requestCount,
            successfulRequests: results.filter(r => r.success).length,
            failedRequests: results.filter(r => !r.success).length,
            avgTimePerRequest: results.length > 0 ? 
              results.reduce((sum, r) => sum + (r.processingTime || 0), 0) / results.length : 0,
            results
          };
          
          onResult(summary);
          resolve(summary);
          return;
        }
        
        requestCount++;
        const coordinates = this.generateSyntheticGPSData(pointsPerRequest);
        const requestStart = performance.now();
        
        try {
          const result = await this.gpsWorker.processGPSData(coordinates);
          const requestEnd = performance.now();
          
          results.push({
            requestId: requestCount,
            success: true,
            processingTime: requestEnd - requestStart,
            result
          });
          
          onProgress(requestCount, Math.floor(duration / requestInterval));
          
        } catch (error) {
          results.push({
            requestId: requestCount,
            success: false,
            error: error.message
          });
        }
      }, requestInterval);
    });
  }

  // Test 3: Progressive Load - Increasing complexity over time
  async testProgressiveLoad(options = {}) {
    const {
      startPoints = 1000,
      endPoints = 20000,
      steps = 10,
      onProgress = () => {},
      onResult = () => {}
    } = options;

    console.log(`📈 Progressive Load Test: ${startPoints} to ${endPoints} points over ${steps} steps`);
    
    const results = [];
    const pointIncrement = (endPoints - startPoints) / steps;
    
    for (let i = 0; i < steps; i++) {
      const pointCount = Math.floor(startPoints + (pointIncrement * i));
      const coordinates = this.generateSyntheticGPSData(pointCount);
      
      const startTime = performance.now();
      
      try {
        const result = await this.gpsWorker.processGPSData(coordinates);
        const endTime = performance.now();
        
        results.push({
          step: i + 1,
          pointCount,
          processingTime: endTime - startTime,
          success: true,
          result
        });
        
        onProgress(i + 1, steps, pointCount);
        
      } catch (error) {
        results.push({
          step: i + 1,
          pointCount,
          success: false,
          error: error.message
        });
      }
    }
    
    const summary = {
      testType: 'progressiveLoad',
      totalSteps: steps,
      successfulSteps: results.filter(r => r.success).length,
      failedSteps: results.filter(r => !r.success).length,
      avgProcessingTime: results.filter(r => r.success).length > 0 ?
        results.filter(r => r.success).reduce((sum, r) => sum + r.processingTime, 0) / results.filter(r => r.success).length : 0,
      results
    };
    
    onResult(summary);
    return summary;
  }

  // Test 4: Memory Stress - Large dataset processing
  async testMemoryStress(options = {}) {
    const {
      pointCounts = [50000, 100000, 200000],
      onProgress = () => {},
      onResult = () => {}
    } = options;

    console.log(`🧠 Memory Stress Test: Processing datasets with ${pointCounts.join(', ')} points`);
    
    const results = [];
    
    for (let i = 0; i < pointCounts.length; i++) {
      const pointCount = pointCounts[i];
      console.log(`Processing ${pointCount} points...`);
      
      // Force garbage collection if available (Chrome DevTools)
      if (window.gc) {
        window.gc();
      }
      
      const memoryBefore = performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize
      } : null;
      
      const coordinates = this.generateSyntheticGPSData(pointCount);
      const startTime = performance.now();
      
      try {
        const result = await this.gpsWorker.processGPSData(coordinates);
        const endTime = performance.now();
        
        const memoryAfter = performance.memory ? {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize
        } : null;
        
        results.push({
          pointCount,
          processingTime: endTime - startTime,
          memoryBefore,
          memoryAfter,
          memoryDelta: memoryAfter && memoryBefore ? 
            memoryAfter.used - memoryBefore.used : null,
          success: true,
          result
        });
        
        onProgress(i + 1, pointCounts.length, pointCount);
        
      } catch (error) {
        results.push({
          pointCount,
          success: false,
          error: error.message
        });
      }
    }
    
    const summary = {
      testType: 'memoryStress',
      totalTests: pointCounts.length,
      successfulTests: results.filter(r => r.success).length,
      failedTests: results.filter(r => !r.success).length,
      results
    };
    
    onResult(summary);
    return summary;
  }

  // Test 5: UI Responsiveness Test - Check if main thread stays responsive
  async testUIResponsiveness(options = {}) {
    const {
      testDuration = 10000, // 10 seconds
      animationFrameThreshold = 16.67, // 60fps = 16.67ms per frame
      onProgress = () => {},
      onResult = () => {}
    } = options;

    console.log(`🎬 UI Responsiveness Test: Monitoring frame rate during heavy processing`);
    
    const frameTimings = [];
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let isMonitoring = true;
    
    function measureFrame() {
      if (!isMonitoring) return;
      
      const currentTime = performance.now();
      const frameDuration = currentTime - lastFrameTime;
      frameTimings.push(frameDuration);
      lastFrameTime = currentTime;
      frameCount++;
      
      requestAnimationFrame(measureFrame);
    }
    
    requestAnimationFrame(measureFrame);
    
    const coordinates = this.generateSyntheticGPSData(10000);
    const startTime = performance.now();

    // Return a Promise that resolves when the test is done
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.gpsWorker.processGPSData(coordinates);
        const endTime = performance.now();
        
        setTimeout(() => {
          isMonitoring = false;
          
          const droppedFrames = frameTimings.filter(timing => timing > animationFrameThreshold).length;
          const avgFrameTime = frameTimings.reduce((sum, timing) => sum + timing, 0) / frameTimings.length;
          const fps = 1000 / avgFrameTime;
          
          const summary = {
            testType: 'uiResponsiveness',
            processingTime: endTime - startTime,
            totalFrames: frameCount,
            droppedFrames,
            frameDropPercentage: (droppedFrames / frameCount) * 100,
            avgFrameTime,
            estimatedFPS: fps,
            isResponsive: fps > 30, // Consider 30+ FPS as responsive
            result
          };
          
          onResult(summary);
          resolve(summary); // <-- This is the key fix!
        }, 1000);
        
      } catch (error) {
        isMonitoring = false;
        const errSummary = {
          testType: 'uiResponsiveness',
          success: false,
          error: error.message
        };
        onResult(errSummary);
        reject(errSummary);
      }
    });
  }

  // Run comprehensive stress test suite
  async runFullStressTest(onProgress = () => {}, onResult = () => {}) {
    console.log('🔥 Starting Comprehensive GPS Stress Test Suite');
    
    const allResults = {};
    
    try {
      // Test 1: Burst Load
      onProgress('Running Burst Load Test...', 1, 5);
      allResults.burstLoad = await this.testBurstLoad({
        concurrentRequests: 5,
        pointsPerRequest: 3000
      });
      
      // Test 2: Sustained Load
      onProgress('Running Sustained Load Test...', 2, 5);
      allResults.sustainedLoad = await this.testSustainedLoad({
        duration: 15000,
        requestInterval: 2000,
        pointsPerRequest: 2000
      });
      
      // Test 3: Progressive Load
      onProgress('Running Progressive Load Test...', 3, 5);
      allResults.progressiveLoad = await this.testProgressiveLoad({
        startPoints: 1000,
        endPoints: 10000,
        steps: 5
      });
      
      // Test 4: Memory Stress
      onProgress('Running Memory Stress Test...', 4, 5);
      allResults.memoryStress = await this.testMemoryStress({
        pointCounts: [10000, 25000, 50000]
      });
      
      // Test 5: UI Responsiveness
      onProgress('Running UI Responsiveness Test...', 5, 5);
      allResults.uiResponsiveness = await this.testUIResponsiveness();
      
      const finalSummary = {
        testSuite: 'comprehensive',
        totalTests: 5,
        completedTests: Object.keys(allResults).length,
        results: allResults,
        overallScore: this.calculateOverallScore(allResults)
      };
      
      onResult(finalSummary);
      return finalSummary;
      
    } catch (error) {
      console.error('Stress test suite failed:', error);
      throw error;
    }
  }

  // Calculate performance score
  calculateOverallScore(results) {
    let score = 100;
    
    // Deduct points for failures
    Object.values(results).forEach(result => {
      if (result.failedRequests > 0) {
        score -= (result.failedRequests / result.totalRequests) * 20;
      }
      if (result.frameDropPercentage > 10) {
        score -= 15; // UI responsiveness penalty
      }
    });
    
    return Math.max(0, Math.round(score));
  }
}
