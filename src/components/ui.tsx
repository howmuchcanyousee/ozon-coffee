import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useShop } from "../store/ShopProvider";
export const colors = {
  bg: "#17120E",
  card: "#241D17",
  text: "#FFF2DF",
  muted: "#C7B6A3",
  accent: "#E2AE75",
  border: "#48372A",
};
export const photos: Record<number, ImageSourcePropType> = {
  1: require("../../assets/coffee/hero_menu.png"),
  2: require("../../assets/coffee/hero_about.png"),
  3: require("../../assets/coffee/hero_booking.png"),
  4: require("../../assets/coffee/hero_booking.png"),
  5: require("../../assets/coffee/hero_orders.png"),
};
export function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
  testID,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        u.button,
        secondary && u.secondary,
        (disabled || pressed) && { opacity: 0.5 },
      ]}
    >
      <Text style={[u.buttonText, secondary && { color: colors.text }]}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[u.card, style]}>{children}</View>;
}
export function Screen({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const shop = useShop();
  const count = shop.cart.reduce((s, l) => s + l.quantity, 0);
  return (
    <SafeAreaView style={u.safe} edges={["top", "left", "right"]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={u.body}
      >
        <View style={u.row}>
          <Text style={u.brand}>COFFEEHOUSE PRO</Text>
          <Image
            source={photos[1]}
            style={{ width: 34, height: 34, borderRadius: 10 }}
          />
        </View>
        <Text style={u.title}>{title}</Text>
        {subtitle && <Text style={u.muted}>{subtitle}</Text>}
        {children}
      </ScrollView>
      {footer && <View style={u.footer}>{footer}</View>}
      <SafeAreaView edges={["bottom"]} style={u.nav}>
        <View style={u.navRow}>
          <Nav title="Меню" to="/" />
          <Nav title={count ? `Корзина · ${count}` : "Корзина"} to="/cart" />
          <Nav title="Мои заказы" to="/orders" />
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}
function Nav({ title, to }: { title: string; to: "/" | "/cart" | "/orders" }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.navigate(to)}
      style={u.navItem}
    >
      <Text style={u.navText}>{title}</Text>
    </Pressable>
  );
}
export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <Card>
      <Image
        source={photos[1]}
        style={{ width: "100%", height: 130, borderRadius: 14 }}
      />
      <Text style={u.heading}>{title}</Text>
      <Text style={u.muted}>{text}</Text>
      <Button title="Выбрать в меню" onPress={() => router.navigate("/")} />
    </Card>
  );
}
export const u = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 20, paddingBottom: 28, gap: 16 },
  brand: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 2.5,
  },
  title: { fontSize: 32, fontWeight: "700", color: colors.text },
  heading: { color: colors.text, fontSize: 21, fontWeight: "600" },
  text: { color: colors.text, fontSize: 16, lineHeight: 23 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  card: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  button: {
    minHeight: 48,
    backgroundColor: colors.accent,
    borderRadius: 14,
    padding: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "#22160C", fontWeight: "700", fontSize: 15 },
  secondary: {
    backgroundColor: "#3A2C21",
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    gap: 10,
  },
  nav: {
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  navRow: { flexDirection: "row" },
  navItem: {
    flex: 1,
    minHeight: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  navText: { color: colors.accent, fontSize: 13, fontWeight: "700" },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    color: colors.text,
    fontSize: 16,
  },
  chip: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accent },
  chipText: { color: colors.text, fontWeight: "600", fontSize: 13 },
});
