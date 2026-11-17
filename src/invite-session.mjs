// acceptInvite in the current SDK accepts the invitation but does not write
// the cookies used by private APIs. Its public login API completes that step.
export async function acceptInviteSession({acceptInvite,login},token,password){
 const invited=await acceptInvite(token,password);
 if(!invited?.email)throw new Error('تعذر استكمال الدخول. استخدم بريد الدعوة وكلمة المرور التي عيّنتها لتسجيل الدخول.');
 try{return await login(invited.email,password)}
 catch{throw Object.assign(new Error('تم قبول الدعوة وتعيين كلمة المرور، لكن تعذر استكمال الدخول. سجّل الدخول ببريد الدعوة وكلمة المرور التي عيّنتها؛ لا يلزم قبول الدعوة مرة أخرى.'),{code:'INVITE_ACCEPTED_LOGIN_PENDING'})}
}
