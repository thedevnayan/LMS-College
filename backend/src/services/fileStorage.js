const fs = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
const { ApiError } = require('../middleware/errorHandler');
const cloudinary = require('cloudinary').v2;
cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });

async function detectFile(filePath) {
  const file = await fs.open(filePath, 'r');
  try {
    const { size } = await file.stat();
    const head = Buffer.alloc(16); await file.read(head, 0, 16, 0);
    if (head.subarray(0, 5).toString() === '%PDF-') return { format: 'pdf', mime: 'application/pdf' };
    if (head.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return { format: 'png', mime: 'image/png' };
    if (head[0] === 255 && head[1] === 216 && head[2] === 255) return { format: 'jpg', mime: 'image/jpeg' };
    if (head.subarray(0,4).toString() === 'RIFF' && head.subarray(8,12).toString() === 'WEBP') return { format: 'webp', mime: 'image/webp' };
    // Validate the ZIP central directory without decompressing untrusted Office
    // content. Macro-enabled, encrypted, traversal and oversized archives fail.
    if (head.readUInt32LE(0) === 0x04034b50) {
      const tail = Buffer.alloc(Math.min(size, 65557)); await file.read(tail, 0, tail.length, size - tail.length);
      const end = tail.lastIndexOf(Buffer.from([0x50,0x4b,0x05,0x06]));
      if (end < 0 || end + 22 > tail.length) throw new Error('Invalid archive');
      const count = tail.readUInt16LE(end + 10), bytes = tail.readUInt32LE(end + 12), offset = tail.readUInt32LE(end + 16);
      if (count > 2000 || bytes > 1024 * 1024 || offset + bytes > size || !count) throw new Error('Archive limits');
      const directory = Buffer.alloc(bytes); await file.read(directory, 0, bytes, offset);
      const names = []; let pos = 0, unpacked = 0;
      for (let n = 0; n < count; n++) {
        if (pos + 46 > bytes || directory.readUInt32LE(pos) !== 0x02014b50 || (directory.readUInt16LE(pos + 8) & 1)) throw new Error('Invalid archive entry');
        const length = directory.readUInt16LE(pos + 28);
        unpacked += directory.readUInt32LE(pos + 24);
        const next = pos + 46 + length + directory.readUInt16LE(pos + 30) + directory.readUInt16LE(pos + 32);
        if (next > bytes || unpacked > 100 * 1024 * 1024) throw new Error('Archive limits');
        const name = directory.subarray(pos + 46, pos + 46 + length).toString();
        if (/(^|[\\/])\.\.([\\/]|$)|vbaProject|\.exe$|\.js$|\.bin$/i.test(name) || name.startsWith('/')) throw new Error('Unsafe archive entry');
        names.push(name); pos = next;
      }
      if (names.includes('[Content_Types].xml') && names.includes('word/document.xml')) return { format: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
      if (names.includes('[Content_Types].xml') && names.includes('ppt/presentation.xml')) return { format: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
    }
    throw new Error('Unsupported content');
  } catch { throw new ApiError(400, 'INVALID_FILE', 'Upload a valid PDF, PNG, JPEG, WebP, DOCX or PPTX file. Legacy DOC/PPT and macros are not accepted.'); }
  finally { await file.close(); }
}
async function storeFile(file) {
  const detected = await detectFile(file.path);
  if (file.mimetype !== detected.mime) throw new ApiError(400, 'INVALID_FILE', 'File content does not match its declared type');
  if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET || !process.env.CLOUDINARY_CLOUD_NAME) throw new ApiError(503, 'STORAGE_UNAVAILABLE', 'Private file storage is not configured');
  const publicId = 'skillbery_materials/' + randomUUID() + '.' + detected.format;
  await cloudinary.uploader.upload(file.path, { public_id: publicId, resource_type: 'raw', type: 'authenticated', overwrite: false, timeout: 30000 });
  return { publicId, format: detected.format, mime: detected.mime, bytes: file.size, originalName: file.originalname.replace(/[^a-zA-Z0-9_. -]/g, '_').slice(0,150) };
}
async function removeStoredFile(storage) {
  if (storage?.publicId) await cloudinary.uploader.destroy(storage.publicId, { resource_type: 'raw', type: 'authenticated', invalidate: true });
}
function downloadUrl(storage) {
  return cloudinary.utils.private_download_url(storage.publicId, '', { resource_type: 'raw', type: 'authenticated', expires_at: Math.floor(Date.now()/1000) + 60, attachment: true });
}
module.exports = { detectFile, storeFile, removeStoredFile, downloadUrl, cloudinary };
