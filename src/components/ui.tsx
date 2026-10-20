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
import { router, usePathname } from "expo-router";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useShop } from "../store/ShopProvider";

export const colors = {
  bg: "#F2F3F5",
  card: "#FFFFFF",
  text: "#001A34",
  muted: "#66778B",
  accent: "#005BFF",
  border: "#E4E8EF",
  pink: "#F91155",
  paleBlue: "#EAF2FF",
};
export const photos: Record<number, ImageSourcePropType> = {
  1: require("../../assets/coffee/hero_menu.png"),
  2: require("../../assets/coffee/hero_about.png"),
  3: require("../../assets/coffee/hero_booking.png"),
  4: require("../../assets/coffee/hero_booking.png"),
  5: require("../../assets/coffee/hero_orders.png"),
};
export function Icon({
  name,
  color = colors.accent,
  size = 24,
}: {
  name: "menu" | "cart" | "orders" | "search" | "cup" | "user";
  color?: string;
  size?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === "menu" ? (
        <>
          <Rect x={3} y={3} width={7} height={7} rx={2} />
          <Rect x={14} y={3} width={7} height={7} rx={2} />
          <Rect x={3} y={14} width={7} height={7} rx={2} />
          <Rect x={14} y={14} width={7} height={7} rx={2} />
        </>
      ) : name === "cart" ? (
        <>
          <Path d="M2 3h3l2.4 12h11.8l2-8H6" />
          <Circle cx={9} cy={20} r={1} />
          <Circle cx={18} cy={20} r={1} />
        </>
      ) : name === "orders" ? (
        <>
          <Path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
          <Path d="M9 8h6M9 12h6" />
        </>
      ) : name === "user" ? (
        <>
          <Circle cx={12} cy={7} r={4} />
          <Path d="M4 21v-2a8 8 0 0 1 16 0v2" />
        </>
      ) : name === "search" ? (
        <>
          <Circle cx={10} cy={10} r={6.5} />
          <Path d="m15 15 5 5" />
        </>
      ) : (
        <>
          <Path d="M4 9h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9ZM17 10h2a3 3 0 0 1 0 6h-2M7 3v2M11 2v3M15 3v2" />
        </>
      )}
    </Svg>
  );
}
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
      <Text style={[u.buttonText, secondary && { color: colors.accent }]}>
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
  const path = usePathname();
  return (
    <SafeAreaView style={u.safe} edges={["top", "left", "right"]}>
      <View style={u.header} accessibilityLabel="Ozon Coffee">
        <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
          <Text style={u.brand}>ozon</Text>
          <View style={u.coffeeTag}>
            <Text style={u.coffeeText}>COFFEE</Text>
          </View>
        </View>
        <Image
          source={require("../../assets/ozon-coffee-icon.png")}
          style={{ width: 36, height: 36, borderRadius: 11 }}
        />
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={u.body}
      >
        <Text style={u.title}>{title}</Text>
        {subtitle && <Text style={u.muted}>{subtitle}</Text>}
        {children}
      </ScrollView>
      {footer && <View style={u.footer}>{footer}</View>}
      <SafeAreaView edges={["bottom"]} style={u.nav}>
        <View style={u.navRow}>
          <Nav title="Главная" to="/" icon="menu" selected={path === "/"} />
          <Nav
            title="Каталог"
            to="/catalog"
            icon="cup"
            selected={path === "/catalog"}
          />
          <Nav
            title="Корзина"
            to="/cart"
            icon="cart"
            count={count}
            selected={path === "/cart" || path === "/checkout"}
          />
          <Nav
            title="Заказы"
            to="/orders"
            icon="orders"
            selected={path.startsWith("/order")}
          />
          <Nav
            title="Профиль"
            to="/account"
            icon="user"
            selected={path === "/account"}
          />
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}
function Nav({
  title,
  to,
  icon,
  count = 0,
  selected,
}: {
  title: string;
  to: "/" | "/cart" | "/orders" | "/catalog" | "/account";
  icon: "menu" | "cart" | "orders" | "cup" | "user";
  count?: number;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count ? `${title} · ${count}` : title}
      accessibilityState={{ selected }}
      onPress={() => router.navigate(to)}
      style={u.navItem}
    >
      <View>
        <Icon
          name={icon}
          color={selected ? colors.accent : "#8D99A8"}
          size={23}
        />
        {count > 0 && (
          <View style={u.badge}>
            <Text style={u.badgeText}>{count > 99 ? "99+" : count}</Text>
          </View>
        )}
      </View>
      <Text
        style={[u.navText, { color: selected ? colors.accent : colors.muted }]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <Card style={{ alignItems: "center", paddingVertical: 30 }}>
      <View
        style={{
          backgroundColor: colors.paleBlue,
          padding: 25,
          borderRadius: 32,
        }}
      >
        <Icon name="cup" size={60} />
      </View>
      <Text style={u.heading}>{title}</Text>
      <Text style={[u.muted, { textAlign: "center" }]}>{text}</Text>
      <View style={{ alignSelf: "stretch", marginTop: 8 }}>
        <Button
          title="Выбрать в меню"
          onPress={() => router.navigate("/catalog")}
        />
      </View>
    </Card>
  );
}
export const u = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
  },
  body: { padding: 16, paddingBottom: 24, gap: 14 },
  brand: {
    color: colors.accent,
    fontWeight: "900",
    fontStyle: "italic",
    fontSize: 36,
    letterSpacing: -1.5,
  },
  coffeeTag: {
    backgroundColor: colors.accent,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 7,
  },
  coffeeText: {
    fontSize: 11,
    color: "#FFF",
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: { fontSize: 26, fontWeight: "800", color: colors.text },
  heading: { color: colors.text, fontSize: 19, fontWeight: "700" },
  text: { color: colors.text, fontSize: 15, lineHeight: 22 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  card: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.card,
    gap: 11,
  },
  button: {
    minHeight: 46,
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  secondary: { backgroundColor: colors.paleBlue },
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
    gap: 12,
  },
  nav: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  navRow: { flexDirection: "row" },
  navItem: {
    flex: 1,
    minHeight: 62,
    gap: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  navText: { fontSize: 11, fontWeight: "600" },
  badge: {
    position: "absolute",
    top: -6,
    right: -15,
    backgroundColor: colors.pink,
    borderRadius: 10,
    minWidth: 19,
    paddingHorizontal: 4,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFF",
  },
  badgeText: { color: "#FFF", fontSize: 10, fontWeight: "700" },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 13,
    color: colors.text,
    fontSize: 15,
  },
  chip: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.accent },
  chipText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: 14,
    backgroundColor: colors.card,
    paddingHorizontal: 13,
  },
  searchInput: {
    flex: 1,
    minHeight: 46,
    color: colors.text,
    fontSize: 14,
    paddingVertical: 9,
  },
  promo: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    overflow: "hidden",
    minHeight: 128,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  promoLabel: {
    alignSelf: "flex-start",
    color: "#FFF",
    backgroundColor: colors.pink,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 10,
  },
  promoTitle: {
    color: "#FFF",
    fontSize: 23,
    lineHeight: 28,
    fontWeight: "800",
  },
  promoCaption: {
    color: "#DDEAFF",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
  productTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 20,
  },
  price: { fontSize: 23, fontWeight: "800", color: colors.text },
  productPhoto: { width: "100%", height: 128, borderRadius: 12 },
  productMeta: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  labelPink: { color: colors.pink, fontSize: 11, fontWeight: "700" },
});

export function Tabs({
  options,
  value,
  onChange,
}: {
  options: readonly (readonly [string, string])[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
    >
      {options.map(([id, label]) => (
        <Pressable
          key={id}
          accessibilityRole="button"
          accessibilityState={{ selected: id === value }}
          onPress={() => onChange(id)}
          style={[u.chip, id === value && u.chipActive]}
        >
          <Text style={[u.chipText, id === value && { color: "#FFF" }]}>
            {label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
export function RequireAccount({ children }: { children: React.ReactNode }) {
  const shop = useShop();
  if (!shop.user)
    return (
      <Card>
        <Text style={u.heading}>Войдите для бронирования</Text>
        <Text style={u.muted}>
          Бронь будет сохранена в вашем профиле на этом устройстве.
        </Text>
        <Button
          title="Войти или зарегистрироваться"
          onPress={() => router.push("/account")}
        />
      </Card>
    );
  return <>{children}</>;
}
