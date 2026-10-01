// Supabase (PostgREST) returns at most 1,000 rows per request, so a plain
// select on a big table silently stops at 1,000. fetchAllRows asks for one
// 1,000-row page at a time until a short page says there is nothing left.
// The query must have a stable order (e.g. created_at then id) so pages
// neither repeat nor skip rows.

const PAGE_SIZE = 1000;

type PageResult<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

export async function fetchAllRows<T>(
  page: (from: number, to: number) => PageResult<T>
): Promise<{ data: T[] | null; error: unknown }> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) return { data: null, error };
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return { data: rows, error: null };
  }
}
