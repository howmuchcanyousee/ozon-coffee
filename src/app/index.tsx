import { Image, Pressable, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { Card, colors, Icon, Screen, u } from "../components/ui";
import { useShop } from "../store/ShopProvider";
const sections: {
  title: string;
  description: string;
  path: Href;
  image: number;
}[] = [
  {
    title: "Меню кофейни",
    description: "Всё меню · Категории · Популярное",
    path: "/catalog",
    image: require("../../assets/coffee/hero_menu.png"),
  },
  {
    title: "Заказы",
    description: "Мои заказы · Статусы · Оплата",
    path: "/orders",
    image: require("../../assets/coffee/hero_orders.png"),
  },
  {
    title: "Бронирования",
    description: "Новая бронь · Мои брони · Отменённые",
    path: "/bookings",
    image: require("../../assets/coffee/hero_booking.png"),
  },
  {
    title: "Регистрация",
    description: "Вход · Регистрация · Профиль",
    path: "/account",
    image: require("../../assets/coffee/hero_auth.png"),
  },
  {
    title: "Статистика",
    description: "Продажи · Сумма заказов · Статусы",
    path: "/stats",
    image: require("../../assets/coffee/hero_stats.png"),
  },
  {
    title: "О нас",
    description: "О кофейне · Контакты · Как заказать",
    path: "/about",
    image: require("../../assets/coffee/hero_about.png"),
  },
  {
    title: "Корзина",
    description: "Ваш выбор, количество и оформление",
    path: "/cart",
    image: require("../../assets/coffee/hero_clients.png"),
  },
];
export default function Home() {
  const shop = useShop();
  return (
    <Screen
      title={shop.user ? `Привет, ${shop.user.name}!` : "Добро пожаловать!"}
      subtitle="Кофе, десерты и тёплые встречи в Ozon Coffee"
    >
      <Card style={{ backgroundColor: colors.accent }}>
        <View style={u.row}>
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={{ ...u.heading, color: "#FFF", fontSize: 23 }}>
              Ваш кофейный момент
            </Text>
            <Text style={{ ...u.muted, color: "#DFEAFF" }}>
              Выберите любимое — с собой или в кофейне
            </Text>
          </View>
          <Icon name="cup" color="#FFF" size={55} />
        </View>
      </Card>
      {!shop.ready ? (
        <Text style={u.muted}>{shop.error || "Загружаем меню…"}</Text>
      ) : null}
      {sections.map((section) => (
        <Pressable
          key={section.title}
          accessibilityRole="button"
          accessibilityLabel={section.title}
          onPress={() => router.push(section.path)}
        >
          <Card>
            <View style={u.row}>
              <Image
                source={section.image}
                style={{ width: 66, height: 66, borderRadius: 13 }}
              />
              <View style={{ flex: 1, gap: 7 }}>
                <Text style={u.heading}>{section.title}</Text>
                <Text style={u.muted}>{section.description}</Text>
              </View>
              <Text style={{ fontSize: 26, color: colors.accent }}>›</Text>
            </View>
          </Card>
        </Pressable>
      ))}
      <Text style={u.muted}>
        Учебная кофейня. Аккаунты, заказы и бронирования хранятся на этом
        устройстве.
      </Text>
    </Screen>
  );
}
