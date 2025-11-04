#!/usr/bin/env tsx

/**
 * Image Optimization Script
 * Optimizes PNG images in client/public/avatars/ directory
 * 
 * Usage: npm run optimize:images
 * Or: tsx scripts/optimize-images.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AVATARS_DIR = path.join(__dirname, '../client/public/avatars');
const TARGET_SIZE = 400; // 400x400px for retina displays
const QUALITY = 85; // JPEG/WebP quality (0-100)

async function checkSharp() {
  try {
    const sharp = await import('sharp');
    return sharp.default;
  } catch {
    console.error('❌ Sharp is not installed. Installing...');
    console.log('Run: npm install -D sharp');
    console.log('Or use online tools: https://tinypng.com/ or https://squoosh.app/');
    return null;
  }
}

async function optimizeImage(filePath: string, sharp: any) {
  const fileName = path.basename(filePath);
  const originalSize = fs.statSync(filePath).size;
  
  try {
    // Read image
    const image = sharp(filePath);
    const metadata = await image.metadata();
    
    console.log(`\n📸 Processing: ${fileName}`);
    console.log(`   Original: ${metadata.width}x${metadata.height}, ${(originalSize / 1024).toFixed(2)} KB`);
    
    // Resize if needed
    if (metadata.width && metadata.width > TARGET_SIZE) {
      await image
        .resize(TARGET_SIZE, TARGET_SIZE, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .toFile(filePath.replace('.png', '_resized.png'));
      
      console.log(`   ✅ Resized to ${TARGET_SIZE}x${TARGET_SIZE}`);
    }
    
    // Optimize PNG
    const optimizedPng = filePath.replace('.png', '_optimized.png');
    await image
      .png({ 
        quality: QUALITY,
        compressionLevel: 9,
        adaptiveFiltering: true
      })
      .toFile(optimizedPng);
    
    const optimizedSize = fs.statSync(optimizedPng).size;
    const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(1);
    
    console.log(`   ✅ Optimized PNG: ${(optimizedSize / 1024).toFixed(2)} KB (${savings}% smaller)`);
    
    // Create WebP version
    const webpPath = filePath.replace('.png', '.webp');
    await image
      .webp({ quality: QUALITY })
      .toFile(webpPath);
    
    const webpSize = fs.statSync(webpPath).size;
    const webpSavings = ((1 - webpSize / originalSize) * 100).toFixed(1);
    
    console.log(`   ✅ WebP version: ${(webpSize / 1024).toFixed(2)} KB (${webpSavings}% smaller)`);
    
    return {
      original: originalSize,
      optimized: optimizedSize,
      webp: webpSize,
      savings: parseFloat(savings),
      webpSavings: parseFloat(webpSavings)
    };
  } catch (error) {
    console.error(`   ❌ Error processing ${fileName}:`, error);
    return null;
  }
}

async function main() {
  console.log('🖼️  Image Optimization Script\n');
  console.log('📁 Target directory:', AVATARS_DIR);
  
  if (!fs.existsSync(AVATARS_DIR)) {
    console.error(`❌ Directory not found: ${AVATARS_DIR}`);
    process.exit(1);
  }
  
  // Check for sharp
  const sharp = await checkSharp();
  if (!sharp) {
    process.exit(1);
  }
  
  // Find all PNG files
  const files = fs.readdirSync(AVATARS_DIR)
    .filter(file => file.endsWith('.png'))
    .map(file => path.join(AVATARS_DIR, file));
  
  if (files.length === 0) {
    console.log('⚠️  No PNG files found in avatars directory');
    process.exit(0);
  }
  
  console.log(`\n📊 Found ${files.length} image(s) to optimize\n`);
  
  const results: Array<{ original: number; optimized: number; webp: number; savings: number; webpSavings: number }> = [];
  
  for (const file of files) {
    const result = await optimizeImage(file, sharp);
    if (result) {
      results.push(result);
    }
  }
  
  // Summary
  if (results.length > 0) {
    const totalOriginal = results.reduce((sum, r) => sum + r.original, 0);
    const totalOptimized = results.reduce((sum, r) => sum + r.optimized, 0);
    const totalWebp = results.reduce((sum, r) => sum + r.webp, 0);
    const avgSavings = results.reduce((sum, r) => sum + r.savings, 0) / results.length;
    const avgWebpSavings = results.reduce((sum, r) => sum + r.webpSavings, 0) / results.length;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Optimization Summary');
    console.log('='.repeat(60));
    console.log(`Total original size: ${(totalOriginal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Total optimized PNG: ${(totalOptimized / 1024 / 1024).toFixed(2)} MB (${avgSavings.toFixed(1)}% savings)`);
    console.log(`Total WebP: ${(totalWebp / 1024 / 1024).toFixed(2)} MB (${avgWebpSavings.toFixed(1)}% savings)`);
    console.log(`\n💡 Recommendation: Use WebP format for modern browsers`);
    console.log(`   Update image paths from .png to .webp in your code`);
    console.log('='.repeat(60));
  }
}

main().catch(console.error);

