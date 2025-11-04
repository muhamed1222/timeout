#!/usr/bin/env tsx
/**
 * Analyze slow queries using pg_stat_statements
 * 
 * Shows:
 * - Slowest queries by average execution time
 * - Most frequently executed queries
 * - Queries with highest total time
 * - Index usage suggestions
 * 
 * Usage: tsx scripts/analyze-slow-queries.ts [--min-calls=100] [--min-time=1]
 */

import "dotenv/config";
import postgres from "postgres";
import { logger } from "../server/lib/logger.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  logger.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const sql = postgres(connectionString, {
  ssl: connectionString.includes("supabase") ? { rejectUnauthorized: false } : false,
  max: 1,
});

interface SlowQuery {
  query: string;
  calls: number;
  total_time: number;
  mean_time: number;
  max_time: number;
  min_time: number;
  stddev_time: number;
  cache_hit_ratio: number;
}

interface QueryPattern {
  pattern: string;
  total_calls: number;
  total_time: number;
  mean_time: number;
  min_time: number;
  max_time: number;
}

async function checkExtension(): Promise<boolean> {
  try {
    const result = await sql`
      SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
      )
    `;
    
    if (!result[0].exists) {
      logger.error("\n❌ pg_stat_statements extension is not installed!");
      logger.info("\nTo install it, run:");
      logger.info("  1. Enable extension in PostgreSQL configuration");
      logger.info("  2. Run: CREATE EXTENSION IF NOT EXISTS pg_stat_statements;");
      logger.info("  3. Add shared_preload_libraries = 'pg_stat_statements' to postgresql.conf");
      logger.info("  4. Restart PostgreSQL server");
      logger.info("\nFor Supabase:");
      logger.info("  Go to Database > Extensions and enable pg_stat_statements");
      return false;
    }
    return true;
  } catch (error) {
    logger.error("Failed to check for pg_stat_statements extension", error);
    return false;
  }
}

async function analyzeSlowQueries(minCalls = 100, minMeanTime = 1.0) {
  if (!(await checkExtension())) {
    process.exit(1);
  }

  try {
    logger.info("Analyzing slow queries using pg_stat_statements...\n");
    logger.info(`Filters: min_calls=${minCalls}, min_mean_time=${minMeanTime}s\n`);

    // Get slowest queries by mean execution time
    logger.info("=".repeat(120));
    logger.info("SLOWEST QUERIES (by mean execution time)");
    logger.info("=".repeat(120));

    const slowestQueries = await sql<SlowQuery[]>`
      SELECT 
        LEFT(query, 100) as query,
        calls,
        ROUND(total_exec_time::numeric, 2) as total_time,
        ROUND(mean_exec_time::numeric, 2) as mean_time,
        ROUND(max_exec_time::numeric, 2) as max_time,
        ROUND(min_exec_time::numeric, 3) as min_time,
        ROUND(stddev_exec_time::numeric, 2) as stddev_time,
        ROUND(100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0), 2) as cache_hit_ratio
      FROM pg_stat_statements
      WHERE mean_exec_time >= ${minMeanTime * 1000}  -- Convert to milliseconds
        AND calls >= ${minCalls}
        AND query NOT LIKE '%pg_stat%'  -- Exclude our own queries
      ORDER BY mean_exec_time DESC
      LIMIT 20;
    `;

    if (slowestQueries.length > 0) {
      logger.info("");
      logger.info("Mean (ms)".padEnd(12) + " | Calls".padEnd(12) + " | Total (ms)".padEnd(14) + " | Query");
      logger.info("-".repeat(120));
      for (const query of slowestQueries) {
        const mean = query.mean_time.toFixed(2).padStart(10);
        const calls = query.calls.toLocaleString().padStart(10);
        const total = query.total_time.toFixed(0).padStart(12);
        logger.info(`${mean} | ${calls} | ${total} | ${query.query}...`);
      }
    } else {
      logger.info("\n✅ No slow queries found matching the criteria!");
    }

    // Get most frequently executed queries
    logger.info("\n" + "=".repeat(120));
    logger.info("MOST FREQUENTLY EXECUTED QUERIES (Top 20)");
    logger.info("=".repeat(120));

    const frequentQueries = await sql<SlowQuery[]>`
      SELECT 
        LEFT(query, 100) as query,
        calls,
        ROUND(total_exec_time::numeric, 2) as total_time,
        ROUND(mean_exec_time::numeric, 2) as mean_time,
        ROUND(max_exec_time::numeric, 2) as max_time,
        ROUND(100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0), 2) as cache_hit_ratio
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat%'
      ORDER BY calls DESC
      LIMIT 20;
    `;

    if (frequentQueries.length > 0) {
      logger.info("");
      logger.info("Calls".padEnd(15) + " | Mean (ms)".padEnd(12) + " | Total (ms)".padEnd(14) + " | Cache% | Query");
      logger.info("-".repeat(120));
      for (const query of frequentQueries) {
        const calls = query.calls.toLocaleString().padStart(13);
        const mean = query.mean_time.toFixed(2).padStart(10);
        const total = query.total_time.toFixed(0).padStart(12);
        const cachePct = (query.cache_hit_ratio || 0).toFixed(0).padStart(7);
        logger.info(`${calls} | ${mean} | ${total} | ${cachePct}% | ${query.query}...`);
      }
    }

    // Get queries with highest total time
    logger.info("\n" + "=".repeat(120));
    logger.info("QUERIES WITH HIGHEST TOTAL TIME (Top 20)");
    logger.info("=".repeat(120));

    const totalTimeQueries = await sql<SlowQuery[]>`
      SELECT 
        LEFT(query, 100) as query,
        calls,
        ROUND(total_exec_time::numeric, 2) as total_time,
        ROUND(mean_exec_time::numeric, 2) as mean_time,
        ROUND(max_exec_time::numeric, 2) as max_time,
        ROUND(100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0), 2) as cache_hit_ratio
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat%'
      ORDER BY total_exec_time DESC
      LIMIT 20;
    `;

    if (totalTimeQueries.length > 0) {
      logger.info("");
      logger.info("Total (s)".padEnd(12) + " | Calls".padEnd(12) + " | Mean (ms)".padEnd(12) + " | Query");
      logger.info("-".repeat(120));
      for (const query of totalTimeQueries) {
        const total = (query.total_time / 1000).toFixed(2).padStart(10);
        const calls = query.calls.toLocaleString().padStart(10);
        const mean = query.mean_time.toFixed(2).padStart(10);
        logger.info(`${total}s | ${calls} | ${mean} | ${query.query}...`);
      }
    }

    // Get query patterns (aggregated)
    logger.info("\n" + "=".repeat(120));
    logger.info("SLOW QUERY PATTERNS");
    logger.info("=".repeat(120));

    const queryPatterns = await sql<QueryPattern[]>`
      SELECT 
        SUBSTRING(query FROM 1 FOR 80) as pattern,
        SUM(calls) as total_calls,
        ROUND(SUM(total_exec_time)::numeric, 2) as total_time,
        ROUND(AVG(mean_exec_time)::numeric, 2) as mean_time,
        ROUND(MIN(min_exec_time)::numeric, 2) as min_time,
        ROUND(MAX(max_exec_time)::numeric, 2) as max_time
      FROM pg_stat_statements
      WHERE mean_exec_time >= ${minMeanTime * 1000}
        AND calls >= ${minCalls}
        AND query NOT LIKE '%pg_stat%'
      GROUP BY pattern
      ORDER BY total_time DESC
      LIMIT 15;
    `;

    if (queryPatterns.length > 0) {
      logger.info("");
      logger.info("Total (s)".padEnd(12) + " | Calls".padEnd(12) + " | Mean (ms)".padEnd(12) + " | Pattern");
      logger.info("-".repeat(120));
      for (const pattern of queryPatterns) {
        const total = (pattern.total_time / 1000).toFixed(2).padStart(10);
        const calls = pattern.total_calls.toLocaleString().padStart(10);
        const mean = pattern.mean_time.toFixed(2).padStart(10);
        logger.info(`${total}s | ${calls} | ${mean} | ${pattern.pattern}...`);
      }
    }

    // Get cache hit statistics
    logger.info("\n" + "=".repeat(120));
    logger.info("OVERALL CACHE HIT RATIO");
    logger.info("=".repeat(120));

    const cacheStats = await sql<{
      cache_hit_ratio: number;
      total_blocks_hit: number;
      total_blocks_read: number;
    }[]>`
      SELECT 
        ROUND(100.0 * SUM(shared_blks_hit) / NULLIF(SUM(shared_blks_hit + shared_blks_read), 0), 2) as cache_hit_ratio,
        SUM(shared_blks_hit) as total_blocks_hit,
        SUM(shared_blks_read) as total_blocks_read
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat%';
    `;

    if (cacheStats.length > 0 && cacheStats[0].cache_hit_ratio) {
      const stats = cacheStats[0];
      logger.info("");
      logger.info(`Cache Hit Ratio: ${stats.cache_hit_ratio.toFixed(2)}%`);
      logger.info(`Blocks Hit: ${stats.total_blocks_hit.toLocaleString()}`);
      logger.info(`Blocks Read: ${stats.total_blocks_read.toLocaleString()}`);
      
      if (stats.cache_hit_ratio < 80) {
        logger.info("\n⚠️  Warning: Cache hit ratio is below 80%");
        logger.info("   Consider increasing shared_buffers or analyze queries with low cache hit ratio");
      }
    }

    logger.info("\n" + "=".repeat(120));
    logger.info("Analysis complete!");
    logger.info("=".repeat(120));
    logger.info("\nRecommendations:");
    logger.info("1. Optimize queries with high mean execution time");
    logger.info("2. Add indexes for frequently executed queries");
    logger.info("3. Use EXPLAIN ANALYZE to understand query plans");
    logger.info("4. Consider query result caching for expensive queries");
    logger.info("5. Review queries with inconsistent execution times (high stddev)");
    logger.info("6. Monitor cache hit ratio and adjust database cache size");
    logger.info("\nTo reset statistics:");
    logger.info("  SELECT pg_stat_statements_reset();");

  } catch (error) {
    logger.error("Error analyzing slow queries", error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let minCalls = 100;
let minMeanTime = 1.0;

for (const arg of args) {
  if (arg.startsWith("--min-calls=")) {
    minCalls = parseInt(arg.split("=")[1]);
  } else if (arg.startsWith("--min-time=")) {
    minMeanTime = parseFloat(arg.split("=")[1]);
  }
}

// Run analysis
analyzeSlowQueries(minCalls, minMeanTime)
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error("Failed to analyze slow queries", error);
    process.exit(1);
  });

