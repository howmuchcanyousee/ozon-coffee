import { Text, View } from "react-native";
import { router } from "expo-router";
import { useShop } from "../store/ShopProvider";
import { Button, Card, Empty, Screen, u } from "../components/ui";
import { cents, money } from "../data/shop";
export default function Orders() {
  const shop = useShop();
  return (
    <Screen title="Мои заказы" subtitle="История заказов на этом устройстве">
      {!shop.orders.length ? (
        <Empty
          title="Первый кофе впереди"
          text="После оформления здесь появится ваш заказ."
        />
      ) : (
        shop.orders.map((o) => (
          <Card key={o.id_order}>
            <View style={u.row}>
              <Text style={u.heading}>Заказ №{o.id_order}</Text>
              <Text style={u.text}>{money(cents(o.total_sum))}</Text>
            </View>
            <Text style={u.muted}>
              {new Date(o.order_date).toLocaleString("ru-RU")} · {o.mode}
            </Text>
            <Text style={u.text}>
              {o.status} · {o.payment}
            </Text>
            <Button
              title="Посмотреть заказ"
              secondary
              onPress={() =>
                router.push({
                  pathname: "/order/[id]",
                  params: { id: String(o.id_order) },
                })
              }
            />
          </Card>
        ))
      )}
    </Screen>
  );
}
