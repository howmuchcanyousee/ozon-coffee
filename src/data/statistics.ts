import type { SQLiteDatabase } from "expo-sqlite";
export type Metric = { label: string; value: number };
export type Statistics = {
  categories: Metric[];
  revenue: Metric[];
  statuses: Metric[];
  total: number;
  count: number;
};
export async function statistics(db: SQLiteDatabase): Promise<Statistics> {
  const [categories, revenue, statuses, total] = await Promise.all([
    db.getAllAsync<Metric>(
      `SELECT mc.name label,SUM(oi.quantity) value FROM order_item oi JOIN customer_order co USING(id_order) JOIN menu_item mi USING(id_item) JOIN menu_category mc USING(id_category) WHERE co.id_status<>5 GROUP BY mc.id_category ORDER BY value DESC`,
    ),
    db.getAllAsync<Metric>(
      `SELECT substr(order_date,1,7) label,CAST(ROUND(SUM(total_sum)*100) AS INTEGER) value FROM customer_order WHERE id_status<>5 GROUP BY label ORDER BY label DESC LIMIT 8`,
    ),
    db.getAllAsync<Metric>(
      `SELECT os.name label,COUNT(co.id_order) value FROM order_status os LEFT JOIN customer_order co USING(id_status) GROUP BY os.id_status`,
    ),
    db.getFirstAsync<{ total: number; count: number }>(
      `SELECT COALESCE(CAST(ROUND(SUM(total_sum)*100) AS INTEGER),0) total,COUNT(*) count FROM customer_order WHERE id_status<>5`,
    ),
  ]);
  return {
    categories,
    revenue: revenue.reverse(),
    statuses,
    total: total?.total ?? 0,
    count: total?.count ?? 0,
  };
}
