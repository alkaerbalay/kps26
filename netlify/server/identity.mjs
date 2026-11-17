// Only the configured project verifies sessions; request headers never choose the issuer.
export async function verifyIdentity(token,{fetch:request=fetch,base=process.env.URL||'https://kps26.netlify.app'}={}){
 const unavailable=()=>({status:503,error:'خدمة التحقق من الجلسة غير متاحة مؤقتاً. أعد المحاولة بعد قليل.'});
 try{
  const response=await request(new URL('/.netlify/identity/user',base),{
   headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(8000),redirect:'error',cache:'no-store'
  });
  if([401,403].includes(response.status))return {status:401,error:'انتهت الجلسة أو أُلغي الوصول، يرجى تسجيل الدخول مجدداً'};
  if(!response.ok)return unavailable();
  const user=await response.json();
  if(!user?.id||!user.email)return unavailable();
  if(!user.confirmed_at)return {status:403,error:'يجب تأكيد البريد الإلكتروني'};
  return {user};
 }catch{return unavailable()}
}
