import { ImageBackground, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
export default function Home() {
  return <ImageBackground source={require('../../assets/coffee/hero_menu.png')} style={s.background}>
    <View style={s.shade}><SafeAreaView style={s.page}>
      <Text style={s.label}>COFFEEHOUSE PRO</Text>
      <Text style={s.title}>Всё начинается{ '\n' }с хорошего кофе</Text>
      <Text style={s.subtitle}>Основа приложения подготовлена. Следующий этап — каталог и корзина.</Text>
      <View style={s.badge}><Text style={s.badgeText}>React Native · SQLite · Android</Text></View>
    </SafeAreaView></View>
  </ImageBackground>;
}
const s=StyleSheet.create({background:{flex:1},shade:{flex:1,backgroundColor:'rgba(20,12,8,0.8)'},page:{flex:1,padding:28,justifyContent:'center'},label:{color:'#D6A36C',fontSize:14,letterSpacing:3,fontWeight:'700'},title:{color:'#FFF3E4',fontSize:38,fontWeight:'700',marginTop:22},subtitle:{color:'#D5C2AC',fontSize:17,lineHeight:26,marginTop:24},badge:{alignSelf:'flex-start',borderWidth:1,borderColor:'#78543A',borderRadius:18,padding:12,marginTop:30},badgeText:{color:'#E8C398',fontSize:13}});
