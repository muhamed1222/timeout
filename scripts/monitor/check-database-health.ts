#!/usr/bin/env tsx
/**
 * Check database health and metrics
 * 
 * Monitors:
 * - Cache hit rate
 * - Slow queries
 * - Index usage
 * - Connection pool status
 * 
 * Usage: tsx scripts/check-database-health.ts
 */

import "dotenv/config";
import { logger } from "../server/lib/logger.js";
import fetch from "node-fetch";

interface MetricsData {
  [key: string]: {
    help: string;
    type: string;
    metrics: Array<{
      labels: Record<string, string>;
      value: number | string;
    }>;
  };
}

async function checkDatabaseHealth() {
  try {
    logger.info("Checking database health metrics...\n");

    // Fetch metrics from /api/metrics endpoint
    const baseUrl = process.env.API_URL || "http://localhost:5000";
    const response = await fetch(`${baseUrl}/api/metrics`);
    
    if (!response.ok) {
      logger.error(`Failed to fetch metrics: ${response.statusText}`);
      logger.info("\n⚠️  Make sure the server is running on port 5000");
      logger.info("   Start it with: npm run dev");
      process.exit(1);
    }

    const metricsText = await response.text();
    const metrics: MetricsData = parsePrometheusMetrics(metricsText);

    // Cache hit rate
    logger.info("=".repeat(80));
    logger.info("CACHE PERFORMANCE");
    logger.info("=".repeat(80));

    const cacheHits = metrics["shiftmanager_cache_hits_total"]?.metrics || [];
    const cacheMisses = metrics["shiftmanager_cache_misses_total"]?.metrics || [];

    if (cacheHits.length > 0 || cacheMisses.length > 0) {
      const totalHits = cacheHits.reduce((sum, m) => sum + Number(m.value), 0);
      const totalMisses = cacheMisses.reduce((sum, m) => sum + Number(m.value), 0);
      const totalRequests = totalHits + totalMisses;
      
      if (totalRequests > 0) {
        const hitRate = (totalHits / totalRequests * 100).toFixed(2);
        logger.info(`\nCache Hit Rate: ${hitRate}% (${totalHits}/${totalRequests} requests)`);
        
        if (Number(hitRate) >= 80) {
          logger.info("✅ Cache hit rate is excellent!");
        } else if (Number(hitRate) >= 50) {
          logger.info("⚠️  Cache hit rate could be improved");
        } else {
          logger.info("❌ Cache hit rate is too low - consider review");
        }
      } else {
        logger.info("\n📊 No cache statistics available yet");
      }

      // Cache stats by key prefix
      logger.info("\nCache Stats by Key Prefix:");
      logger.info("Prefix".padEnd(20) + " | Hits".padEnd(12) + " | Misses".padEnd(12) + " | Hit%");
      logger.info("-".repeat(80));
      
      const prefixes = new Set<string>();
      cacheHits.forEach(m => prefixes.add(Object.values(m.labels)[0] || "unknown"));
      cacheMisses.forEach(m => prefixes.add(Object.values(m.labels)[0] || "unknown"));
      
      for (const prefix of Array.from(prefixes).sort()) {
        const hits = cacheHits
          .filter(m => Object.values(m.labels)[0] === prefix)
          .reduce((sum, m) => sum + Number(m.value), 0);
        const misses = cacheMisses
          .filter(m => Object.values(m.labels)[0] === prefix)
          .reduce((sum, m) => sum + Number(m.value), 0);
        const total = hits + misses;
        const rate = total > 0 ? (hits / total * 100).toFixed(1) : "0";
        
        logger.info(`${prefix.padEnd(18)} | ${hits.toString().padStart(10)} | ${misses.toString().padStart(10)} | ${rate}%`);
      }
    } else {
      logger.info("\n📊 No cache statistics available yet");
    }

    // Database query performance
    logger.info("\n" + "=".repeat(80));
    logger.info("DATABASE QUERY PERFORMANCE");
    logger.info("=".repeat(80));

    const dbQueries = metrics["shiftmanager_database_query_duration_seconds"]?.metrics || [];
    
    if (dbQueries.length > 0) {
      // Calculate percentiles manually (simplified)
      const times = dbQueries.map(m => Number(m.value)).sort((a, b) => a - b);
      const count = times.length;
      
      if (count > 0) {
        const p50 = times[Math.floor(count * 0.5)];
        const p95 = times[Math.floor(count * 0.95)];
        const p99 = times[Math.floor(count * 0.99)];
        const avg = times.reduce((sum, t) => sum + t, 0) / count;
        const max = times[count - 1];
        const slowQueries = times.filter(t => t > 1).length;

        logger.info(`\nTotal Queries: ${count}`);
        logger.info(`Average: ${(avg * 1000).toFixed(2)}ms`);
        logger.info(`P50 (median): ${(p50 * 1000).toFixed(2)}ms`);
        logger.info(`P95: ${(p95 * 1000).toFixed(2)}ms ${p95 > 0.5 ? "❌" : "✅"}`);
        logger.info(`P99: ${(p99 * 1000).toFixed(2)}ms ${p99 > 1.0 ? "❌" : "✅"}`);
        logger.info(`Max: ${(max * 1000).toFixed(2)}ms`);
        logger.info(`Slow queries (>1s): ${slowQueries} (${((slowQueries / count) * 100).toFixed(2)}%)`);

        // Check goals
        if (p95 < 0.5 && p99 < 1.0 && slowQueries / count < 0.01) {
          logger.info("\n✅ All query performance targets met!");
        } else {
          logger.info("\n⚠️  Some query performance targets not met");
        }

        // Top slow operations
        const operationTimes = new Map<string, number[]>();
        dbQueries.forEach(m => {
          const operation = m.labels.operation || "unknown";
          if (!operationTimes.has(operation)) {
            operationTimes.set(operation, []);
          }
          operationTimes.get(operation)!.push(Number(m.value));
        });

        logger.info("\nSlowest Operations:");
        logger.info("Operation".padEnd(30) + " | Avg (ms)".padEnd(12) + " | Max (ms)".padEnd(12) + " | Count");
        logger.info("-".repeat(80));
        
        const operationStats = Array.from(operationTimes.entries())
          .map(([op, times]) => ({
            operation: op,
            avg: times.reduce((sum, t) => sum + t, 0) / times.length,
            max: Math.max(...times),
            count: times.length,
          }))
          .sort((a, b) => b.avg - a.avg)
          .slice(0, 10);

        for (const stat of operationStats) {
          logger.info(
            `${stat.operation.padEnd(28)} | ${(stat.avg * 1000).toFixed(2).padStart(10)} | ${(stat.max * 1000).toFixed(2).padStart(10)} | ${stat.count}`
          );
        }
      }
    } else {
      logger.info("\n📊 No database query statistics available yet");
    }

    // Connection pool
    logger.info("\n" + "=".repeat(80));
    logger.info("DATABASE CONNECTION POOL");
    logger.info("=".repeat(80));

    const connections = metrics["shiftmanager_database_connections"]?.metrics || [];
    
    if (connections.length > 0) {
      const active = connections.find(m => m.labels.state === "active")?.value || 0;
      const idle = connections.find(m => m.labels.state === "idle")?.value || 0;
      const total = Number(active) + Number(idle);
      
      logger.info(`\nTotal Connections: ${total}/10`);
      logger.info(`Active: ${active}`);
      logger.info(`Idle: ${idle}`);
      
      if (Number(total) >= 8) {
        logger.info("\n⚠️  Connection pool is almost full");
      } else {
        logger.info("\n✅ Connection pool is healthy");
      }
    } else {
      logger.info("\n📊 No connection pool statistics available yet");
    }

    // HTTP requests
    logger.info("\n" + "=".repeat(80));
    logger.info("HTTP REQUEST PERFORMANCE");
    logger.info("=".repeat(80));

    const httpDuration = metrics["shiftmanager_http_request_duration_seconds"]?.metrics || [];
    
    if (httpDuration.length > 0) {
      const times = httpDuration.map(m => Number(m.value)).sort((a, b) => a - b);
      const count = times.length;
      const avg = times.reduce((sum, t) => sum + t, 0) / count;
      const p95 = times[Math.floor(count * 0.95)];
      
      logger.info(`\nAverage Request Time: ${(avg * 1000).toFixed(2)}ms`);
      logger.info(`P95 Request Time: ${(p95 * 1000).toFixed(2)}ms`);
    } else {
      logger.info("\n📊 No HTTP request statistics available yet");
    }

    logger.info("\n" + "=".repeat(80));
    logger.info("Health check complete!");
    logger.info("=".repeat(80));
    logger.info("\n💡 Run this script weekly to monitor database health");
    logger.info("   You can add it to a cron job or CI/CD pipeline");

  } catch (error) {
    logger.error("Error checking database health", error);
    process.exit(1);
  }
}

/**
 * Parse Prometheus text format metrics into structured object
 */
function parsePrometheusMetrics(text: string): MetricsData {
  const result: MetricsData = {};
  let currentMetric: string | null = null;
  let currentHelp: string = "";
  let currentType: string = "";

  for (const line of text.split("\n")) {
    // Skip comments except HELP and TYPE
    if (line.startsWith("# HELP ")) {
      const match = line.match(/# HELP (\w+) (.+)/);
      if (match) {
        currentMetric = match[1];
        currentHelp = match[2];
        if (!result[currentMetric]) {
          result[currentMetric] = { help: currentHelp, type: "", metrics: [] };
        } else {
          result[currentMetric].help = currentHelp;
        }
      }
    } else if (line.startsWith("# TYPE ")) {
      const match = line.match(/# TYPE (\w+) (\w+)/);
      if (match) {
        currentMetric = match[1];
        currentType = match[2];
        if (!result[currentMetric]) {
          result[currentMetric] = { help: "", type: currentType, metrics: [] };
        } else {
          result[currentMetric].type = currentType;
        }
      }
    } else if (line && !line.startsWith("#") && currentMetric) {
      // Parse metric line
      const match = line.match(/^([^{]+)(?:{([^}]+)})?\s+(.+)$/);
      if (match) {
        const metricName = match[1].trim();
        const labels = match[2] || "";
        const value = match[3].trim();

        // Parse labels
        const labelMap: Record<string, string> = {};
        if (labels) {
          for (const label of labels.split(",")) {
            const [key, val] = label.split("=");
            if (key && val) {
              labelMap[key.trim()] = val.trim().replace(/^"|"$/g, "");
            }
          }
        }

        result[currentMetric].metrics.push({
          labels: labelMap,
          value: isNaN(Number(value)) ? value : Number(value),
        });
      }
    }
  }

  return result;
}

// Run health check
checkDatabaseHealth()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error("Failed to check database health", error);
    process.exit(1);
  });

