import { pbkdf2 } from 'react-native-quick-crypto';
// Native OpenSSL work runs off the JavaScript thread and preserves the portable hash format.
export function derivePassword(password:string,salt:string):Promise<string>{
 return new Promise((resolve,reject)=>{
  pbkdf2(password,salt,600000,32,'sha256',(error,key)=>{
   if(error)reject(error);else if(!key)reject(new Error('Не удалось обработать пароль.'));else resolve(key.toString('hex'));
  });
 });
}
