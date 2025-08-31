const fs = require('fs');
const path = require('path');

// Create a simple 16x16 BMP file as a basic icon
function createBasicBMP() {
  // Basic 16x16 BMP header + data (all black pixels)
  const width = 16;
  const height = 16;
  const bpp = 24; // bits per pixel
  
  const rowSize = Math.floor((bpp * width + 31) / 32) * 4;
  const pixelDataSize = rowSize * height;
  const fileSize = 54 + pixelDataSize; // BMP header is 54 bytes
  
  const buffer = Buffer.alloc(fileSize);
  
  // BMP File Header (14 bytes)
  buffer.write('BM', 0); // Signature
  buffer.writeUInt32LE(fileSize, 2); // File size
  buffer.writeUInt32LE(0, 6); // Reserved
  buffer.writeUInt32LE(54, 10); // Offset to pixel data
  
  // DIB Header (40 bytes)
  buffer.writeUInt32LE(40, 14); // DIB header size
  buffer.writeInt32LE(width, 18); // Width
  buffer.writeInt32LE(height, 22); // Height
  buffer.writeUInt16LE(1, 26); // Color planes
  buffer.writeUInt16LE(bpp, 28); // Bits per pixel
  buffer.writeUInt32LE(0, 30); // Compression
  buffer.writeUInt32LE(pixelDataSize, 34); // Image size
  buffer.writeInt32LE(2835, 38); // X pixels per meter
  buffer.writeInt32LE(2835, 42); // Y pixels per meter
  buffer.writeUInt32LE(0, 46); // Colors in color table
  buffer.writeUInt32LE(0, 50); // Important color count
  
  // Pixel data (all zeros = black)
  buffer.fill(0, 54);
  
  return buffer;
}

// Create a simple ICO file with 16x16 icon
function createBasicICO() {
  const bmpData = createBasicBMP();
  const bmpSize = bmpData.length - 54; // Remove BMP header for ICO
  
  const buffer = Buffer.alloc(22 + bmpSize);
  
  // ICO Header (6 bytes)
  buffer.writeUInt16LE(0, 0); // Reserved
  buffer.writeUInt16LE(1, 2); // Type (1 = icon)
  buffer.writeUInt16LE(1, 4); // Number of images
  
  // Image Directory Entry (16 bytes)
  buffer.writeUInt8(16, 6); // Width
  buffer.writeUInt8(16, 7); // Height
  buffer.writeUInt8(0, 8); // Color count
  buffer.writeUInt8(0, 9); // Reserved
  buffer.writeUInt16LE(1, 10); // Color planes
  buffer.writeUInt16LE(24, 12); // Bits per pixel
  buffer.writeUInt32LE(bmpSize, 14); // Image size
  buffer.writeUInt32LE(22, 18); // Image offset
  
  // Copy BMP data without header
  bmpData.copy(buffer, 22, 54);
  
  return buffer;
}

// Create directories and icon files
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create ICO file
const icoBuffer = createBasicICO();
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), icoBuffer);

// Create PNG file (simple 16x16 black square)
const pngData = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
  0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk header
  0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10, // Width: 16, Height: 16
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x91, 0x68, // Bit depth: 8, Color type: 2 (RGB)
  0x36, 0x00, 0x00, 0x00, 0x36, 0x49, 0x44, 0x41, // IDAT chunk header
  0x54, 0x28, 0x15, 0x63, 0x60, 0x60, 0x60, 0xF8, // IDAT data (compressed black pixels)
  0x0F, 0x00, 0x01, 0x01, 0x01, 0x00, 0x18, 0xDD,
  0x8D, 0xB4, 0x10, 0x00, 0x00, 0x00, 0x0C, 0x49,
  0x44, 0x41, 0x54, 0x08, 0x99, 0x01, 0x01, 0x00,
  0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00,
  0x01, 0xE2, 0x21, 0xBC, 0x33, 0x00, 0x00, 0x00,
  0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60,
  0x82
]);
fs.writeFileSync(path.join(iconsDir, 'icon.png'), pngData);

console.log('✅ Created basic icon files (icon.ico and icon.png)');
console.log('💡 For production, replace these with proper high-quality icons');