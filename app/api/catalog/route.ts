import { NextRequest, NextResponse } from 'next/server';
import { getCatalogItems } from '@/lib/scraper-service';
import { CATEGORIES } from '@/lib/catalog-data';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || 'all';
    const type = searchParams.get('type') || undefined;
    const sort = searchParams.get('sort') || 'latest';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '18', 10);

    const result = await getCatalogItems({
      category,
      type,
      sort,
      page,
      limit,
    });

    const activeCategory = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];

    return NextResponse.json({
      success: true,
      data: result.items,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      },
      activeCategory,
      categories: CATEGORIES,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'فشل فلترة البيانات' },
      { status: 500 }
    );
  }
}
