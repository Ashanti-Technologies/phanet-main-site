import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'DMSans-Variable.ttf');
    const fontData = fs.readFileSync(fontPath);

    return new NextResponse(fontData, {
        headers: {
            'Content-Type': 'font/ttf',
        },
    });
}
