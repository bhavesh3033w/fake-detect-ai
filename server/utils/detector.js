/**
 * FakeDetect AI - Detection Engine
 * Multi-layered fake screenshot detection
 */

const sharp = require('sharp');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// ── Helpers ──────────────────────────────────────────────────────────────────

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

/**
 * Download image buffer from URL (handles http/https)
 */
const fetchImageBuffer = (imageUrl) =>
  new Promise((resolve, reject) => {
    const parsedUrl = new URL(imageUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    client.get(imageUrl, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });

// ── Screenshot Type Detection ─────────────────────────────────────────────────

const detectScreenshotType = (ocrText = '', metadata = {}) => {
  const text = (ocrText || '').toLowerCase();

  if (
    text.includes('whatsapp') ||
    text.includes('end-to-end encrypted') ||
    text.includes('type a message') ||
    text.includes('online') && text.includes('ago')
  ) return 'whatsapp';

  if (
    text.includes('upi') ||
    text.includes('transaction id') ||
    text.includes('payment successful') ||
    text.includes('₹') ||
    text.includes('amount paid') ||
    text.includes('gpay') ||
    text.includes('phonepe') ||
    text.includes('paytm')
  ) return 'upi_payment';

  if (
    text.includes('instagram') ||
    text.includes('direct') ||
    text.includes('message requests') ||
    text.includes('seen')
  ) return 'instagram_dm';

  if (
    text.includes('from:') ||
    text.includes('to:') ||
    text.includes('subject:') ||
    text.includes('reply') ||
    text.includes('forward') ||
    text.includes('@gmail') ||
    text.includes('@yahoo') ||
    text.includes('@outlook')
  ) return 'email';

  const { width, height } = metadata;
  if (width && height) {
    const ratio = width / height;
    if (ratio > 1.7 && ratio < 1.9) return 'other'; // landscape likely not a phone screenshot
  }

  return 'unknown';
};

// ── Level 1: Metadata Analysis ────────────────────────────────────────────────

const analyzeMetadata = (metadata = {}) => {
  const findings = [];
  let score = 100;

  const { width, height, format, size } = metadata;

  // Check for unusually small dimensions
  if (width && height) {
    if (width < 200 || height < 200) {
      findings.push('Unusually small image dimensions detected');
      score -= 20;
    }
    // Check for non-standard screenshot ratios
    const ratio = width / height;
    if (ratio < 0.3 || ratio > 4) {
      findings.push('Abnormal aspect ratio for a screenshot');
      score -= 10;
    }
  }

  // Suspiciously round dimensions (often indicates manual creation)
  if (width && height && width % 100 === 0 && height % 100 === 0) {
    findings.push('Suspiciously round image dimensions — may indicate manual canvas creation');
    score -= 8;
  }

  // Format check
  if (format === 'gif') {
    findings.push('GIF format is unusual for authentic screenshots');
    score -= 15;
  }
  if (format === 'bmp') {
    findings.push('BMP format uncommon for mobile screenshots');
    score -= 5;
  }

  // File size vs resolution check
  if (width && height && size) {
    const pixels = width * height;
    const bytesPerPixel = size / pixels;
    if (bytesPerPixel < 0.1) {
      findings.push('Unusually low file size relative to resolution — possible heavy compression');
      score -= 12;
    }
    if (bytesPerPixel > 10) {
      findings.push('Unusually high file size relative to resolution — possible uncompressed or edited file');
      score -= 8;
    }
  }

  if (findings.length === 0) {
    findings.push('Metadata appears consistent with authentic screenshot');
  }

  return { score: clamp(score, 0, 100), findings };
};

// ── Level 2: Pixel Analysis ───────────────────────────────────────────────────

const analyzePixels = async (imageBuffer) => {
  const findings = [];
  let score = 100;

  try {
    const image = sharp(imageBuffer);
    const { width, height, channels } = await image.metadata();

    // Get raw pixel data
    const { data } = await image
      .raw()
      .toBuffer({ resolveWithObject: true });

    const totalPixels = width * height;
    const ch = channels || 3;

    // ── Noise Pattern Analysis ──
    let noiseSum = 0;
    let edgeCount = 0;
    const sampleStep = Math.max(1, Math.floor(totalPixels / 50000)); // sample at most 50k pixels

    for (let i = 0; i < totalPixels - width; i += sampleStep) {
      const idx = i * ch;
      const rightIdx = (i + 1) * ch;
      const downIdx = (i + width) * ch;

      if (rightIdx + ch - 1 < data.length && downIdx + ch - 1 < data.length) {
        const diffRight = Math.abs(data[idx] - data[rightIdx]) +
          Math.abs(data[idx + 1] - data[rightIdx + 1]) +
          Math.abs(data[idx + 2] - data[rightIdx + 2]);
        const diffDown = Math.abs(data[idx] - data[downIdx]) +
          Math.abs(data[idx + 1] - data[downIdx + 1]) +
          Math.abs(data[idx + 2] - data[downIdx + 2]);

        noiseSum += (diffRight + diffDown) / 6;
        if (diffRight > 30 || diffDown > 30) edgeCount++;
      }
    }

    const sampledPixels = Math.floor(totalPixels / sampleStep);
    const avgNoise = noiseSum / sampledPixels;
    const edgeRatio = edgeCount / sampledPixels;

    // Very low noise in "text-heavy" image might indicate digital/synthetic
    if (avgNoise < 0.5 && edgeRatio < 0.02) {
      findings.push('Unusually clean pixel pattern — may indicate digitally generated content');
      score -= 15;
    }

    // Very high noise might indicate manipulation
    if (avgNoise > 40) {
      findings.push('High noise level detected — possible compression artifact injection');
      score -= 20;
    }

    // ── Color Distribution Analysis ──
    const colorBuckets = new Array(16).fill(0);
    for (let i = 0; i < data.length; i += ch * sampleStep) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const bucket = Math.floor(brightness / 16);
      colorBuckets[Math.min(bucket, 15)]++;
    }

    const maxBucket = Math.max(...colorBuckets);
    const dominance = maxBucket / (sampledPixels);

    if (dominance > 0.85) {
      findings.push('Extreme color dominance — image may be heavily filtered or artificially generated');
      score -= 18;
    }

    // ── Block Artifact Detection ──
    // Check for JPEG block artifacts (8x8 blocks) - sign of re-compression
    let blockArtifacts = 0;
    for (let y = 8; y < height - 8; y += 8) {
      for (let x = 8; x < width - 8; x += 8) {
        const idx = (y * width + x) * ch;
        const prevRowIdx = ((y - 1) * width + x) * ch;
        if (prevRowIdx >= 0 && idx < data.length && prevRowIdx < data.length) {
          const diff = Math.abs(data[idx] - data[prevRowIdx]) +
            Math.abs(data[idx + 1] - data[prevRowIdx + 1]) +
            Math.abs(data[idx + 2] - data[prevRowIdx + 2]);
          if (diff > 25) blockArtifacts++;
        }
      }
    }

    const blockRatio = blockArtifacts / ((width / 8) * (height / 8));
    if (blockRatio > 0.3) {
      findings.push('JPEG block artifacts detected — image may have been re-compressed after editing');
      score -= 15;
    }

    // ── Copy-Move Detection (simplified) ──
    // Compare 16x16 tiles in sampled regions
    const tileSize = 16;
    const tilesX = Math.floor(width / tileSize);
    const tilesY = Math.floor(height / tileSize);
    const tileHashes = new Map();
    let duplicateTiles = 0;
    const maxTiles = Math.min(tilesX * tilesY, 200);
    let tilesChecked = 0;

    for (let ty = 0; ty < tilesY && tilesChecked < maxTiles; ty++) {
      for (let tx = 0; tx < tilesX && tilesChecked < maxTiles; tx++) {
        tilesChecked++;
        let tileSum = 0;
        for (let py = 0; py < tileSize; py++) {
          for (let px = 0; px < tileSize; px++) {
            const pixIdx = ((ty * tileSize + py) * width + (tx * tileSize + px)) * ch;
            if (pixIdx < data.length) {
              tileSum += data[pixIdx] + data[pixIdx + 1] + data[pixIdx + 2];
            }
          }
        }
        const tileKey = Math.floor(tileSum / (tileSize * tileSize * ch));
        if (tileHashes.has(tileKey)) {
          duplicateTiles++;
        }
        tileHashes.set(tileKey, true);
      }
    }

    const duplicateRatio = duplicateTiles / tilesChecked;
    if (duplicateRatio > 0.4) {
      findings.push('Repeated pixel regions detected — possible copy-move manipulation');
      score -= 20;
    }

    if (findings.length === 0) {
      findings.push('Pixel analysis shows no significant anomalies');
    }

  } catch (err) {
    findings.push('Pixel analysis could not be completed');
    score -= 5;
  }

  return { score: clamp(score, 0, 100), findings };
};

// ── Level 3: AI Analysis (Simulated CNN with heuristics) ─────────────────────

const aiAnalysis = async (imageBuffer, screenshotType, ocrText = '') => {
  const findings = [];
  let score = 100;

  try {
    const image = sharp(imageBuffer);
    const meta = await image.metadata();
    const { width, height } = meta;

    // ── Font Consistency Check (via color region analysis) ──
    const { data } = await image.resize(256, 256).raw().toBuffer({ resolveWithObject: true });
    const ch = 3;

    // Analyze top strip and bottom strip (typically text areas in chat screenshots)
    const topRegion = [];
    const bottomRegion = [];
    for (let x = 0; x < 256; x++) {
      for (let y = 0; y < 20; y++) {
        const i = (y * 256 + x) * ch;
        topRegion.push((data[i] + data[i + 1] + data[i + 2]) / 3);
      }
      for (let y = 236; y < 256; y++) {
        const i = (y * 256 + x) * ch;
        bottomRegion.push((data[i] + data[i + 1] + data[i + 2]) / 3);
      }
    }

    const topAvg = topRegion.reduce((a, b) => a + b, 0) / topRegion.length;
    const bottomAvg = bottomRegion.reduce((a, b) => a + b, 0) / bottomRegion.length;

    // Very different top/bottom brightness unusual for most screenshot types
    if (Math.abs(topAvg - bottomAvg) > 80 && screenshotType !== 'unknown') {
      findings.push('Inconsistent brightness distribution between top and bottom regions');
      score -= 12;
    }

    // ── Shadow / Gradient Consistency ──
    let gradientViolations = 0;
    for (let y = 1; y < 255; y++) {
      const prev = data[((y - 1) * 256 + 128) * ch];
      const curr = data[(y * 256 + 128) * ch];
      const diff = Math.abs(curr - prev);
      if (diff > 50) gradientViolations++;
    }
    if (gradientViolations > 40) {
      findings.push('Inconsistent shadow gradients detected — possible compositing artifacts');
      score -= 15;
    }

    // ── Screenshot-Type Specific Checks ──
    if (screenshotType === 'upi_payment') {
      if (ocrText) {
        const text = ocrText.toLowerCase();
        // Check for suspicious patterns in payment screenshots
        if (!text.includes('₹') && !text.includes('rs') && !text.includes('inr')) {
          findings.push('UPI payment screenshot missing currency indicators');
          score -= 20;
        }
        if (text.includes('test') || text.includes('demo') || text.includes('sample')) {
          findings.push('Test/demo keywords found in payment screenshot text');
          score -= 35;
        }
      }
    }

    if (screenshotType === 'whatsapp' || screenshotType === 'instagram_dm') {
      if (ocrText) {
        const text = ocrText.toLowerCase();
        // Check for timestamp consistency
        const timePattern = /\d{1,2}:\d{2}\s*(am|pm)?/gi;
        const times = text.match(timePattern) || [];
        if (times.length > 5) {
          // Too many timestamps clustered in single image is suspicious
          findings.push('Unusually high number of timestamps detected — possible chat fabrication');
          score -= 15;
        }
      }
    }

    // ── Saturation Analysis ──
    const { data: hsvData } = await image
      .resize(128, 128)
      .toColorspace('srgb')
      .raw()
      .toBuffer({ resolveWithObject: true });

    let highSatCount = 0;
    for (let i = 0; i < hsvData.length; i += ch) {
      const r = hsvData[i] / 255;
      const g = hsvData[i + 1] / 255;
      const b = hsvData[i + 2] / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      if (sat > 0.9) highSatCount++;
    }

    const satRatio = highSatCount / (128 * 128);
    if (satRatio > 0.25) {
      findings.push('Oversaturated colors detected — may indicate digital enhancement or fabrication');
      score -= 12;
    }

    // ── Sharpness Inconsistency ──
    // Different regions having vastly different sharpness is a manipulation signal
    const regions = [
      { x: 0, y: 0 },
      { x: 128, y: 0 },
      { x: 0, y: 128 },
      { x: 128, y: 128 },
    ];
    const regionSharpness = [];

    for (const region of regions) {
      let edgePx = 0;
      for (let dy = 1; dy < 128; dy++) {
        for (let dx = 1; dx < 128; dx++) {
          const idx = (dy * 256 + dx) * ch;
          const leftIdx = (dy * 256 + dx - 1) * ch;
          if (idx < data.length && leftIdx >= 0) {
            const diff = Math.abs(data[idx] - data[leftIdx]);
            if (diff > 20) edgePx++;
          }
        }
      }
      regionSharpness.push(edgePx);
    }

    const maxSharp = Math.max(...regionSharpness);
    const minSharp = Math.min(...regionSharpness);
    if (maxSharp > 0 && minSharp / maxSharp < 0.15) {
      findings.push('Sharpness inconsistency between image regions — possible selective editing or compositing');
      score -= 18;
    }

  } catch (err) {
    findings.push('Advanced AI analysis could not complete all checks');
    score -= 3;
  }

  if (findings.length === 0) {
    findings.push('AI analysis found no significant manipulation indicators');
  }

  return { score: clamp(score, 0, 100), findings };
};

// ── OCR Text Analysis ─────────────────────────────────────────────────────────

const analyzeOcrText = (ocrText = '', screenshotType = 'unknown') => {
  const findings = [];
  const text = ocrText || '';

  if (!text || text.length < 5) {
    return { findings: ['OCR extracted minimal text — cannot perform text analysis'] };
  }

  // Check for suspicious formatting patterns
  const suspiciousPatterns = [
    { pattern: /(\d{1,2}:\d{2})\s*\1/, message: 'Duplicate timestamps found in same image' },
    { pattern: /[a-z][A-Z]{3,}[a-z]/, message: 'Inconsistent capitalization pattern detected' },
    { pattern: /(test|dummy|fake|sample|demo)\s*(message|payment|transaction)/i, message: 'Test/fake indicator words detected in text' },
  ];

  for (const { pattern, message } of suspiciousPatterns) {
    if (pattern.test(text)) {
      findings.push(message);
    }
  }

  // Check for common OCR-detectable manipulation in payment screenshots
  if (screenshotType === 'upi_payment') {
    if (/[0-9]{10,}/.test(text) === false) {
      findings.push('No valid transaction ID format found in payment screenshot');
    }
  }

  if (findings.length === 0) {
    findings.push('Text analysis found no formatting inconsistencies');
  }

  return { findings };
};

// ── Heatmap Generator ─────────────────────────────────────────────────────────

const generateHeatmap = async (imageBuffer, analysisScore) => {
  try {
    const image = sharp(imageBuffer);
    const { width, height } = await image.metadata();

    const safeWidth = Math.min(width || 400, 1200);
    const safeHeight = Math.min(height || 300, 900);

    // Create overlay based on suspicious score
    const suspicionLevel = 100 - analysisScore; // Higher = more suspicious
    const alpha = Math.floor((suspicionLevel / 100) * 120); // Max alpha 120

    // Generate a simple red tinted overlay for suspicious areas
    // In production, this would be a real CNN-generated saliency map
    const overlayBuffer = await sharp({
      create: {
        width: safeWidth,
        height: safeHeight,
        channels: 4,
        background: { r: 239, g: 68, b: 68, alpha: alpha },
      },
    })
      .png()
      .toBuffer();

    // Composite the heatmap overlay onto original
    const heatmapBuffer = await sharp(imageBuffer)
      .resize(safeWidth, safeHeight)
      .composite([{
        input: overlayBuffer,
        blend: 'over',
      }])
      .jpeg({ quality: 85 })
      .toBuffer();

    return `data:image/jpeg;base64,${heatmapBuffer.toString('base64')}`;
  } catch (err) {
    return null;
  }
};

// ── Master Analyzer ───────────────────────────────────────────────────────────

const analyzeImage = async (imageUrl, metadata = {}) => {
  const startTime = Date.now();

  try {
    // Download image
    const imageBuffer = await fetchImageBuffer(imageUrl);

    // ── Level 1: Metadata
    const level1 = analyzeMetadata(metadata);

    // ── Level 2: Pixel Analysis
    const level2 = await analyzePixels(imageBuffer);

    // ── Basic OCR simulation (without Tesseract for speed, can integrate)
    const ocrText = '';
    const screenshotType = detectScreenshotType(ocrText, metadata);

    // ── Level 3: AI Analysis
    const level3 = await aiAnalysis(imageBuffer, screenshotType, ocrText);

    // ── OCR Text Analysis
    const ocrAnalysis = analyzeOcrText(ocrText, screenshotType);

    // ── Aggregate Score (weighted)
    const aggregateScore = Math.round(
      level1.score * 0.25 +
      level2.score * 0.40 +
      level3.score * 0.35
    );

    // ── Determine Result
    let result;
    if (aggregateScore >= 75) result = 'real';
    else if (aggregateScore >= 45) result = 'suspicious';
    else result = 'fake';

    // ── Combine all reasons
    const allReasons = [
      ...level1.findings,
      ...level2.findings,
      ...level3.findings,
      ...ocrAnalysis.findings,
    ].filter((r) => !r.includes('no significant') && !r.includes('appears consistent') && !r.includes('found no'));

    const reasons = allReasons.length > 0
      ? allReasons
      : ['No manipulation indicators found', 'Image appears authentic'];

    // ── Generate Heatmap (only for suspicious/fake)
    let heatmapBase64 = null;
    if (result !== 'real') {
      heatmapBase64 = await generateHeatmap(imageBuffer, aggregateScore);
    }

    return {
      result,
      confidence: aggregateScore,
      reasons,
      screenshotType,
      analysisLevels: {
        level1: { score: level1.score, findings: level1.findings },
        level2: { score: level2.score, findings: level2.findings },
        level3: { score: level3.score, findings: level3.findings },
      },
      ocrText,
      ocrFindings: ocrAnalysis.findings,
      heatmapBase64,
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    throw new Error(`Analysis failed: ${error.message}`);
  }
};

module.exports = { analyzeImage, detectScreenshotType };
