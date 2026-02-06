#!/usr/bin/env tsx
/**
 * Populate Products Script
 * 
 * This script populates the products table with affiliate products.
 * 
 * Usage:
 *   tsx scripts/populate-products.ts
 *   tsx scripts/populate-products.ts --overwrite
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env.local first (if exists), then .env
// This matches Next.js behavior and ensures env vars are loaded before imports
const envLocal = path.join(process.cwd(), '.env.local');
const envFile = path.join(process.cwd(), '.env');

if (fs.existsSync(envLocal)) {
  dotenv.config({ path: envLocal, override: true });
  console.log('📄 Loaded .env.local');
} else if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile, override: false });
  console.log('📄 Loaded .env');
} else {
  console.warn('⚠️  No .env.local or .env file found - using process.env only');
}

// Also load dotenv/config as fallback
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { SAMPLE_AFFILIATE_PRODUCTS } from '../lib/marketplace/affiliateProducts';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const overwrite = process.argv.includes('--overwrite');

async function main() {
  console.log('🛒 Starting product population...');
  console.log(`📅 Date: ${new Date().toLocaleString()}`);

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    process.exit(1);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if products already exist
    const { data: existingProducts, error: checkError } = await supabase
      .from('products')
      .select('id, name')
      .limit(1);

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Database error:', checkError.message);
      process.exit(1);
    }

    const hasExisting = existingProducts && existingProducts.length > 0;

    if (hasExisting && !overwrite) {
      console.log('⚠️  Products already exist in database.');
      console.log('   Use --overwrite flag to replace existing products.');
      process.exit(0);
    }

    // Delete existing products if overwriting
    if (hasExisting && overwrite) {
      console.log('🗑️  Deleting existing products...');
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteError) {
        console.error('❌ Failed to delete existing products:', deleteError.message);
        process.exit(1);
      }
      console.log('✅ Existing products deleted');
    }

    // Insert new products
    console.log(`📦 Inserting ${SAMPLE_AFFILIATE_PRODUCTS.length} products...`);
    const productsToInsert = SAMPLE_AFFILIATE_PRODUCTS.map(product => ({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      link: product.link,
      sponsor: product.sponsor || false,
      commission: product.commission || null,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { data: insertedProducts, error: insertError } = await supabase
      .from('products')
      .insert(productsToInsert)
      .select();

    if (insertError) {
      console.error('❌ Failed to insert products:', insertError.message);
      process.exit(1);
    }

    console.log(`✅ ${hasExisting ? 'Products replaced' : 'Products populated'} successfully!`);
    console.log(`📊 Products added: ${insertedProducts?.length || 0}`);
    console.log(`⏰ Completed at: ${new Date().toLocaleString()}`);
    
    // Show categories
    const categories = Array.from(new Set(SAMPLE_AFFILIATE_PRODUCTS.map(p => p.category)));
    console.log(`📂 Categories: ${categories.join(', ')}`);

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
