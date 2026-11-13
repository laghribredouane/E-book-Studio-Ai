import PDFDocument from 'pdfkit';
import JSZip from 'jszip';
import {
  AlignmentType,
  Document as DocxDocument,
  HeadingLevel,
  ImageRun,
  Packer,
  PageBreak,
  Paragraph,
  TextRun,
} from 'docx';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { CoverConfig, LayoutConfig } from '../db/schema.ts';

export interface ExportBookPayload {
  id: string;
  title: string;
  subtitle: string;
  authorName: string;
  description: string;
  languageCode: string;
  coverImageUrl: string | null;
  coverConfig: CoverConfig;
  layoutConfig: LayoutConfig;
  chapters: Array<{
    chapterNumber: number;
    title: string;
    summary: string;
    contentHtml: string;
  }>;
}

interface ParsedBlock {
  type: 'h1' | 'h2' | 'h3' | 'p' | 'blockquote' | 'li' | 'img';
  text: string;
  src?: string;
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&rsquo;/gi, '’')
    .replace(/&lsquo;/gi, '‘')
    .replace(/&ldquo;/gi, '“')
    .replace(/&rdquo;/gi, '”')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&hellip;/gi, '…');
}

function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function parseHtmlToBlocks(html: string): ParsedBlock[] {
  if (!html || !html.trim()) return [];
  const blocks: ParsedBlock[] = [];

  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const tokenized = html.replace(imgRegex, (_m, src) => `\n<p data-img="${src}">[IMAGE]</p>\n`);

  const blockRegex = /<(h1|h2|h3|p|blockquote|li)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(tokenized)) !== null) {
    const tag = match[1].toLowerCase() as ParsedBlock['type'];
    const fullOpen = match[0];
    const dataImgMatch = fullOpen.match(/data-img=["']([^"']+)["']/i);
    if (dataImgMatch) {
      blocks.push({ type: 'img', text: '', src: dataImgMatch[1] });
      continue;
    }
    const text = stripTags(match[2]);
    if (text) {
      blocks.push({ type: tag, text });
    }
  }

  if (blocks.length === 0) {
    const plain = stripTags(html);
    if (plain) {
      for (const line of plain.split(/\n+/)) {
        if (line.trim()) blocks.push({ type: 'p', text: line.trim() });
      }
    }
  }

  return blocks;
}

async function resolveImageBuffer(src?: string | null): Promise<{ buffer: Buffer; mime: string } | null> {
  if (!src) return null;
  try {
    if (src.startsWith('data:image/')) {
      const match = src.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (!match) return null;
      return {
        mime: match[1],
        buffer: Buffer.from(match[2], 'base64'),
      };
    }

    if (src.startsWith('/src/assets/') || src.startsWith('/public/')) {
      const cleanRel = src.replace(/^\/+/, '');
      const fullPath = path.resolve(process.cwd(), cleanRel);
      const buf = await fs.readFile(fullPath);
      const ext = path.extname(fullPath).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      return { buffer: buf, mime };
    }
  } catch (err) {
    console.warn('Could not load image for export:', src, err);
  }
  return null;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sanitizeHtmlForXhtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '<br />')
    .replace(/<hr\s*\/?>/gi, '<hr />')
    .replace(/<img([^>]*?)(?<!\/)>/gi, '<img$1 />')
    .replace(/&nbsp;/gi, '&#160;');
}

export async function generatePdfBuffer(book: ExportBookPayload): Promise<Buffer> {
  const layout = book.layoutConfig;
  const marginPt = Math.max(28, Math.round((layout.marginMm || 20) * 2.83465));
  const sizeMap: Record<string, string> = {
    A4: 'A4',
    A5: 'A5',
    Letter: 'LETTER',
  };

  const doc = new PDFDocument({
    size: sizeMap[layout.pageFormat] || 'A4',
    margins: { top: marginPt + 14, bottom: marginPt + 14, left: marginPt, right: marginPt },
    bufferPages: true,
    info: {
      Title: book.title,
      Author: book.authorName,
      Creator: 'EBOOK STUDIO AI',
    },
  });

  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  const bodyFont = layout.fontFamily === 'sans' ? 'Helvetica' : 'Times-Roman';
  const boldFont = layout.fontFamily === 'sans' ? 'Helvetica-Bold' : 'Times-Bold';
  const italicFont = layout.fontFamily === 'sans' ? 'Helvetica-Oblique' : 'Times-Italic';
  const fontSize = layout.fontSizePt || 11;
  const lineGap = Math.max(2, Math.round((layout.lineHeight - 1) * fontSize));

  // 1. Cover Page
  if (layout.includeCoverPage) {
    const bgHex = book.coverConfig?.backgroundColor || '#0F172A';
    const textHex = book.coverConfig?.textColor || '#FFFFFF';
    const accentHex = book.coverConfig?.accentColor || '#D97706';

    doc.rect(0, 0, doc.page.width, doc.page.height).fill(bgHex);

    const coverImg = await resolveImageBuffer(book.coverImageUrl);
    if (coverImg) {
      try {
        doc.save();
        doc.opacity(0.32);
        doc.image(coverImg.buffer, 0, 0, {
          width: doc.page.width,
          height: doc.page.height,
        });
        doc.restore();
      } catch {
        // Ignore non-PNG/JPEG cover image issues
      }
    }

    doc
      .fillColor(accentHex)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text((book.coverConfig?.badgeText || 'EBOOK STUDIO EDITION').toUpperCase(), marginPt, 84, {
        align: book.coverConfig?.titleAlign || 'left',
      });

    doc
      .fillColor(textHex)
      .font(boldFont)
      .fontSize(32)
      .text(book.title, marginPt, 160, {
        width: doc.page.width - marginPt * 2,
        align: book.coverConfig?.titleAlign || 'left',
      });

    if (book.subtitle && book.coverConfig?.showSubtitle !== false) {
      doc.moveDown(0.75);
      doc
        .fillColor(textHex)
        .font(italicFont)
        .fontSize(16)
        .text(book.subtitle, {
          width: doc.page.width - marginPt * 2,
          align: book.coverConfig?.titleAlign || 'left',
        });
    }

    doc
      .fillColor(accentHex)
      .rect(marginPt, doc.page.height - 135, 64, 3)
      .fill();

    if (book.coverConfig?.showAuthor !== false) {
      doc
        .fillColor(textHex)
        .font('Helvetica-Bold')
        .fontSize(14)
        .text(book.authorName, marginPt, doc.page.height - 115, {
          width: doc.page.width - marginPt * 2,
          align: book.coverConfig?.titleAlign || 'left',
        });
    }

    doc.addPage();
  }

  // 2. Table of Contents
  if (layout.includeToc && book.chapters.length > 0) {
    doc.fillColor('#0F172A').font(boldFont).fontSize(20).text('Table des matières');
    doc.moveDown(1);

    for (const ch of book.chapters) {
      doc
        .fillColor('#1E293B')
        .font(boldFont)
        .fontSize(12)
        .text(`Chapitre ${ch.chapterNumber} — ${ch.title}`);
      if (ch.summary) {
        doc
          .fillColor('#475569')
          .font(bodyFont)
          .fontSize(10)
          .text(ch.summary, { indent: 12 });
      }
      doc.moveDown(0.5);
    }

    doc.addPage();
  }

  // 3. Chapters
  for (let idx = 0; idx < book.chapters.length; idx++) {
    const ch = book.chapters[idx];
    if (idx > 0) {
      doc.addPage();
    }

    doc
      .fillColor('#6D28D9')
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(`CHAPITRE ${ch.chapterNumber}`);
    doc.moveDown(0.25);

    doc.fillColor('#0F172A').font(boldFont).fontSize(22).text(ch.title);
    doc.moveDown(0.8);

    const blocks = parseHtmlToBlocks(ch.contentHtml);
    if (blocks.length === 0 && ch.summary) {
      blocks.push({ type: 'p', text: ch.summary });
    }

    for (const block of blocks) {
      if (block.type === 'img' && block.src) {
        const img = await resolveImageBuffer(block.src);
        if (img) {
          try {
            if (doc.y > doc.page.height - 260) {
              doc.addPage();
            }
            doc.image(img.buffer, {
              fit: [doc.page.width - marginPt * 2, 240],
              align: 'center',
            });
            doc.moveDown(0.8);
          } catch {
            // Skip unreadable image
          }
        }
        continue;
      }

      if (block.type === 'h1' || block.type === 'h2') {
        doc.moveDown(0.5);
        doc.fillColor('#0F172A').font(boldFont).fontSize(15).text(block.text, { lineGap: 3 });
        doc.moveDown(0.35);
      } else if (block.type === 'h3') {
        doc.moveDown(0.35);
        doc.fillColor('#1E293B').font(boldFont).fontSize(12.5).text(block.text, { lineGap: 2 });
        doc.moveDown(0.25);
      } else if (block.type === 'blockquote') {
        doc.moveDown(0.3);
        doc
          .fillColor('#334155')
          .font(italicFont)
          .fontSize(fontSize)
          .text(`« ${block.text} »`, { indent: 18, lineGap });
        doc.moveDown(0.4);
      } else if (block.type === 'li') {
        doc
          .fillColor('#1E293B')
          .font(bodyFont)
          .fontSize(fontSize)
          .text(`•  ${block.text}`, { indent: 12, lineGap });
        doc.moveDown(0.2);
      } else {
        doc
          .fillColor('#1E293B')
          .font(bodyFont)
          .fontSize(fontSize)
          .text(block.text, { align: 'justify', lineGap });
        doc.moveDown(0.55);
      }
    }
  }

  // 4. Headers, Footers, Page Numbers
  const range = doc.bufferedPageRange();
  const startPage = layout.includeCoverPage ? 1 : 0;
  for (let i = startPage; i < range.count; i++) {
    doc.switchToPage(i);
    const oldBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    if (layout.showHeader) {
      doc
        .fillColor('#64748B')
        .font('Helvetica')
        .fontSize(8.5)
        .text(book.title, marginPt, 24, {
          width: doc.page.width - marginPt * 2,
          align: 'right',
        });
    }

    if (layout.showFooter || layout.showPageNumbers) {
      const footerLeft = layout.showFooter ? book.authorName : '';
      const footerRight = layout.showPageNumbers ? `${i + 1} / ${range.count}` : '';
      const y = doc.page.height - 32;
      if (footerLeft) {
        doc.fillColor('#64748B').font('Helvetica').fontSize(8.5).text(footerLeft, marginPt, y);
      }
      if (footerRight) {
        doc
          .fillColor('#475569')
          .font('Helvetica')
          .fontSize(8.5)
          .text(footerRight, marginPt, y, {
            width: doc.page.width - marginPt * 2,
            align: 'right',
          });
      }
    }

    doc.page.margins.bottom = oldBottomMargin;
  }

  doc.end();
  return await new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

export async function generateEpubBuffer(book: ExportBookPayload): Promise<Buffer> {
  const zip = new JSZip();
  const isRtl = book.languageCode === 'ar';
  const dirAttr = isRtl ? ' dir="rtl"' : '';

  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  zip.folder('META-INF')?.file(
    'container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  const oebps = zip.folder('OEBPS')!;
  const mediaItems: string[] = [];

  let coverAssetHref: string | null = null;
  const coverImg = await resolveImageBuffer(book.coverImageUrl);
  if (coverImg) {
    const ext = coverImg.mime === 'image/png' ? 'png' : 'jpg';
    coverAssetHref = `images/cover.${ext}`;
    oebps.file(coverAssetHref, coverImg.buffer);
    mediaItems.push(
      `<item id="cover-image" href="${coverAssetHref}" media-type="${coverImg.mime}" properties="cover-image"/>`
    );
  }

  oebps.file(
    'styles.css',
    `body {
  font-family: ${book.layoutConfig.fontFamily === 'sans' ? 'sans-serif' : 'Georgia, serif'};
  line-height: ${book.layoutConfig.lineHeight || 1.65};
  margin: 1.5em;
  color: #111827;
}
h1, h2, h3 { font-family: sans-serif; color: #0F172A; line-height: 1.25; }
blockquote { border-left: 3px solid #6D28D9; padding-left: 1em; font-style: italic; color: #334155; }
img { max-width: 100%; height: auto; display: block; margin: 1.2em auto; }
.cover { text-align: center; padding: 3em 1.5em; background: ${book.coverConfig.backgroundColor}; color: ${book.coverConfig.textColor}; }
.cover h1 { color: ${book.coverConfig.textColor}; font-size: 2.2em; }
.cover img { max-height: 420px; margin-bottom: 1.5em; }`
  );

  oebps.file(
    'cover.xhtml',
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${escapeXml(book.languageCode)}"${dirAttr}>
<head>
  <title>${escapeXml(book.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body class="cover">
  ${coverAssetHref ? `<img src="${coverAssetHref}" alt="${escapeXml(book.title)}"/>` : ''}
  <h1>${escapeXml(book.title)}</h1>
  ${book.subtitle ? `<p><em>${escapeXml(book.subtitle)}</em></p>` : ''}
  <p><strong>${escapeXml(book.authorName)}</strong></p>
</body>
</html>`
  );

  const chapterManifest: string[] = [];
  const spineRefs: string[] = ['<itemref idref="cover"/>', '<itemref idref="nav"/>'];
  const navLis: string[] = [];
  const ncxPoints: string[] = [];

  let embeddedImgIndex = 0;

  for (const ch of book.chapters) {
    const chFile = `chapter-${ch.chapterNumber}.xhtml`;
    let bodyHtml = ch.contentHtml || `<p>${escapeXml(ch.summary || '')}</p>`;

    // Embed inline data/local images inside EPUB archive
    const imgMatches = [...bodyHtml.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)];
    for (const m of imgMatches) {
      const origSrc = m[1];
      const imgBuf = await resolveImageBuffer(origSrc);
      if (imgBuf) {
        embeddedImgIndex += 1;
        const ext = imgBuf.mime === 'image/png' ? 'png' : 'jpg';
        const href = `images/img-${embeddedImgIndex}.${ext}`;
        oebps.file(href, imgBuf.buffer);
        mediaItems.push(`<item id="img-${embeddedImgIndex}" href="${href}" media-type="${imgBuf.mime}"/>`);
        bodyHtml = bodyHtml.replace(origSrc, href);
      }
    }

    const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${escapeXml(book.languageCode)}"${dirAttr}>
<head>
  <title>${escapeXml(ch.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <p style="color:#6D28D9;font-size:0.85em;font-weight:bold;">CHAPITRE ${ch.chapterNumber}</p>
  <h1>${escapeXml(ch.title)}</h1>
  ${sanitizeHtmlForXhtml(bodyHtml)}
</body>
</html>`;

    oebps.file(chFile, xhtml);
    const id = `ch-${ch.chapterNumber}`;
    chapterManifest.push(`<item id="${id}" href="${chFile}" media-type="application/xhtml+xml"/>`);
    spineRefs.push(`<itemref idref="${id}"/>`);
    navLis.push(`<li><a href="${chFile}">${escapeXml(`${ch.chapterNumber}. ${ch.title}`)}</a></li>`);
    ncxPoints.push(
      `<navPoint id="navPoint-${ch.chapterNumber}" playOrder="${ch.chapterNumber}">
        <navLabel><text>${escapeXml(`${ch.chapterNumber}. ${ch.title}`)}</text></navLabel>
        <content src="${chFile}"/>
      </navPoint>`
    );
  }

  oebps.file(
    'nav.xhtml',
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${escapeXml(book.languageCode)}"${dirAttr}>
<head>
  <title>Table des matières</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table des matières</h1>
    <ol>
      ${navLis.join('\n      ')}
    </ol>
  </nav>
</body>
</html>`
  );

  oebps.file(
    'toc.ncx',
    `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${escapeXml(book.id)}"/>
    <meta name="dtb:depth" content="1"/>
  </head>
  <docTitle><text>${escapeXml(book.title)}</text></docTitle>
  <navMap>
    ${ncxPoints.join('\n    ')}
  </navMap>
</ncx>`
  );

  oebps.file(
    'content.opf',
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:${escapeXml(book.id)}</dc:identifier>
    <dc:title>${escapeXml(book.title)}</dc:title>
    <dc:creator>${escapeXml(book.authorName)}</dc:creator>
    <dc:language>${escapeXml(book.languageCode)}</dc:language>
    <dc:description>${escapeXml(book.description || book.subtitle)}</dc:description>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    <item id="styles" href="styles.css" media-type="text/css"/>
    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    ${chapterManifest.join('\n    ')}
    ${mediaItems.join('\n    ')}
  </manifest>
  <spine toc="ncx"${isRtl ? ' page-progression-direction="rtl"' : ''}>
    ${spineRefs.join('\n    ')}
  </spine>
</package>`
  );

  return await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

export async function generateHtmlString(book: ExportBookPayload): Promise<string> {
  const isRtl = book.languageCode === 'ar';
  let coverDataUri = book.coverImageUrl || '';
  if (coverDataUri.startsWith('/src/assets/')) {
    const img = await resolveImageBuffer(coverDataUri);
    if (img) {
      coverDataUri = `data:${img.mime};base64,${img.buffer.toString('base64')}`;
    }
  }

  const tocHtml = book.chapters
    .map((c) => `<li><a href="#chapter-${c.chapterNumber}">${c.chapterNumber}. ${escapeXml(c.title)}</a></li>`)
    .join('\n');

  const renderedChapters: string[] = [];
  for (const c of book.chapters) {
    let chapterBody = c.contentHtml || `<p>${escapeXml(c.summary)}</p>`;
    const matches = [...chapterBody.matchAll(/<img[^>]+src=["'](\/src\/assets\/[^"']+)["'][^>]*>/gi)];
    for (const m of matches) {
      const localUrl = m[1];
      const img = await resolveImageBuffer(localUrl);
      if (img) {
        const dataUri = `data:${img.mime};base64,${img.buffer.toString('base64')}`;
        chapterBody = chapterBody.replace(localUrl, dataUri);
      }
    }
    renderedChapters.push(`
    <article id="chapter-${c.chapterNumber}" class="chapter">
      <div class="chapter-kicker">Chapitre ${c.chapterNumber}</div>
      <h2>${escapeXml(c.title)}</h2>
      ${chapterBody}
    </article>`);
  }
  const chaptersHtml = renderedChapters.join('\n');

  return `<!doctype html>
<html lang="${escapeXml(book.languageCode)}"${isRtl ? ' dir="rtl"' : ''}>
<head>
  <meta charset="UTF-8" />
  <title>${escapeXml(book.title)}</title>
  <style>
    body { max-width: 760px; margin: 3rem auto; padding: 0 1.5rem; font-family: ${
      book.layoutConfig.fontFamily === 'sans' ? 'system-ui, sans-serif' : 'Georgia, serif'
    }; line-height: ${book.layoutConfig.lineHeight || 1.7}; color: #0F172A; background: #FAFAF9; }
    .cover { padding: 4rem 2.5rem; border-radius: 16px; background: ${book.coverConfig.backgroundColor}; color: ${book.coverConfig.textColor}; margin-bottom: 3rem; text-align: ${book.coverConfig.titleAlign}; }
    .cover img { max-width: 280px; border-radius: 10px; margin-bottom: 1.5rem; }
    .toc { padding: 1.5rem 2rem; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; margin-bottom: 3rem; }
    .chapter { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 2.5rem; margin-bottom: 2rem; }
    .chapter-kicker { font-family: system-ui, sans-serif; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #6D28D9; }
    blockquote { border-left: 3px solid #6D28D9; padding-left: 1rem; font-style: italic; color: #334155; }
    img { max-width: 100%; border-radius: 8px; }
  </style>
</head>
<body>
  <section class="cover">
    ${coverDataUri ? `<img src="${coverDataUri}" alt="${escapeXml(book.title)}" />` : ''}
    <h1>${escapeXml(book.title)}</h1>
    ${book.subtitle ? `<p><em>${escapeXml(book.subtitle)}</em></p>` : ''}
    <p><strong>${escapeXml(book.authorName)}</strong></p>
  </section>
  ${
    book.layoutConfig.includeToc
      ? `<nav class="toc"><h2>Table des matières</h2><ol>${tocHtml}</ol></nav>`
      : ''
  }
  ${chaptersHtml}
</body>
</html>`;
}

export async function generateDocxBuffer(book: ExportBookPayload): Promise<Buffer> {
  const children: Paragraph[] = [];

  if (book.layoutConfig.includeCoverPage) {
    const coverImg = await resolveImageBuffer(book.coverImageUrl);
    if (coverImg) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: coverImg.buffer,
              transformation: { width: 260, height: 340 },
              type: coverImg.mime === 'image/png' ? 'png' : 'jpg',
            }),
          ],
        })
      );
    }

    children.push(
      new Paragraph({
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: book.title, bold: true, size: 52 })],
      })
    );

    if (book.subtitle) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: book.subtitle, italics: true, size: 28 })],
        })
      );
    }

    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: book.authorName, bold: true, size: 24 })],
      }),
      new Paragraph({ children: [new PageBreak()] })
    );
  }

  for (let idx = 0; idx < book.chapters.length; idx++) {
    const ch = book.chapters[idx];
    if (idx > 0) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: `Chapitre ${ch.chapterNumber} : ${ch.title}`, bold: true })],
      })
    );

    const blocks = parseHtmlToBlocks(ch.contentHtml);
    for (const block of blocks) {
      if (block.type === 'h1' || block.type === 'h2') {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: block.text, bold: true })],
          })
        );
      } else if (block.type === 'h3') {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            children: [new TextRun({ text: block.text, bold: true })],
          })
        );
      } else if (block.type === 'blockquote') {
        children.push(
          new Paragraph({
            indent: { left: 720 },
            children: [new TextRun({ text: block.text, italics: true })],
          })
        );
      } else if (block.type === 'li') {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [new TextRun({ text: block.text })],
          })
        );
      } else if (block.type === 'img' && block.src) {
        const imgBuf = await resolveImageBuffer(block.src);
        if (imgBuf) {
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  data: imgBuf.buffer,
                  transformation: { width: 420, height: 280 },
                  type: imgBuf.mime === 'image/png' ? 'png' : 'jpg',
                }),
              ],
            })
          );
        }
      } else {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: block.text })],
          })
        );
      }
    }
  }

  const doc = new DocxDocument({
    creator: book.authorName,
    title: book.title,
    sections: [{ children }],
  });

  return await Packer.toBuffer(doc);
}
