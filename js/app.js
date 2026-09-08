import { listEntries, createEntry, updateEntry, deleteEntry } from "./api.js";
import { sanitizeText, escapeHtml } from "./sanitize.js";

const state = { searchTerm:"", loading:false, loadError:null, entries:[], editingId:null };
const els = {
  searchInput:document.getElementById("search-input"),
  addButton:document.getElementById("add-entry-btn"),
  statusRegion:document.getElementById("status-region"),
  tableWrap:document.getElementById("table-wrap"),
  tableBody:document.getElementById("entries-body"),
  modalOverlay:document.getElementById("modal-overlay"),
  modalTitle:document.getElementById("modal-title"),
  form:document.getElementById("entry-form"),
  cacheKeyInput:document.getElementById("cache-key"),
  cacheValueInput:document.getElementById("cache-value"),
  ttlInput:document.getElementById("ttl-seconds"),
  cacheKeyError:document.getElementById("cache-key-error"),
  cacheValueError:document.getElementById("cache-value-error"),
  ttlError:document.getElementById("ttl-error"),
  cancelButton:document.getElementById("cancel-btn")
};
let lastFocusedElement=null;
let searchDebounce;

function logAnalytics(action, detail={}) {
  // eslint-disable-next-line no-console
  console.log(`[Analytics] User interacted with Redis Caching: ${action}`, detail);
}
function setLoading(value){state.loading=value;render();}
async function refreshEntries(){
  setLoading(true); state.loadError=null;
  try { state.entries=await listEntries(state.searchTerm); }
  catch { state.loadError="Could not load cache entries. Check your connection and try again."; }
  finally { setLoading(false); }
}
function renderStatusRegion(){
  if(state.loading){els.statusRegion.innerHTML='<div class="status-line" role="status"><span class="spinner" aria-hidden="true"></span>Loading cache entries…</div>';els.tableWrap.hidden=true;return;}
  if(state.loadError){els.statusRegion.innerHTML=`<div class="status-line" data-tone="error" role="alert">${escapeHtml(state.loadError)}</div>`;els.tableWrap.hidden=true;return;}
  if(!state.entries.length){const msg=state.searchTerm?"No data found for that search.":"No data found. Add a cache entry to get started.";els.statusRegion.innerHTML=`<div class="status-line" role="status">${escapeHtml(msg)}</div>`;els.tableWrap.hidden=true;return;}
  els.statusRegion.innerHTML="";els.tableWrap.hidden=false;
}
function renderRows(){
  if(state.loading||state.loadError||!state.entries.length){els.tableBody.innerHTML="";return;}
  els.tableBody.innerHTML=state.entries.map(entry=>`<tr>
    <td>${escapeHtml(entry.cacheKey)}</td><td>${escapeHtml(entry.cacheValue)}</td><td>${Number(entry.ttlSeconds)}s</td>
    <td><div class="row-actions">
      <button type="button" class="btn btn-secondary" data-action="edit" data-id="${escapeHtml(entry.id)}" aria-label="Edit entry ${escapeHtml(entry.cacheKey)}">Edit</button>
      <button type="button" class="btn btn-danger" data-action="delete" data-id="${escapeHtml(entry.id)}" aria-label="Delete entry ${escapeHtml(entry.cacheKey)}">Delete</button>
    </div></td>
  </tr>`).join("");
}
function render(){renderStatusRegion();renderRows();}
function clearFieldErrors(){
  [els.cacheKeyInput,els.cacheValueInput,els.ttlInput].forEach(input=>{input.classList.remove("input-error");input.removeAttribute("aria-invalid");});
  [els.cacheKeyError,els.cacheValueError,els.ttlError].forEach(el=>{el.textContent="";});
}
function showFieldError(input,errorEl,message){input.classList.add("input-error");input.setAttribute("aria-invalid","true");errorEl.textContent=message;}
function validateForm(){
  clearFieldErrors(); let valid=true;
  const key=sanitizeText(els.cacheKeyInput.value);
  const value=sanitizeText(els.cacheValueInput.value);
  const ttl=Number(els.ttlInput.value.trim());
  if(!key||key.length>255){showFieldError(els.cacheKeyInput,els.cacheKeyError,"Cache key is required and must be 1–255 characters.");valid=false;}
  if(!value){showFieldError(els.cacheValueInput,els.cacheValueError,"Cache value is required.");valid=false;}
  else {try{JSON.parse(value);}catch{showFieldError(els.cacheValueInput,els.cacheValueError,"Cache value must be valid JSON.");valid=false;}}
  if(!Number.isInteger(ttl)||ttl<=0){showFieldError(els.ttlInput,els.ttlError,"TTL must be a positive integer of seconds.");valid=false;}
  return valid;
}
function unescapeForEdit(value){return String(value).replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'");}
function openModal(mode,entry=null){
  state.editingId=mode==="create"?"new":entry.id;lastFocusedElement=document.activeElement;clearFieldErrors();
  els.modalTitle.textContent=mode==="create"?"Add cache entry":"Edit cache entry";
  els.cacheKeyInput.value=mode==="edit"?unescapeForEdit(entry.cacheKey):"";
  els.cacheValueInput.value=mode==="edit"?unescapeForEdit(entry.cacheValue):"";
  els.ttlInput.value=mode==="edit"?entry.ttlSeconds:"";
  els.modalOverlay.hidden=false;els.cacheKeyInput.focus();document.addEventListener("keydown",handleModalKeydown);
}
function closeModal(){state.editingId=null;els.modalOverlay.hidden=true;document.removeEventListener("keydown",handleModalKeydown);if(lastFocusedElement)lastFocusedElement.focus();}
function trapFocus(event){
  const focusable=els.modalOverlay.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
  if(!focusable.length)return;const first=focusable[0],last=focusable[focusable.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
}
function handleModalKeydown(event){if(event.key==="Escape")closeModal();else if(event.key==="Tab")trapFocus(event);}
async function handleFormSubmit(event){
  event.preventDefault();
  if(!validateForm()){logAnalytics("form validation failed");return;}
  const payload={cacheKey:sanitizeText(els.cacheKeyInput.value),cacheValue:sanitizeText(els.cacheValueInput.value),ttlSeconds:Number(els.ttlInput.value.trim())};
  setLoading(true);
  try {
    if(state.editingId==="new"){await createEntry(payload);logAnalytics("create cache entry",{cacheKey:payload.cacheKey});}
    else {await updateEntry(state.editingId,payload);logAnalytics("update cache entry",{cacheKey:payload.cacheKey});}
    closeModal();await refreshEntries();
  } catch(error){state.loadError=error.message||"Could not save the entry. Try again.";setLoading(false);}
}
async function handleTableClick(event){
  const button=event.target.closest("button[data-action]");if(!button)return;
  const {action,id}=button.dataset;const entry=state.entries.find(item=>item.id===id);if(!entry)return;
  if(action==="edit"){openModal("edit",entry);return;}
  if(action==="delete"){
    if(!window.confirm(`Delete cache entry "${unescapeForEdit(entry.cacheKey)}"?`))return;
    setLoading(true);
    try{await deleteEntry(id);logAnalytics("delete cache entry",{cacheKey:entry.cacheKey});await refreshEntries();}
    catch(error){state.loadError=error.message||"Could not delete the entry. Try again.";setLoading(false);}
  }
}
function handleSearchInput(event){
  state.searchTerm=sanitizeText(event.target.value);clearTimeout(searchDebounce);
  searchDebounce=setTimeout(()=>{logAnalytics("search cache entries",{term:state.searchTerm});refreshEntries();},300);
}
function init(){
  els.searchInput.addEventListener("input",handleSearchInput);
  els.addButton.addEventListener("click",()=>openModal("create"));
  els.cancelButton.addEventListener("click",closeModal);
  els.modalOverlay.addEventListener("click",event=>{if(event.target===els.modalOverlay)closeModal();});
  els.form.addEventListener("submit",handleFormSubmit);
  els.tableBody.addEventListener("click",handleTableClick);
  refreshEntries();
}
init();