#!/usr/bin/env bun

// Simple test script for Walrus integration
// Run with: bun test-walrus.ts

import { uploadImageToWalrus } from './src/lib/walrus'

async function testWalrus() {
  console.log('🧪 Testing Walrus integration...')
  
  // Create a simple test image (1x1 red pixel PNG)
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
  
  try {
    console.log('🔄 Uploading test image to Walrus...')
    const blobId = await uploadImageToWalrus(testImageBase64, 'test-image.png')
    console.log('✅ Success! BlobId:', blobId)
    
    // Test download
    console.log('🔄 Downloading test image from Walrus...')
    const { downloadImageFromWalrus } = await import('./src/lib/walrus')
    const imageBuffer = await downloadImageFromWalrus(blobId)
    console.log('✅ Success! Downloaded', imageBuffer.length, 'bytes')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Only run if this file is executed directly
if (import.meta.main) {
  testWalrus()
}