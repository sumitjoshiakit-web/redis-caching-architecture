const API_URL="/api/cache";
async function request(url,options={}){
  const response=await fetch(url,{...options,headers:{"Content-Type":"application/json",...(options.headers||{})}});
  const data=await response.json().catch(()=>({}));
  if(!response.ok||data.success===false) throw new Error(data.message||"Request failed.");
  return data.data;
}
export const listEntries=(search="")=>request(`${API_URL}?search=${encodeURIComponent(search)}`);
export const createEntry=entry=>request(API_URL,{method:"POST",body:JSON.stringify(entry)});
export const updateEntry=(id,entry)=>request(`${API_URL}?id=${encodeURIComponent(id)}`,{method:"PATCH",body:JSON.stringify(entry)});
export const deleteEntry=id=>request(`${API_URL}?id=${encodeURIComponent(id)}`,{method:"DELETE"});