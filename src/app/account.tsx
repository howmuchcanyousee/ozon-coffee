import { useState } from "react";
import { Text, TextInput } from "react-native";
import { router } from "expo-router";
import { Button, Card, colors, Screen, Tabs, u } from "../components/ui";
import { useShop } from "../store/ShopProvider";
export default function Account() {
  const shop = useShop();
  const [tab, setTab] = useState(shop.user ? "profile" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [validation, setValidation] = useState("");
  async function submit() {
    setValidation("");
    if (tab === "register" && password !== confirm) {
      setValidation("Пароли не совпадают.");
      return;
    }
    const id =
      tab === "register"
        ? await shop.register({ name, email, password })
        : await shop.login(email, password);
    if (id) {
      setPassword("");
      setConfirm("");
      setTab("profile");
    }
  }
  return (
    <Screen
      title="Регистрация и профиль"
      subtitle={
        shop.user
          ? `Вы вошли: ${shop.user.email}`
          : "Создайте аккаунт или войдите в существующий"
      }
    >
      <Tabs
        options={[
          ["login", "Вход"],
          ["register", "Регистрация"],
          ["profile", "Профиль"],
        ]}
        value={tab}
        onChange={(v) => {
          setTab(v);
          setValidation("");
        }}
      />
      {shop.user ? (
        <Card>
          <Text style={u.heading}>{shop.user.name}</Text>
          <Text style={u.text}>{shop.user.email}</Text>
          <Text style={u.muted}>
            Ваша корзина, заказы и бронирования сохраняются отдельно от других
            пользователей.
          </Text>
          <Button title="Мои заказы" onPress={() => router.push("/orders")} />
          <Button
            title="Мои бронирования"
            secondary
            onPress={() => router.push("/bookings")}
          />
          <Button
            title="Выйти из аккаунта"
            secondary
            disabled={shop.busy}
            onPress={async () => {
              await shop.logout();
              setTab("login");
            }}
          />
        </Card>
      ) : tab === "profile" ? (
        <Card>
          <Text style={u.heading}>Вы пока не вошли</Text>
          <Text style={u.muted}>
            Прежние заказы доступны в гостевой истории. Аккаунт создаёт
            отдельную личную историю.
          </Text>
          <Button title="Перейти ко входу" onPress={() => setTab("login")} />
        </Card>
      ) : (
        <Card>
          <Text style={u.heading}>
            {tab === "register" ? "Новый аккаунт" : "С возвращением!"}
          </Text>
          {tab === "register" && (
            <TextInput
              accessibilityLabel="Имя"
              placeholder="Ваше имя"
              placeholderTextColor={colors.muted}
              style={u.input}
              value={name}
              onChangeText={setName}
              maxLength={80}
              editable={!shop.busy}
            />
          )}
          <TextInput
            accessibilityLabel="Email"
            placeholder="Email"
            placeholderTextColor={colors.muted}
            style={u.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={150}
            editable={!shop.busy}
          />
          <TextInput
            accessibilityLabel="Пароль"
            placeholder="Пароль от 6 символов"
            placeholderTextColor={colors.muted}
            style={u.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!visible}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={128}
            editable={!shop.busy}
          />
          {tab === "register" && (
            <TextInput
              accessibilityLabel="Повтор пароля"
              placeholder="Повторите пароль"
              placeholderTextColor={colors.muted}
              style={u.input}
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry={!visible}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={128}
              editable={!shop.busy}
            />
          )}
          <Button
            title={visible ? "Скрыть пароль" : "Показать пароль"}
            secondary
            onPress={() => setVisible(!visible)}
          />
          {!!validation && (
            <Text style={{ ...u.muted, color: colors.pink }}>{validation}</Text>
          )}
          <Button
            title={
              shop.busy
                ? "Подождите…"
                : tab === "register"
                  ? "Создать аккаунт"
                  : "Войти"
            }
            disabled={
              shop.busy ||
              !email.trim() ||
              !password ||
              (tab === "register" && !name.trim())
            }
            onPress={submit}
          />
          <Text style={u.muted}>
            Аккаунт работает только на этом устройстве. При входе гостевая
            корзина переносится в аккаунт; старые гостевые заказы остаются в
            гостевой истории.
          </Text>
        </Card>
      )}
    </Screen>
  );
}
