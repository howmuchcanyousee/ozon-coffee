import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useShop } from "../store/ShopProvider";
import {
  Button,
  Card,
  colors,
  Icon,
  photos,
  Screen,
  u,
} from "../components/ui";
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
      title="Кофе и не только"
      subtitle="Ваш любимый вкус — в пару касаний"
    >
      <View style={u.search}>
        <Icon name="search" size={21} />
        <TextInput
          accessibilityLabel="Поиск по меню"
          placeholder="Искать в Ozon Coffee"
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          style={u.searchInput}
        />
        {!!search && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Очистить поиск"
            hitSlop={12}
            onPress={() => setSearch("")}
          >
            <Text style={{ fontSize: 24, color: colors.muted }}>×</Text>
          </Pressable>
        )}
      </View>
      <View style={u.promo}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={u.promoLabel}>ВАШ КОФЕЙНЫЙ МОМЕНТ</Text>
          <Text style={u.promoTitle}>
            Сначала кофе.{"\n"}Потом всё остальное.
          </Text>
          <Text style={u.promoCaption}>
            С собой или в кофейне — выбирайте вы
          </Text>
        </View>
        <View
          style={{
            width: 86,
            height: 100,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#2375FF",
            borderRadius: 40,
            transform: [{ rotate: "12deg" }],
          }}
        >
          <Icon name="cup" color="#FFF" size={68} />
          <View
            style={{
              position: "absolute",
              width: 23,
              height: 23,
              borderRadius: 12,
              backgroundColor: colors.pink,
              right: -2,
              top: 0,
            }}
          />
        </View>
      </View>
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
            <Text style={[u.chipText, category === id && { color: "#FFF" }]}>
              {name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={u.row}>
        <Text style={u.heading}>
          {category
            ? categories.find(([id]) => id === category)?.[1]
            : "Выбирайте любимое"}
        </Text>
        <Text style={u.muted}>{items.length} позиций</Text>
      </View>
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
              style={{ width: "48%", flexGrow: 1, padding: 10, gap: 8 }}
            >
              <Image
                source={photos[p.id_category] ?? photos[1]}
                style={u.productPhoto}
              />
              <Text style={u.price}>{money(cents(p.price))}</Text>
              <Text style={u.productTitle}>{p.name}</Text>
              <Text style={u.productMeta}>{p.description}</Text>
              <Text style={u.productMeta}>
                {p.weight_grams} {p.id_category <= 2 ? "мл" : "г"}
              </Text>
              <View style={{ flex: 1 }} />
              <Button
                title={
                  !p.is_available
                    ? "Нет в наличии"
                    : qty
                      ? `В корзине: ${qty} · +`
                      : "В корзину"
                }
                disabled={shop.busy || !p.is_available || qty >= 99}
                onPress={() => shop.quantity(p.id_item, qty + 1)}
              />
            </Card>
          );
        })}
      </View>
      {shop.ready && !items.length && (
        <Card>
          <Text style={u.heading}>Ничего не нашлось</Text>
          <Text style={u.muted}>
            Попробуйте другое название или выберите другую категорию.
          </Text>
          <Button
            title="Сбросить поиск"
            secondary
            onPress={() => {
              setSearch("");
              setCategory(0);
            }}
          />
        </Card>
      )}
    </Screen>
  );
}
