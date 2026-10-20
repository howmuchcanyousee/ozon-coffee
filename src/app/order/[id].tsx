import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useShop } from "../../store/ShopProvider";
import { Card, Empty, Screen, u } from "../../components/ui";
import { cents, money, orderLines, type OrderLine } from "../../data/shop";
export default function OrderDetails() {
  const { id, created } = useLocalSearchParams<{
    id: string;
    created?: string;
  }>();
  const db = useSQLiteContext();
  const shop = useShop();
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [error, setError] = useState(false);
  const order = shop.orders.find((o) => o.id_order === Number(id));
  useEffect(() => {
    orderLines(db, Number(id), shop.owner)
      .then(setLines)
      .catch(() => setError(true));
  }, [db, id, shop.owner]);
  return (
    <Screen
      title={created ? "Заказ оформлен!" : `Заказ №${id}`}
      subtitle={
        created ? "Спасибо! Заказ сохранён на этом устройстве." : undefined
      }
    >
      {!order ? (
        <Empty title="Заказ не найден" text="Откройте историю заказов." />
      ) : (
        <>
          <Card>
            <Text style={u.heading}>
              Заказ №{order.id_order} · {order.status}
            </Text>
            <Text style={u.text}>
              {order.customer} · {order.mode}
            </Text>
            <Text style={u.muted}>
              {new Date(order.order_date).toLocaleString("ru-RU")}
            </Text>
            <Text style={u.muted}>Оплата при получении: {order.payment}</Text>
          </Card>
          <Card>
            <Text style={u.heading}>Состав заказа</Text>
            {error ? (
              <Text style={u.muted}>
                Не удалось загрузить позиции. Откройте заказ ещё раз.
              </Text>
            ) : (
              lines.map((l, i) => (
                <View key={i} style={u.row}>
                  <Text style={[u.text, { flex: 1 }]}>
                    {l.name} × {l.quantity}
                  </Text>
                  <Text style={u.text}>
                    {money(l.price_cents * l.quantity)}
                  </Text>
                </View>
              ))
            )}
            <View style={u.row}>
              <Text style={u.heading}>Итого</Text>
              <Text style={u.heading}>{money(cents(order.total_sum))}</Text>
            </View>
          </Card>
          {!!order.comment && (
            <Card>
              <Text style={u.heading}>Пожелания</Text>
              <Text style={u.text}>{order.comment}</Text>
            </Card>
          )}
          <Text style={u.muted}>
            Это учебная кофейня. Заказ сохранён локально и не отправляется в
            реальное заведение.
          </Text>
        </>
      )}
    </Screen>
  );
}
