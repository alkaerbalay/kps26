// A post-save refresh must start after any snapshot already in flight finishes.
export function createReadCoordinator(){
 let pending=null;
 return async function read(task,fresh=false){
  if(fresh&&pending)await pending.catch(()=>{});
  if(!pending){
   const request=Promise.resolve().then(task);
   pending=request;
   request.finally(()=>{if(pending===request)pending=null}).catch(()=>{});
  }
  return pending;
 };
}
