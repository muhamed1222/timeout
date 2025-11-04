#!/usr/bin/env tsx
/**
 * Analyze PostgreSQL index usage
 * 
 * Shows:
 * - Most used indexes
 * - Unused indexes (candidates for removal)
 * - Index scan statistics
 * 
 * Usage: tsx scripts/analyze-indexes.ts
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

interface IndexStats {
  schemaname: string;
  tablename: string;
  indexname: string;
  index_scans: number;
  tuples_read: number;
  tuples_fetched: number;
}

interface IndexSize {
  schemaname: string;
  tablename: string;
  indexname: string;
  size: string;
  size_bytes: number;
}

async function analyzeIndexes() {
  try {
    logger.info("Analyzing database indexes...\n");

    // Check if pg_stat_statements is available
    const hasExtension = await sql`
      SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
      )
    `;

    if (!hasExtension[0].exists) {
      logger.warn("pg_stat_statements extension is not installed. Some statistics may be limited.");
    }

    // Get most used indexes
    logger.info("=".repeat(80));
    logger.info("MOST USED INDEXES (Top 20)");
    logger.info("=".repeat(80));

    const mostUsed = await sql<IndexStats[]>`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
        AND indexname NOT LIKE '%_pkey'
      ORDER BY idx_scan DESC
      LIMIT 20;
    `;

    if (mostUsed.length > 0) {
      logger.info("");
      logger.info("Index Scans | Table".padEnd(40) + " | Index Name".padEnd(40));
      logger.info("-".repeat(80));
      for (const idx of mostUsed) {
        const tableInfo = `${idx.tablename}`.padEnd(38);
        const indexInfo = `${idx.indexname}`.padEnd(38);
        logger.info(`${idx.index_scans.toString().padStart(10)} | ${tableInfo} | ${indexInfo}`);
      }
    } else {
      logger.info("No index statistics available yet");
    }

    // Get unused indexes
    logger.info("\n" + "=".repeat(80));
    logger.info("UNUSED INDEXES (Candidates for removal)");
    logger.info("=".repeat(80));

    const unused = await sql<IndexStats[]>`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
      FROM pg_stat_user_indexes
      WHERE idx_scan = 0
        AND schemaname = 'public'
        AND indexname NOT LIKE '%_pkey'
        AND indexname NOT LIKE 'idx_%'  -- Exclude our custom indexes for now
      ORDER BY tablename, indexname;
    `;

    if (unused.length > 0) {
      logger.info("");
      logger.info("Table".padEnd(40) + " | Index Name".padEnd(40));
      logger.info("-".repeat(80));
      for (const idx of unused) {
        const tableInfo = `${idx.tablename}`.padEnd(38);
        const indexInfo = `${idx.indexname}`.padEnd(38);
        logger.info(`${tableInfo} | ${indexInfo}`);
      }
      logger.info("\n⚠️  Warning: These indexes have never been scanned.");
      logger.info("   Consider removing them to improve write performance.");
    } else {
      logger.info("\n✅ No unused indexes found!");
    }

    // Get index sizes
    logger.info("\n" + "=".repeat(80));
    logger.info("LARGEST INDEXES (Top 20)");
    logger.info("=".repeat(80));

    const largestIndexes = await sql<(IndexSize & { table_size: string })[]>`
      SELECT 
        schemaname,
        tablename,
        indexname,
        pg_size_pretty(pg_relation_size(indexrelid)) as size,
        pg_relation_size(indexrelid) as size_bytes
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
      ORDER BY pg_relation_size(indexrelid) DESC
      LIMIT 20;
    `;

    if (largestIndexes.length > 0) {
      logger.info("");
      logger.info("Size".padEnd(12) + " | Table".padEnd(35) + " | Index Name".padEnd(35));
      logger.info("-".repeat(80));
      for (const idx of largestIndexes) {
        logger.info(`${idx.size.padEnd(10)} | ${idx.tablename.padEnd(33)} | ${idx.indexname.padEnd(33)}`);
      }
    }

    // Get duplicate indexes (indexes with same columns)
    logger.info("\n" + "=".repeat(80));
    logger.info("POTENTIAL DUPLICATE INDEXES");
    logger.info("=".repeat(80));

    const duplicates = await sql<{
      table_name: string;
      columns: string;
      indexes: string;
    }[]>`
      SELECT
        t.relname AS table_name,
        array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) AS columns,
        array_agg(ix.indexrelid::regclass::text ORDER BY ix.indexrelid) AS indexes
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE t.relkind = 'r'
        AND t.relnamespace IN (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      GROUP BY t.relname, ix.indkey
      HAVING COUNT(*) > 1
      ORDER BY t.relname, COUNT(*) DESC;
    `;

    if (duplicates.length > 0) {
      logger.info("");
      for (const dup of duplicates) {
        logger.info(`Table: ${dup.table_name}`);
        logger.info(`  Columns: ${dup.columns.join(', ')}`);
        logger.info(`  Indexes: ${dup.indexes.join(', ')}`);
        logger.info("");
      }
    } else {
      logger.info("\n✅ No obvious duplicate indexes found!");
    }

    // Get table bloat (estimate)
    logger.info("\n" + "=".repeat(80));
    logger.info("INDEX USAGE EFFICIENCY");
    logger.info("=".repeat(80));

    const efficiency = await sql<{
      tablename: string;
      index_scans: number;
      seq_scans: number;
      ratio: number;
    }[]>`
      SELECT
        schemaname || '.' || tablename AS tablename,
        SUM(idx_scan) AS index_scans,
        SUM(seq_scan) AS seq_scans,
        ROUND(CASE 
          WHEN SUM(seq_scan) = 0 THEN 100
          ELSE (SUM(idx_scan)::numeric / NULLIF(SUM(idx_scan) + SUM(seq_scan), 0)) * 100
        END, 2) AS ratio
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      GROUP BY schemaname, tablename
      ORDER BY ratio ASC
      LIMIT 10;
    `;

    if (efficiency.length > 0) {
      logger.info("");
      logger.info("Index%".padEnd(10) + " | Seq Scans".padEnd(12) + " | Index Scans".padEnd(14) + " | Table".padEnd(40));
      logger.info("-".repeat(80));
      for (const eff of efficiency) {
        logger.info(
          `${eff.ratio.toString().padEnd(8)}% | ${eff.seq_scans.toString().padStart(10)} | ${eff.index_scans.toString().padStart(12)} | ${eff.tablename}`
        );
      }
      logger.info("\n⚠️  Tables with low index usage may benefit from additional indexes");
    }

    logger.info("\n" + "=".repeat(80));
    logger.info("Analysis complete!");
    logger.info("=".repeat(80));
    logger.info("\nRecommendations:");
    logger.info("1. Review unused indexes and consider removing them");
    logger.info("2. Check large indexes - they may be causing write performance issues");
    logger.info("3. Investigate tables with low index usage");
    logger.info("4. Run ANALYZE on tables to update statistics");
    logger.info("5. Monitor index usage over time");

  } catch (error) {
    logger.error("Error analyzing indexes", error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run analysis
analyzeIndexes()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error("Failed to analyze indexes", error);
    process.exit(1);
  });

