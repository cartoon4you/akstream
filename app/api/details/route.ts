import { NextRequest, NextResponse } from 'next/server';
import { getMediaDetails } from '@/lib/scraper-service';

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id') || request.nextUrl.searchParams.get('path') || '';
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'معرّف المادة مطلوب' },
        { status: 400 }
      );
    }

    const details = await getMediaDetails(id);
    if (!details) {
      return NextResponse.json(
        { success: false, error: 'لم يتم العثور على المادة' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: details },
      {
        headers: {
          'Cache-Control': 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'فشل جلب تفاصيل المادة' },
      { status: 500 }
    );
  }
}
