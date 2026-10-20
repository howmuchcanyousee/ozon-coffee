import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useShop } from "../store/ShopProvider";
import { Button, Card, colors, photos, Screen, u } from "../components/ui";
import { cents, money } from "../data/shop";

export default function Catalog() {
  const shop = useShop();
  const [category, setCategory] = useState(0);
  const [search, setSearch] = useState("");
  const categories = [
    ...new Map(shop.products.map((p) => [p.id_category, p.category])).entries(),
  ];
  const items = shop.products.filter(
    (p) =>
      (!category || p.id_category === category) &&
      `${p.name} ${p.description}`
        .toLocaleLowerCase("ru")
        .includes(search.trim().toLocaleLowerCase("ru")),
  );
  return (
    <Screen
      title="Ваш кофейный момент"
      subtitle="Любимый кофе и что-нибудь вкусное к нему"
    >
      <ImageBackground source={photos[1]} imageStyle={{ borderRadius: 20 }}>
        <View
          style={{
            backgroundColor: "rgba(20,12,8,.6)",
            padding: 22,
            borderRadius: 20,
            minHeight: 130,
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Text style={u.heading}>Свежий кофе. Тёплые встречи.</Text>
          <Text style={u.muted}>Выберите в меню — заберите в кофейне</Text>
        </View>
      </ImageBackground>
      <TextInput
        accessibilityLabel="Поиск по меню"
        placeholder="Найти напиток или десерт"
        placeholderTextColor={colors.muted}
        value={search}
        onChangeText={setSearch}
        style={u.input}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {[[0, "Всё меню"], ...categories].map(([id, name]) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: category === id }}
            key={id}
            onPress={() => setCategory(Number(id))}
            style={[u.chip, category === id && u.chipActive]}
          >
            <Text style={[u.chipText, category === id && { color: colors.bg }]}>
              {name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {!shop.ready && !shop.error && (
        <ActivityIndicator color={colors.accent} />
      )}
      {!!shop.error && (
        <Card>
          <Text style={u.text}>Не удалось загрузить меню.</Text>
          <Button
            title="Повторить"
            onPress={() => shop.refresh().catch(() => {})}
          />
        </Card>
      )}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {items.map((p) => {
          const qty =
            shop.cart.find((l) => l.id_item === p.id_item)?.quantity ?? 0;
          return (
            <Card
              key={p.id_item}
              style={{ width: "48%", flexGrow: 1, padding: 12 }}
            >
              <Image
                source={photos[p.id_category] ?? photos[1]}
                style={{ width: "100%", height: 110, borderRadius: 12 }}
              />
              <Text style={{ ...u.heading, fontSize: 18 }}>{p.name}</Text>
              <Text style={u.muted}>{p.description}</Text>
              <Text style={u.muted}>
                {p.weight_grams} {p.id_category <= 2 ? "мл" : "г"}
              </Text>
              <Text style={{ ...u.heading, color: colors.accent }}>
                {money(cents(p.price))}
              </Text>
              <Button
                title={
                  !p.is_available
                    ? "Нет в наличии"
                    : qty
                      ? `В корзине: ${qty} · +`
                      : "Добавить"
                }
                disabled={shop.busy || !p.is_available || qty >= 99}
                onPress={() => shop.quantity(p.id_item, qty + 1)}
              />
            </Card>
          );
        })}
      </View>
      {shop.ready && !items.length && (
        <Text style={u.muted}>Ничего не нашли. Попробуйте другой запрос.</Text>
      )}
    </Screen>
  );
}
