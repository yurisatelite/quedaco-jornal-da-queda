export function e(value){return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));}
export function multiline(value){return e(value).replace(/\n/g,'<br>');}
