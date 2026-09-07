import { NextRequest, NextResponse } from 'next/server';
import { searchMedia } from '@/lib/scraper-service';

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q') || '';
    if (!q.trim()) {
      return NextResponse.json({ success: true, data: [] });
    }

    const results = await searchMedia(q);
    return NextResponse.json({ success: true, data: results, count: results.length });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'فشل البحث' },
      { status: 500 }
    );
  }
}
