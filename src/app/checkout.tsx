import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useShop } from "../store/ShopProvider";
import { Button, Card, colors, Empty, Screen, u } from "../components/ui";
import { money, totalCents } from "../data/shop";
export default function Checkout() {
  const shop = useShop();
  const [name, setName] = useState(shop.user?.name ?? "");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [mode, setMode] = useState("С собой");
  const [payment, setPayment] = useState(1);
  async function submit() {
    const id = await shop.submit({ name, phone, comment, mode, payment });
    if (id)
      router.replace({
        pathname: "/order/[id]",
        params: { id: String(id), created: "1" },
      });
  }
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Screen
        title="Оформление"
        subtitle="Заказ останется в приложении на этом устройстве"
      >
        {!shop.cart.length ? (
          <Empty
            title="Корзина пуста"
            text="Выберите что-нибудь перед оформлением."
          />
        ) : (
          <>
            <Card>
              <Text style={u.heading}>Как вас зовут?</Text>
              <TextInput
                accessibilityLabel="Ваше имя"
                placeholder="Имя для заказа"
                placeholderTextColor={colors.muted}
                style={u.input}
                value={name}
                maxLength={80}
                onChangeText={setName}
                editable={!shop.busy}
              />
              <TextInput
                accessibilityLabel="Телефон"
                placeholder="Телефон (необязательно)"
                placeholderTextColor={colors.muted}
                style={u.input}
                keyboardType="phone-pad"
                value={phone}
                maxLength={25}
                onChangeText={setPhone}
                editable={!shop.busy}
              />
            </Card>
            <Card>
              <Text style={u.heading}>Где будете пить кофе?</Text>
              <View style={u.row}>
                {["С собой", "В кофейне"].map((v) => (
                  <View key={v} style={{ flex: 1 }}>
                    <Button
                      title={v}
                      secondary={mode !== v}
                      onPress={() => setMode(v)}
                      disabled={shop.busy}
                    />
                  </View>
                ))}
              </View>
            </Card>
            <Card>
              <Text style={u.heading}>Оплата при получении</Text>
              <View style={u.row}>
                {[
                  [1, "Наличные"],
                  [2, "Карта"],
                ].map(([id, title]) => (
                  <View key={id} style={{ flex: 1 }}>
                    <Button
                      title={String(title)}
                      secondary={payment !== id}
                      onPress={() => setPayment(Number(id))}
                      disabled={shop.busy}
                    />
                  </View>
                ))}
              </View>
              <Text style={u.muted}>
                Учебный заказ: деньги в приложении не списываются.
              </Text>
            </Card>
            <TextInput
              accessibilityLabel="Комментарий к заказу"
              placeholder="Пожелания к заказу (необязательно)"
              placeholderTextColor={colors.muted}
              style={[u.input, { minHeight: 90, textAlignVertical: "top" }]}
              multiline
              value={comment}
              onChangeText={setComment}
              maxLength={300}
              editable={!shop.busy}
            />
            <Card>
              <View style={u.row}>
                <Text style={u.text}>Итого</Text>
                <Text style={u.heading}>{money(totalCents(shop.cart))}</Text>
              </View>
              <Button
                title={shop.busy ? "Сохраняем заказ…" : "Подтвердить заказ"}
                disabled={shop.busy || !name.trim()}
                onPress={submit}
              />
            </Card>
          </>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
