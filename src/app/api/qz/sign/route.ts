import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

function getPrivateKey(): string {
  const keyPath = process.env.QZ_PRIVATE_KEY_PATH;
  if (keyPath) {
    const resolved = path.isAbsolute(keyPath) ? keyPath : path.join(process.cwd(), keyPath);
    if (fs.existsSync(resolved)) return fs.readFileSync(resolved, 'utf8').trim();
  }
  const keyContent = process.env.QZ_PRIVATE_KEY ?? '';
  return keyContent.replace(/\\n/g, '\n').trim();
}

export async function POST(req: NextRequest) {
  const body = await req.text();

  const privateKey = getPrivateKey();
  if (!privateKey) {
    return new NextResponse('QZ_PRIVATE_KEY non configuré', { status: 500 });
  }

  try {
    const signer = crypto.createSign('SHA512');
    signer.update(body);
    const signature = signer.sign(privateKey, 'base64');
    return new NextResponse(signature, {
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (err: any) {
    return new NextResponse(err.message, { status: 500 });
  }
}
