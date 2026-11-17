// Send each operation once; business data is always fetched from the server.
export function createApiFetch({fetch}) {
 return (url,options={})=>fetch(url,{...options,credentials:'same-origin',cache:'no-store'});
}
export const apiFetch=createApiFetch({fetch:(...args)=>globalThis.fetch(...args)});
