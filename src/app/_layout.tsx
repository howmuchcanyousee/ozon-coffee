import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SQLiteProvider } from "expo-sqlite";
import { ShopProvider } from "../store/ShopProvider";
import { initialize } from "../data/shop";
// Metro imports the bundled database as an asset identifier.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const databaseAsset = require("../../assets/database/coffeehouse.sqlite");
export default function Layout() {
  return (
    <SQLiteProvider
      databaseName="coffeehouse.sqlite"
      assetSource={{ assetId: databaseAsset }}
      onInit={initialize}
    >
      <ShopProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#F2F3F5" },
          }}
        />
      </ShopProvider>
    </SQLiteProvider>
  );
}
