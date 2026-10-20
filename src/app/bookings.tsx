import { useEffect, useRef, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { randomUUID } from "expo-crypto";
import {
  Button,
  Card,
  colors,
  RequireAccount,
  Screen,
  Tabs,
  u,
} from "../components/ui";
import { useShop } from "../store/ShopProvider";
import { capacity } from "../data/bookings";
function nextDays() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    d.setHours(12, 0, 0, 0);
    return d;
  });
}
export default function Bookings() {
  const shop = useShop();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const [tab, setTab] = useState("new");
  const [days] = useState(nextDays);
  const [day, setDay] = useState(0);
  const [hour, setHour] = useState(12);
  const [table, setTable] = useState(1);
  const [guests, setGuests] = useState(1);
  const [note, setNote] = useState("");
  const request = useRef(randomUUID());
  async function submit() {
    const d = new Date(days[day]);
    d.setHours(hour, 0, 0, 0);
    const id = await shop.book({
      startsAt: d.toISOString(),
      table,
      guests,
      note,
      token: request.current,
    });
    if (id) {
      setTab("mine");
      setNote("");
      request.current = randomUUID();
      Alert.alert(
        "Столик забронирован",
        `Бронь №${id} сохранена в вашем профиле.`,
      );
    }
  }
  const items = shop.bookings.filter((b) =>
    tab === "cancelled" ? b.state === "cancelled" : b.state !== "cancelled",
  );
  return (
    <Screen title="Бронирования" subtitle="Выберите столик для встречи за кофе">
      <Tabs
        options={[
          ["new", "Новая бронь"],
          ["mine", "Мои брони"],
          ["cancelled", "Отменённые"],
        ]}
        value={tab}
        onChange={setTab}
      />
      <RequireAccount>
        {tab === "new" ? (
          <>
            <Card>
              <Text style={u.heading}>Выберите день</Text>
              <Tabs
                options={days.map((d, i) => [
                  String(i),
                  d.toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "short",
                  }),
                ])}
                value={String(day)}
                onChange={(v) => setDay(Number(v))}
              />
              <Text style={u.heading}>Время начала</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {[8, 10, 12, 14, 16, 18, 20].map((h) => (
                  <View key={h} style={{ width: "30%", flexGrow: 1 }}>
                    <Button
                      title={`${h}:00`}
                      secondary={hour !== h}
                      onPress={() => setHour(h)}
                      disabled={shop.busy}
                    />
                  </View>
                ))}
              </View>
              <Text style={u.muted}>
                Бронь на 2 часа. Кофейня открыта с 08:00 до 22:00.
              </Text>
            </Card>
            <Card>
              <Text style={u.heading}>Столик</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {Object.entries(capacity).map(([id, cap]) => (
                  <View key={id} style={{ width: "45%", flexGrow: 1 }}>
                    <Button
                      title={`№${id} · до ${cap} гостей`}
                      secondary={table !== Number(id)}
                      onPress={() => {
                        setTable(Number(id));
                        setGuests(Math.min(guests, cap));
                      }}
                      disabled={shop.busy}
                    />
                  </View>
                ))}
              </View>
              <Text style={u.heading}>Количество гостей</Text>
              <Tabs
                options={Array.from({ length: capacity[table] }, (_, i) => [
                  String(i + 1),
                  String(i + 1),
                ])}
                value={String(guests)}
                onChange={(v) => setGuests(Number(v))}
              />
            </Card>
            <TextInput
              accessibilityLabel="Пожелания к бронированию"
              placeholder="Пожелания (необязательно)"
              placeholderTextColor={colors.muted}
              style={u.input}
              value={note}
              onChangeText={setNote}
              maxLength={200}
              editable={!shop.busy}
            />
            <Button
              title={shop.busy ? "Сохраняем…" : "Забронировать столик"}
              disabled={shop.busy}
              onPress={submit}
            />
            <Text style={u.muted}>
              Учебное бронирование: сохраняется на устройстве и не отправляется
              в реальное заведение.
            </Text>
          </>
        ) : !items.length ? (
          <Card>
            <Text style={u.heading}>
              {tab === "cancelled"
                ? "Отменённых броней нет"
                : "Бронирований пока нет"}
            </Text>
            <Button title="Выбрать столик" onPress={() => setTab("new")} />
          </Card>
        ) : (
          items.map((b) => (
            <Card key={b.id}>
              <Text style={u.heading}>
                Бронь №{b.id} · столик №{b.table_no}
              </Text>
              <Text style={u.text}>
                {new Date(b.starts_at).toLocaleString("ru-RU")}
              </Text>
              <Text style={u.muted}>
                {b.guests} гостей · 2 часа ·{" "}
                {b.state === "cancelled"
                  ? "Отменена"
                  : new Date(b.ends_at).getTime() < now
                    ? "Завершена"
                    : "Активна"}
              </Text>
              {!!b.note && <Text style={u.text}>{b.note}</Text>}
              {b.state === "active" &&
                new Date(b.starts_at).getTime() > now && (
                  <Button
                    title="Отменить бронь"
                    secondary
                    disabled={shop.busy}
                    onPress={() =>
                      Alert.alert(
                        "Отменить бронирование?",
                        `Столик №${b.table_no} будет освобождён.`,
                        [
                          { text: "Оставить", style: "cancel" },
                          {
                            text: "Отменить бронь",
                            style: "destructive",
                            onPress: () => shop.cancelBooking(b.id),
                          },
                        ],
                      )
                    }
                  />
                )}
            </Card>
          ))
        )}
      </RequireAccount>
    </Screen>
  );
}
