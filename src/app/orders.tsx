import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useShop } from "../store/ShopProvider";
import { Button, Card, Empty, Screen, Tabs, u } from "../components/ui";
import { cents, money } from "../data/shop";
export default function Orders() {
  const shop = useShop();
  const db = useSQLiteContext();
  const [tab, setTab] = useState("mine");
  const [statuses, setStatuses] = useState<
    { name: string; description: string }[]
  >([]);
  const [payments, setPayments] = useState<
    { name: string; description: string }[]
  >([]);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([
      db.getAllAsync<{ name: string; description: string }>(
        "SELECT name,description FROM order_status ORDER BY id_status",
      ),
      db.getAllAsync<{ name: string; description: string }>(
        "SELECT name,description FROM payment_method WHERE id_payment_method IN(1,2)",
      ),
    ])
      .then(([s, p]) => {
        setStatuses(s);
        setPayments(p);
      })
      .catch(() =>
        setError("Не удалось загрузить справочники. Откройте раздел заново."),
      );
  }, [db]);
  return (
    <Screen
      title="Заказы"
      subtitle={
        shop.user
          ? "Личная история ваших заказов"
          : "Гостевая история этого устройства"
      }
    >
      <Tabs
        options={[
          ["mine", "Мои заказы"],
          ["statuses", "Статусы"],
          ["payments", "Оплата"],
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "mine" ? (
        <>
          {!shop.user && (
            <Card>
              <Text style={u.muted}>
                Вы в гостевом режиме. После входа будут доступны заказы вашего
                аккаунта.
              </Text>
              <Button
                title="Войти в аккаунт"
                secondary
                onPress={() => router.push("/account")}
              />
            </Card>
          )}
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
        </>
      ) : tab === "statuses" ? (
        <>
          {statuses.map((s) => (
            <Card key={s.name}>
              <Text style={u.heading}>{s.name}</Text>
              <Text style={u.muted}>{s.description}</Text>
            </Card>
          ))}
          <Text style={u.muted}>
            Новые учебные заказы сохраняются со статусом «Новый»; обработка
            сотрудником пока не моделируется.
          </Text>
        </>
      ) : (
        <>
          {payments.map((p) => (
            <Card key={p.name}>
              <Text style={u.heading}>{p.name}</Text>
              <Text style={u.muted}>
                {p.description} — при получении заказа.
              </Text>
            </Card>
          ))}
          <Text style={u.muted}>
            Оплата демонстрационная. Деньги не списываются.
          </Text>
        </>
      )}
      {!!error && <Text style={u.muted}>{error}</Text>}
    </Screen>
  );
}
