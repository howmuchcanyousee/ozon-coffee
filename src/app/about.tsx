import { useState } from "react";
import { Image, Text } from "react-native";
import { Button, Card, Screen, Tabs, u } from "../components/ui";
import { router } from "expo-router";
export default function About() {
  const [tab, setTab] = useState("cafe");
  return (
    <Screen title="О нас" subtitle="Ozon Coffee — ваш кофейный момент">
      <Tabs
        options={[
          ["cafe", "О кофейне"],
          ["contacts", "Контакты"],
          ["guide", "Как заказать"],
        ]}
        value={tab}
        onChange={setTab}
      />
      <Image
        source={require("../../assets/coffee/hero_about.png")}
        style={{ width: "100%", height: 180, borderRadius: 18 }}
      />
      {tab === "cafe" ? (
        <Card>
          <Text style={u.heading}>Кофе, десерты и встречи</Text>
          <Text style={u.text}>
            В меню Ozon Coffee — горячий кофе, холодные напитки, десерты,
            выпечка и завтраки. Выбирайте с собой или бронируйте столик для
            встречи.
          </Text>
          <Text style={u.muted}>
            Это учебное приложение: покупки и бронирования сохраняются на
            устройстве. Аккаунты не синхронизируются между телефонами.
          </Text>
          <Button
            title="Открыть каталог"
            onPress={() => router.push("/catalog")}
          />
        </Card>
      ) : tab === "contacts" ? (
        <Card>
          <Text style={u.heading}>Контакты учебной кофейни</Text>
          <Text style={u.text}>Режим работы: ежедневно, 08:00–22:00.</Text>
          <Text style={u.text}>
            Бронирование столиков: на 2 часа, начало с 08:00 до 20:00.
          </Text>
          <Text style={u.muted}>
            Реальная точка продаж не подключена. Адрес, телефон и внешняя служба
            поддержки не заданы.
          </Text>
          <Button
            title="Выбрать столик"
            onPress={() => router.push("/bookings")}
          />
        </Card>
      ) : (
        <>
          <Card>
            <Text style={u.heading}>1. Выберите любимое</Text>
            <Text style={u.text}>
              Откройте каталог, выберите категорию или найдите позицию по
              названию. Добавьте её в корзину.
            </Text>
          </Card>
          <Card>
            <Text style={u.heading}>2. Проверьте корзину</Text>
            <Text style={u.text}>
              Измените количество, удалите лишнее и проверьте итоговую сумму.
            </Text>
          </Card>
          <Card>
            <Text style={u.heading}>3. Оформите заказ</Text>
            <Text style={u.text}>
              Укажите имя, выберите получение и оплату при получении. После
              подтверждения заказ появится в истории.
            </Text>
            <Button
              title="Перейти в корзину"
              onPress={() => router.push("/cart")}
            />
          </Card>
          <Card>
            <Text style={u.heading}>Личный аккаунт</Text>
            <Text style={u.text}>
              После регистрации корзина, заказы и брони закрепляются за вашим
              аккаунтом. Гостевые заказы доступны после выхода из аккаунта.
            </Text>
          </Card>
        </>
      )}
    </Screen>
  );
}
