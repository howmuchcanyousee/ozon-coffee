import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import Svg, { Circle, Rect } from "react-native-svg";
import { Button, Card, colors, Screen, Tabs, u } from "../components/ui";
import { useShop } from "../store/ShopProvider";
import { money } from "../data/shop";
import { statistics, type Metric, type Statistics } from "../data/statistics";
const palette = ["#005BFF", "#F91155", "#00A6A0", "#FF9B25", "#8C5BFF"];
function Bars({
  data,
  currency = false,
}: {
  data: Metric[];
  currency?: boolean;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={{ gap: 18 }}>
      {data.length ? (
        data.map((d, i) => (
          <View key={d.label} style={{ gap: 6 }}>
            <View style={u.row}>
              <Text style={[u.text, { flex: 1 }]}>{d.label}</Text>
              <Text style={u.text}>{currency ? money(d.value) : d.value}</Text>
            </View>
            <Svg
              width="100%"
              height={13}
              viewBox="0 0 300 13"
              preserveAspectRatio="none"
            >
              <Rect width={300} height={13} rx={6} fill={colors.paleBlue} />
              <Rect
                width={(300 * d.value) / max}
                height={13}
                rx={6}
                fill={palette[i % palette.length]}
              />
            </Svg>
          </View>
        ))
      ) : (
        <Text style={u.muted}>Пока недостаточно данных для графика.</Text>
      )}
    </View>
  );
}
function Donut({ data }: { data: Metric[] }) {
  const sum = data.reduce((s, d) => s + d.value, 0);
  const circumference = 2 * Math.PI * 59;

  return (
    <View style={{ gap: 15, alignItems: "center" }}>
      <Svg width={180} height={180} viewBox="0 0 160 160">
        <Circle
          cx={80}
          cy={80}
          r={59}
          stroke={colors.paleBlue}
          strokeWidth={23}
          fill="none"
        />
        {data
          .filter((d) => d.value > 0)
          .map((d, i) => {
            const start =
              (data
                .filter((d) => d.value > 0)
                .slice(0, i)
                .reduce((s, d) => s + d.value, 0) /
                Math.max(1, sum)) *
              circumference;
            return (
              <Circle
                key={d.label}
                cx={80}
                cy={80}
                r={59}
                fill="none"
                stroke={palette[i % palette.length]}
                strokeWidth={23}
                strokeDasharray={`${(d.value / Math.max(1, sum)) * circumference} ${circumference}`}
                strokeDashoffset={-start}
                transform="rotate(-90 80 80)"
              />
            );
          })}
      </Svg>
      <Text style={u.heading}>Всего заказов: {sum}</Text>
      {data
        .filter((d) => d.value > 0)
        .map((d, i) => (
          <View key={d.label} style={u.row}>
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 4,
                backgroundColor: palette[i % palette.length],
              }}
            />
            <Text style={u.text}>
              {d.label}: {d.value}
            </Text>
          </View>
        ))}
    </View>
  );
}
export default function Stats() {
  const db = useSQLiteContext();
  const shop = useShop();
  const [tab, setTab] = useState("sales");
  const [data, setData] = useState<Statistics | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    statistics(db)
      .then((d) => {
        if (active) {
          setData(d);
          setError(false);
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [db, shop.orders]);
  return (
    <Screen
      title="Статистика"
      subtitle="Показатели учебной кофейни на этом устройстве"
    >
      <Tabs
        options={[
          ["sales", "Продажи"],
          ["revenue", "Выручка"],
          ["statuses", "Заказы"],
        ]}
        value={tab}
        onChange={setTab}
      />
      <Text style={u.muted}>
        Демонстрационные данные из базы и заказы приложения. Отменённые заказы
        исключены из суммы и продаж.
      </Text>
      {error ? (
        <Card>
          <Text style={u.text}>Не удалось загрузить статистику.</Text>
          <Button
            title="Повторить"
            onPress={() =>
              statistics(db)
                .then((d) => {
                  setData(d);
                  setError(false);
                })
                .catch(() => setError(true))
            }
          />
        </Card>
      ) : !data ? (
        <Text style={u.muted}>Загружаем показатели…</Text>
      ) : (
        <>
          <Card>
            <View style={u.row}>
              <View>
                <Text style={u.muted}>Заказов без отмен</Text>
                <Text style={u.heading}>{data.count}</Text>
              </View>
              <View>
                <Text style={u.muted}>Сумма заказов</Text>
                <Text style={u.heading}>{money(data.total)}</Text>
              </View>
            </View>
          </Card>
          <Card>
            <Text style={u.heading}>
              {tab === "sales"
                ? "Продано по категориям"
                : tab === "revenue"
                  ? "Сумма заказов по месяцам"
                  : "Заказы по статусам"}
            </Text>
            {tab === "sales" ? (
              <Bars data={data.categories} />
            ) : tab === "revenue" ? (
              <Bars data={data.revenue} currency />
            ) : (
              <Donut data={data.statuses} />
            )}
          </Card>
          {tab === "revenue" && (
            <Text style={u.muted}>
              Сумма заказов — учебный показатель. Фактические оплаты и реальные
              денежные поступления не учитываются.
            </Text>
          )}
        </>
      )}
    </Screen>
  );
}
