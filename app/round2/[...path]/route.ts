import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const slugParts = params.path || [];
    if (!slugParts.length) {
      return new NextResponse('Not found', { status: 404 });
    }

    const possiblePaths = [
      path.join(process.cwd(), 'public', 'round2', ...slugParts),
      path.join(process.cwd(), 'public', 'assets', 'round2', ...slugParts),
    ];

    let foundFile: string | null = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        foundFile = p;
        break;
      }
    }

    if (!foundFile) {
      return new NextResponse('Asset not found', { status: 404 });
    }

    const ext = path.extname(foundFile).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const fileBuffer = fs.readFileSync(foundFile);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (err) {
    console.error('Round2 asset fallback error:', err);
    return new NextResponse('Internal error', { status: 500 });
  }
}
