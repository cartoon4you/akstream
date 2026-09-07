import { NextResponse } from 'next/server';
import { getHomeContent } from '@/lib/scraper-service';

export async function GET() {
  try {
    const data = await getHomeContent();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'فشل جلب بيانات الصفحة الرئيسية' },
      { status: 500 }
    );
  }
}
