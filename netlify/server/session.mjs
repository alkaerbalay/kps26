const unavailable='تعذر الاتصال بخدمة التحقق من الجلسة مؤقتاً. أعد المحاولة بعد قليل.';
const failure=(message,status)=>Object.assign(new Error(message),{status});

// Never derive the verification host from an untrusted request header.
export async function verifySession(cookie,{siteUrl=process.env.URL||'https://kps26.netlify.app',request=fetch}={}){
 const token=cookie.split(';').map(value=>value.trim()).find(value=>value.startsWith('nf_jwt='))?.slice(7);
 if(!token)throw failure('سجّل الدخول للوصول إلى بيانات العمل',401);
 let response;
 try{
  response=await request(new URL('/.netlify/identity/user',siteUrl),{
   headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(8000),redirect:'error',cache:'no-store'
  });
 }catch{throw failure(unavailable,503)}
 if([401,403].includes(response.status))throw failure('انتهت الجلسة، يرجى تسجيل الدخول مجدداً',401);
 if(!response.ok)throw failure(unavailable,503);
 try{
  const user=await response.json();
  if(!user||typeof user.email!=='string')throw Error();
  return user;
 }catch{throw failure(unavailable,503)}
}
