import { Alert, Image, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useShop } from "../store/ShopProvider";
import {
  Button,
  Card,
  colors,
  Empty,
  photos,
  Screen,
  u,
} from "../components/ui";
import { cents, money, totalCents } from "../data/shop";
export default function Cart() {
  const shop = useShop();
  return (
    <Screen
      title="Корзина"
      subtitle="Проверьте заказ — и можно оформлять"
      footer={
        shop.cart.length ? (
          <>
            <View style={u.row}>
              <Text style={u.text}>Итого</Text>
              <Text style={u.heading}>{money(totalCents(shop.cart))}</Text>
            </View>
            <Button
              title="Перейти к оформлению"
              onPress={() => router.push("/checkout")}
              disabled={shop.busy}
            />
          </>
        ) : undefined
      }
    >
      {!shop.cart.length ? (
        <Empty
          title="Здесь пока пусто"
          text="Добавьте любимый напиток или десерт из меню."
        />
      ) : (
        <>
          {shop.cart.map((l) => (
            <Card key={l.id_item}>
              <View style={u.row}>
                <Image
                  source={photos[l.id_category]}
                  style={{ width: 64, height: 64, borderRadius: 12 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={u.heading}>{l.name}</Text>
                  <Text style={u.muted}>{money(cents(l.price))} за штуку</Text>
                </View>
              </View>
              <View style={u.row}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <Step
                    title="−"
                    label={`Уменьшить ${l.name}`}
                    disabled={shop.busy}
                    onPress={() => shop.quantity(l.id_item, l.quantity - 1)}
                  />
                  <Text style={u.heading}>{l.quantity}</Text>
                  <Step
                    title="+"
                    label={`Увеличить ${l.name}`}
                    disabled={shop.busy || l.quantity >= 99}
                    onPress={() => shop.quantity(l.id_item, l.quantity + 1)}
                  />
                </View>
                <Text style={u.text}>{money(cents(l.price) * l.quantity)}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Удалить ${l.name}`}
                disabled={shop.busy}
                onPress={() => shop.quantity(l.id_item, 0)}
                style={{ paddingVertical: 10 }}
              >
                <Text style={{ color: colors.muted }}>Удалить</Text>
              </Pressable>
            </Card>
          ))}
          <Button
            title="Очистить корзину"
            secondary
            disabled={shop.busy}
            onPress={() =>
              Alert.alert("Очистить корзину?", "Все позиции будут удалены.", [
                { text: "Оставить", style: "cancel" },
                {
                  text: "Очистить",
                  style: "destructive",
                  onPress: () => shop.clear(),
                },
              ])
            }
          />
        </>
      )}
    </Screen>
  );
}
function Step({
  title,
  label,
  onPress,
  disabled,
}: {
  title: string;
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={{
        width: 46,
        height: 46,
        borderRadius: 14,
        backgroundColor: colors.border,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text style={{ ...u.heading, color: colors.accent }}>{title}</Text>
    </Pressable>
  );
}
