'use strict';
const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let mode='cards';try{mode=localStorage.getItem('abba-hml-simple-view')==='list'?'list':'cards'}catch(_){}
const search=document.getElementById('search'),month=document.getElementById('month'),schedule=document.getElementById('schedule');
try{search.value=localStorage.getItem('abba-hml-simple-name')||''}catch(_){}
function format(d,options){return new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC',...options}).format(new Date(d+'T12:00:00Z'))}
function title(s){return s.charAt(0).toUpperCase()+s.slice(1)}function value(v){return v==='-'?'—':v}function matches(v){return normalize(search.value)&&normalize(v).includes(normalize(search.value))}
function card(r,isNext){const [date,roles,note]=r;return `<article class="cult ${isNext?'next':''}"><div class="cult-head"><div class="date" aria-hidden="true"><strong>${date.slice(8)}</strong><span>${format(date,{month:'short'}).replace('.','')}</span></div><div class="cult-title">${isNext?`<span class="next-label">${search.value?'Primeira escala encontrada':'Primeiro culto disponível'}</span>`:''}<h3>${title(format(date,{weekday:'long'}))}</h3><p class="full-date"><time datetime="${date}">${format(date,{day:'2-digit',month:'long',year:'numeric'})}</time></p></div><span class="active-label">Ativo</span></div><dl class="roles">${roles.map((v,i)=>`<div class="role ${matches(v)?'is-match':''}"><dt>${ministries[i]}</dt><dd>${escapeHtml(value(v))}</dd></div>`).join('')}</dl>${note?`<p class="observation">${escapeHtml(note)}</p>`:''}</article>`}
function table(rs){return `<p class="table-hint">Deslize a tabela para os lados para ver todos os ministérios.</p><div class="table-view" role="region" aria-label="Escala em lista" tabindex="0"><table class="schedule-table"><thead><tr>${['Data','Dia',...ministries,'Observação'].map(n=>`<th scope="col">${n}</th>`).join('')}</tr></thead><tbody>${rs.map(([date,roles,note])=>`<tr><td>${format(date,{day:'2-digit',month:'2-digit'})}</td><td>${format(date,{weekday:'long'})}</td>${roles.map(v=>`<td class="${matches(v)?'is-match':''}">${escapeHtml(value(v))}</td>`).join('')}<td>${escapeHtml(note||'—')}</td></tr>`).join('')}</tbody></table></div>`}
function render(){const query=normalize(search.value);const filtered=copied.filter(([date,roles])=>(!month.value||date.startsWith(month.value))&&(!query||roles.some(v=>normalize(v).includes(query))));document.getElementById('clear').hidden=!search.value;const result=document.getElementById('result');result.hidden=!query;result.textContent=`${filtered.length} ${filtered.length===1?'culto encontrado':'cultos encontrados'} para “${search.value.trim()}”.`;document.getElementById('cards').setAttribute('aria-pressed',String(mode==='cards'));document.getElementById('list').setAttribute('aria-pressed',String(mode==='list'));const months=new Map();filtered.forEach(r=>{const key=r[0].slice(0,7);if(!months.has(key))months.set(key,[]);months.get(key).push(r)});schedule.innerHTML=filtered.length?[...months.entries()].map(([key,rs])=>`<section class="month" aria-labelledby="month-${key}"><div class="month-heading"><h2 id="month-${key}">${title(format(rs[0][0],{month:'long',year:'numeric'}))}</h2><span class="count">${rs.length} ${rs.length===1?'culto':'cultos'}</span></div>${mode==='list'?table(rs):`<div class="cards">${rs.map(r=>card(r,r===filtered[0])).join('')}</div>`}</section>`).join(''):'<p class="empty">Nenhuma escala encontrada. Tente outro nome ou selecione todos os meses.</p>'}
search.addEventListener('input',()=>{try{localStorage.setItem('abba-hml-simple-name',search.value)}catch(_){}render()});month.addEventListener('change',render);document.getElementById('clear').addEventListener('click',()=>{search.value='';try{localStorage.removeItem('abba-hml-simple-name')}catch(_){}render();search.focus()});for(const view of ['cards','list'])document.getElementById(view).addEventListener('click',()=>{mode=view;try{localStorage.setItem('abba-hml-simple-view',view)}catch(_){}render()});
let installPrompt=null;const installButton=document.getElementById('install');window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e});window.addEventListener('appinstalled',()=>{installButton.textContent='App instalado';installButton.disabled=true;installPrompt=null});installButton.addEventListener('click',async()=>{if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null}else document.getElementById('install-help').showModal()});document.getElementById('close-help').addEventListener('click',()=>document.getElementById('install-help').close());
function legacyConnection(){document.getElementById('connection').textContent=navigator.onLine?'Disponível para consulta':'Sem conexão · cópia salva no aparelho'}if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});

const API_URL='https://sheetdb.io/api/v1/q90nhb3xq4i8t';
let loading=false,lastUpdated=null;
function activeRows(rows){
 if(!Array.isArray(rows))throw new Error('Resposta inválida');
 const seen=new Set();return rows.filter(r=>normalize(r.Status||'')==='ativo').map(r=>{
 const match=String(r.Data||'').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(!match)return null;
 const [,d,m,y]=match,date=y+'-'+m+'-'+d,check=new Date(date+'T12:00:00Z');
 if(!Number.isFinite(check.getTime())||check.toISOString().slice(0,10)!==date||seen.has(date))return null;
 seen.add(date);return [date,ministries.map(k=>String(r[k]||'').trim()||'-'),String(r['Observação']||'').trim()];
 }).filter(Boolean).sort((a,b)=>a[0].localeCompare(b[0]));
}
function updateMonths(){const selected=month.value;const keys=[...new Set(copied.map(r=>r[0].slice(0,7)))];month.innerHTML='<option value="">Todos os meses</option>'+keys.map(k=>'<option value="'+k+'">'+title(format(k+'-01',{month:'long',year:'numeric'}))+'</option>').join('');month.value=keys.includes(selected)?selected:'';}
async function refreshSchedule(){
 if(loading)return;loading=true;const button=document.getElementById('refresh'),status=document.getElementById('connection');button.disabled=true;status.textContent='Atualizando escala…';
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
 try{const response=await fetch(API_URL,{cache:'no-store',signal:controller.signal});if(!response.ok)throw new Error('HTTP '+response.status);const rows=activeRows(await response.json());copied=rows;lastUpdated=new Date();updateMonths();render();status.textContent='Atualizado às '+lastUpdated.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});if(!copied.length)schedule.innerHTML='<p class="empty">Nenhuma escala ativa disponível no momento.</p>';}
 catch(error){copied=[];updateMonths();render();status.textContent='Não foi possível atualizar a escala';schedule.innerHTML='<p class="empty">Não foi possível confirmar a escala atual. Verifique sua conexão e toque em Atualizar escala.</p>';}
 finally{clearTimeout(timeout);loading=false;button.disabled=false;}
}
document.getElementById('refresh').addEventListener('click',refreshSchedule);
window.addEventListener('online',refreshSchedule);
window.addEventListener('offline',()=>{copied=[];render();document.getElementById('connection').textContent='Sem conexão · conecte-se para confirmar a escala';});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshSchedule()});
render();refreshSchedule();setInterval(refreshSchedule,15*60*1000);
