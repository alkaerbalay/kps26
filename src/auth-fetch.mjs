import {getUser,refreshSession} from '@netlify/identity';

// Share refresh work across simultaneous reads/uploads/writes in this tab.
export function createAuthenticatedFetch({getUser,refreshSession,fetch}) {
 let pending;
 async function prepare(){
  if(!pending)pending=(async()=>{await getUser();await refreshSession()})().finally(()=>{pending=null});
  await pending;
 }
 return async function authenticatedFetch(url,options={}){
  await prepare();
  return fetch(url,{...options,credentials:'same-origin',cache:'no-store'});
 };
}
export const authenticatedFetch=createAuthenticatedFetch({getUser,refreshSession,fetch:(...args)=>globalThis.fetch(...args)});
