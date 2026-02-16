import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  const { filePath, newCode, approvalCode } = await req.json();
  if (approvalCode !== process.env.BOT_APPROVAL_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const fullPath = path.join('C:/cevict-live', filePath);
    fs.copyFileSync(fullPath, `${fullPath}.bak`);
    fs.writeFileSync(fullPath, newCode, 'utf8');
    return NextResponse.json({ status: 'success', path: filePath });
  } catch (err) {
    return NextResponse.json({ error: 'Write failed' }, { status: 500 });
  }
}
