'use strict';

let customers = [];
let currentPage = 1;
const pageSize = 10;
const selectedIds = new Set();
let todayOnly = false;
let activeStatsFilter = "all";
let activeConsultCustomerId = null;
let editingHistoryIndex = null;
let activeContractFilter = "all";
let contractsColumnAvailable = true;
let calendarDate = new Date();
let activeTaskFilter = "all";
let activeTaskSort = "urgent";
let consultInitialMemo = "";
let initialPaymentInfo = {};
let initialIdentityInfo = {};
const favoriteStorageKey = "ai-crm-favorites-v1";

let saveToastTimer=null;
function showSaveToast(message="저장되었습니다.",type="success"){
  const toast=$("saveToast");
  if(!toast)return;
  clearTimeout(saveToastTimer);
  toast.textContent=message;
  toast.className=`save-toast show ${type}`;
  saveToastTimer=setTimeout(()=>{toast.className="save-toast";},2200);
}
function setSaving(button,saving,defaultText){
  if(!button)return;
  if(saving){
    if(!button.dataset.defaultText)button.dataset.defaultText=defaultText||button.textContent;
    button.disabled=true;
    button.textContent="저장 중...";
  }else{
    button.disabled=false;
    button.textContent=defaultText||button.dataset.defaultText||"저장";
  }
}
function sameData(a,b){return JSON.stringify(a)===JSON.stringify(b)}
function savedTimeText(){return `${new Date().toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit",hour12:false})} 저장됨`;}
function setSectionStatus(id,state,text){
  const el=$(id); if(!el)return;
  el.className=`save-status ${state}`;
  el.textContent=text||(state==="dirty"?"● 저장 안 됨":"저장됨");
}
function currentPaymentInfo(){return {
  payment_bank:$("consultPaymentBank").value.trim(),
  payment_account:$("consultPaymentAccount").value.trim(),
  payment_day:$("consultPaymentDay").value,
  card_number:$("consultCardNumber").value.replace(/\s|-/g,""),
  card_expiry:$("consultCardExpiry").value.trim()
};}
function currentIdentityInfo(){return {
  identity_verified:$("consultIdentityVerified").checked,
  driver_license:$("consultDriverLicense").value.trim(),
  resident_issue_date:$("consultResidentIssueDate").value||null
};}
function markPaymentDirty(){setSectionStatus("paymentSaveStatus",sameData(currentPaymentInfo(),initialPaymentInfo)?"saved":"dirty");}
function markIdentityDirty(){setSectionStatus("identitySaveStatus",sameData(currentIdentityInfo(),initialIdentityInfo)?"saved":"dirty");}

const $ = id => document.getElementById(id);
const today = () => {
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const esc = s => String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const num = v => Number(v || 0);
const formatWon = v => Math.round(num(v)).toLocaleString("ko-KR") + "원";
const cleanPhone = v => String(v || "").replace(/[^0-9+]/g,"");
const readFavorites = () => { try { return new Set(JSON.parse(localStorage.getItem(favoriteStorageKey)||"[]").map(String)); } catch(e) { return new Set(); } };
const writeFavorites = set => localStorage.setItem(favoriteStorageKey, JSON.stringify([...set]));
function isFavorite(id){ return readFavorites().has(String(id)); }
function toggleFavorite(id){ const set=readFavorites(); const key=String(id); set.has(key)?set.delete(key):set.add(key); writeFavorites(set); render(); }
function lastContactLabel(customer){ const d=getLastTouchDate(customer); if(!d)return "상담 없음"; const days=daysBetween(d); return `${d} · ${days===0?"오늘":days+"일 경과"}`; }
function autoExpiryLevel(customer){
  const d=daysUntil(getInsuranceInfo(customer).auto_expiry_date);
  if(d===null)return ""; if(d<0)return "expired"; if(d===0)return "today"; if(d<=7)return "d7"; if(d<=15)return "d15"; if(d<=30)return "d30"; return "";
}
function getContracts(customer){
  if(Array.isArray(customer?.contracts)) return customer.contracts;
  if(typeof customer?.contracts==="string"){ try{const x=JSON.parse(customer.contracts); if(Array.isArray(x))return x;}catch(e){} }
  if(customer?.contract_date) return [{id:"legacy",company:"",product:"",date:dateOnly(customer.contract_date),amount:num(customer.monthly_premium),status:"유지"}];
  return [];
}
function contractTotal(customer){return getContracts(customer).reduce((s,c)=>s+num(c.amount),0)}
function latestContractDate(customer){return getContracts(customer).map(c=>dateOnly(c.date)).filter(Boolean).sort().pop()||""}
function contractReached(contract,days){const date=dateOnly(contract.date); return date && daysBetween(date)>=days}


const taskStorageKey = "ai-crm-completed-tasks-v1";
const readCompletedTasks = () => { try { return JSON.parse(localStorage.getItem(taskStorageKey)||"{}"); } catch(e) { return {}; } };
const writeCompletedTasks = value => localStorage.setItem(taskStorageKey, JSON.stringify(value));
const dateOnly = value => value ? String(value).slice(0,10) : "";
const parseLocalDate = value => { if(!value)return null; const [y,m,d]=dateOnly(value).split("-").map(Number); return y&&m&&d?new Date(y,m-1,d):null; };
const addDays = (value,days) => { const d=parseLocalDate(value); if(!d)return ""; d.setDate(d.getDate()+days); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const addYears = (value,years) => { const d=parseLocalDate(value); if(!d)return ""; d.setFullYear(d.getFullYear()+years); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const daysBetween = (from,to=today()) => { const a=parseLocalDate(from),b=parseLocalDate(to); return a&&b?Math.floor((b-a)/86400000):0; };
function getLastTouchDate(customer){
  const history=getConsultHistory(customer);
  const latest=history.map(x=>dateOnly(x.updated_at||x.created_at)).filter(Boolean).sort().pop();
  return latest||dateOnly(customer.created_at);
}
function hasConsultationOnOrAfter(customer,targetDate){
  const due=dateOnly(targetDate);
  if(!due)return false;
  return getConsultHistory(customer).some(item=>{
    const recorded=dateOnly(item.created_at||item.updated_at);
    return recorded&&recorded>=due;
  });
}
function customerTasks(customer){
  const completed=readCompletedTasks();
  const items=[];
  const add=(key,due,title,badge)=>{ const unique=`${customer.id}:${key}`; if(due&&due<=today()&&!completed[unique]) items.push({unique,key,due,title,badge,customer,overdue:Math.max(0,daysBetween(due))}); };
  getContracts(customer).forEach((contract,index)=>{
    if(!contract.date)return;
    const contractKey=contract.id||index;
    add(`contract_${contractKey}_30d`,addDays(contract.date,30),`${index+1}번째 계약 30일 경과 확인`,`30일`);
    add(`contract_${contractKey}_90d`,addDays(contract.date,90),`${index+1}번째 계약 90일 경과 확인`,`90일`);
    add(`contract_${contractKey}_1y`,addYears(contract.date,1),`${index+1}번째 계약 1주년 고객 관리`,`1년`);
  });
  const insurance=getInsuranceInfo(customer);
  if(insurance.auto_expiry_date&&insurance.auto_renewal_status!=="갱신 완료"){
    add(`auto_30:${insurance.auto_expiry_date}`,addDays(insurance.auto_expiry_date,-30),`자동차보험 만기 30일 전 · ${insurance.vehicle_number||"차량번호 미등록"}`,`자동차 30일`);
    add(`auto_15:${insurance.auto_expiry_date}`,addDays(insurance.auto_expiry_date,-15),`자동차보험 만기 15일 전 · ${insurance.vehicle_number||"차량번호 미등록"}`,`자동차 15일`);
    add(`auto_7:${insurance.auto_expiry_date}`,addDays(insurance.auto_expiry_date,-7),`자동차보험 만기 7일 전 · ${insurance.vehicle_number||"차량번호 미등록"}`,`자동차 7일`);
    add(`auto_0:${insurance.auto_expiry_date}`,insurance.auto_expiry_date,`자동차보험 만기 당일 · ${insurance.vehicle_number||"차량번호 미등록"}`,`자동차 만기`);
  }
  const lastTouch=getLastTouchDate(customer);
  if(lastTouch) add(`no_touch_30d:${lastTouch}`,addDays(lastTouch,30),"마지막 상담 후 30일 미접촉","미접촉 30일");
  if(customer.follow_up_date) add(`follow_up:${customer.follow_up_date}`,customer.follow_up_date,customer.follow_up_date===today()?"오늘 연락 예정":"연락 예정일 경과","연락");
  const birthday=getProfileInfo(customer).birthday;
  if(birthday){
    const mmdd=birthday.slice(5); const year=today().slice(0,4); let due=`${year}-${mmdd}`; if(due<today()) due=`${Number(year)+1}-${mmdd}`;
    add(`birthday_14:${due}`,addDays(due,-14),`생일 2주 전 준비 · ${mmdd.replace("-","월 ")}일`,`생일 2주`);
    add(`birthday_7:${due}`,addDays(due,-7),`이번 주 생일 고객 연락 · ${mmdd.replace("-","월 ")}일`,`생일 7일`);
    add(`birthday_1:${due}`,addDays(due,-1),`내일 생일 축하 연락 준비`,`생일 내일`);
    add(`birthday_today:${due}`,due,`오늘 생일 · 축하 연락`,`생일 오늘`);
  }
  return items;
}
function taskCategory(task){
  const badge=String(task.badge||"");
  if(badge.includes("자동차")) return "자동차";
  if(badge.includes("생일")) return "생일";
  if(badge.includes("미접촉")) return "미접촉";
  if(badge.includes("연락")) return "연락";
  return "계약";
}
function taskUrgencyClass(task){
  const badge=String(task.badge||"");
  if(!badge.includes("자동차")) return "";
  if(badge.includes("만기")) return "auto-today";
  if(badge.includes("7일")) return "auto-d7";
  if(badge.includes("15일")) return "auto-d15";
  if(badge.includes("30일")) return "auto-d30";
  return "";
}
function getAllTasks(){
  let list=customers.flatMap(customerTasks);
  if(activeTaskFilter!=="all") list=list.filter(t=>taskCategory(t)===activeTaskFilter);
  if(activeTaskSort==="name") list.sort((a,b)=>(a.customer.name||"").localeCompare(b.customer.name||"","ko"));
  else if(activeTaskSort==="due") list.sort((a,b)=>a.due.localeCompare(b.due));
  else list.sort((a,b)=>(b.overdue-a.overdue)||a.due.localeCompare(b.due));
  return list;
}
function completeTask(unique){ const completed=readCompletedTasks(); completed[unique]=new Date().toISOString(); writeCompletedTasks(completed); renderTasks(); renderDashboard(); }
function renderTasks(){
  const tasks=getAllTasks();
  const allCount=customers.flatMap(customerTasks).length;
  $("taskCount").textContent=tasks.length; if($("navTaskCount")) $("navTaskCount").textContent=allCount;
  $("taskList").innerHTML=tasks.length?tasks.map((t,i)=>`<div class="task-item ${t.overdue>=7?'task-critical':''} ${taskUrgencyClass(t)}" data-customer-id="${esc(t.customer.id)}" title="더블클릭하면 고객 상세를 엽니다"><div><b>${esc(t.customer.name||"이름 없음")}</b><div><a href="tel:${esc(t.customer.phone||"")}">${esc(t.customer.phone||"연락처 없음")}</a></div></div><div class="task-main"><span class="task-badge category-${taskCategory(t)}">${esc(t.badge)}</span><b>${esc(t.title)}</b><span class="task-date">${esc(t.due)} · ${t.overdue?`<span class="task-overdue">${t.overdue}일 지남</span>`:"오늘 도래"}</span></div><div class="task-actions"><a class="task-call" href="tel:${esc(cleanPhone(t.customer.phone))}">전화</a><button class="task-open" data-task-action="open" data-task-index="${i}">상담 열기</button><button class="task-done" data-task-action="done" data-task-index="${i}">완료</button></div></div>`).join(""):'<div class="task-empty">선택한 조건에 해당하는 업무가 없습니다.</div>';
  $("taskList")._tasks=tasks;
}
function monthKey(date){return dateOnly(date).slice(0,7)}
function lastMonths(count=6){const out=[];const base=new Date();for(let i=count-1;i>=0;i--){const d=new Date(base.getFullYear(),base.getMonth()-i,1);out.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)}return out}
function renderDashboard(){
  if(!$("dashboardOverview")) return;
  const tasks=customers.flatMap(customerTasks).sort((a,b)=>(b.overdue-a.overdue)||a.due.localeCompare(b.due));
  const priority=tasks.slice(0,5);
  $("priorityCount").textContent=`${tasks.length}건`;
  $("priorityList").innerHTML=priority.length?priority.map(t=>`<button class="priority-item" data-priority-id="${esc(t.customer.id)}"><span class="priority-icon">${taskCategory(t)==='연락'?'☎':taskCategory(t)==='생일'?'🎂':taskCategory(t)==='자동차'?'🚗':taskCategory(t)==='미접촉'?'!':'✓'}</span><span><b>${esc(t.customer.name)}</b><small>${esc(t.title)}</small></span><em>${t.overdue?`${t.overdue}일 지남`:'오늘'}</em></button>`).join(''):'<div class="dashboard-empty">오늘 긴급한 업무가 없습니다.</div>';
  const month=today().slice(0,7); const monthContracts=customers.flatMap(c=>getContracts(c).map(x=>({...x,customer:c}))).filter(c=>monthKey(c.date)===month);
  const newCustomers=customers.filter(c=>monthKey(c.created_at)===month).length;
  const contractedCustomers=new Set(monthContracts.map(x=>String(x.customer.id))).size;
  const conversion=newCustomers?Math.round(contractedCustomers/newCustomers*100):0;
  $("monthlySummary").innerHTML=`<div><small>신규 고객</small><strong>${newCustomers}명</strong></div><div><small>신규 계약</small><strong>${monthContracts.length}건</strong></div><div><small>월보험료</small><strong>${formatWon(monthContracts.reduce((s,c)=>s+num(c.amount),0))}</strong></div><div><small>단순 전환율</small><strong>${conversion}%</strong></div>`;
  const attention=[];
  const todayDate=today();
  customers.forEach(customer=>{
    const promisedDate=dateOnly(customer.follow_up_date);
    // 약속일 다음 날부터, 약속일 이후 상담기록이 없을 때 자동 표시
    if(!promisedDate||promisedDate>=todayDate)return;
    if(hasConsultationOnOrAfter(customer,promisedDate))return;
    const overdueDays=Math.max(1,daysBetween(promisedDate,todayDate));
    attention.push({
      id:customer.id,
      name:customer.name,
      text:`약속일 ${overdueDays}일 경과 · 상담 기록 없음`,
      days:overdueDays
    });
  });
  attention.sort((a,b)=>b.days-a.days);
  $("attentionList").innerHTML=attention.slice(0,6).map(x=>`<button data-attention-id="${esc(x.id)}" title="클릭하면 고객 상세를 엽니다"><b>${esc(x.name)}</b><span>${esc(x.text)}</span></button>`).join('')||'<div class="dashboard-empty">약속일이 지난 미기록 고객이 없습니다.</div>';
}
function renderStatistics(){
  if(!$("statisticsView")) return;
  const months=lastMonths(6); const data=months.map(m=>{const contracts=customers.flatMap(getContracts).filter(c=>monthKey(c.date)===m);return {m,count:contracts.length,amount:contracts.reduce((s,c)=>s+num(c.amount),0)}}); const max=Math.max(1,...data.map(x=>x.amount));
  $("monthlyChart").innerHTML=data.map(x=>`<div class="bar-col"><div class="bar-value">${formatWon(x.amount)}</div><div class="bar-track"><div class="bar-fill" style="height:${Math.max(4,x.amount/max*100)}%"></div></div><b>${Number(x.m.slice(5))}월</b><small>${x.count}건</small></div>`).join('');
  const breakdown=(id,groups)=>{const total=Math.max(1,groups.reduce((s,x)=>s+x.count,0));$(id).innerHTML=groups.sort((a,b)=>b.count-a.count).map(x=>`<div class="breakdown-row"><div><b>${esc(x.label)}</b><span>${x.count}명</span></div><div class="progress"><i style="width:${x.count/total*100}%"></i></div><em>${Math.round(x.count/total*100)}%</em></div>`).join('')||'<div class="dashboard-empty">데이터가 없습니다.</div>'};
  const countBy=(fn)=>{const map={};customers.forEach(c=>{const key=fn(c)||'미입력';map[key]=(map[key]||0)+1});return Object.entries(map).map(([label,count])=>({label,count}))};
  breakdown('statusStats',countBy(c=>c.status));
  breakdown('sourceStats',countBy(c=>c.source));
  breakdown('ageStats',countBy(c=>c.age_group));
}

function formatPhoneNumber(value){
  const digits=String(value||"").replace(/\D/g,"").slice(0,11);
  if(digits.startsWith("02")){
    if(digits.length<=2) return digits;
    if(digits.length<=5) return `${digits.slice(0,2)}-${digits.slice(2)}`;
    if(digits.length<=9) return `${digits.slice(0,2)}-${digits.slice(2,5)}-${digits.slice(5)}`;
    return `${digits.slice(0,2)}-${digits.slice(2,6)}-${digits.slice(6)}`;
  }
  if(digits.length<=3) return digits;
  if(digits.length<=7) return `${digits.slice(0,3)}-${digits.slice(3)}`;
  if(digits.length<=10) return `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`;
  return `${digits.slice(0,3)}-${digits.slice(3,7)}-${digits.slice(7)}`;
}

function showListView(){ $("formView").classList.add("hidden"); $("formView").setAttribute("aria-hidden","true"); document.body.style.overflow=""; }
function showFormView(){ $("formView").classList.remove("hidden"); $("formView").setAttribute("aria-hidden","false"); document.body.style.overflow="hidden"; setTimeout(()=>$("name")?.focus(),50); }


let crmView="dashboard";
let crmViewHistory=[];
function applyCrmView(view,options={}){
  const previous=crmView;
  if(!options.skipHistory&&previous&&previous!==view){
    crmViewHistory.push(previous);
    if(crmViewHistory.length>30)crmViewHistory.shift();
  }
  crmView=view;
  document.body.classList.remove("page-mode-dashboard","page-mode-customers","page-mode-tasks","page-mode-calls","page-mode-calendar","page-mode-statistics","page-mode-contracts","page-mode-recruiting");
  document.body.classList.add(`page-mode-${view}`);
  $("globalNavigation")?.classList.toggle("is-dashboard",view==="dashboard");
  if($("calendarView")) $("calendarView").classList.toggle("hidden",view!=="calendar");
  if($("statisticsView")) $("statisticsView").classList.toggle("hidden",view!=="statistics");
  if($("listView")) $("listView").classList.toggle("hidden",view==="calendar"||view==="statistics");
  if(view==="calendar") renderCalendar();
  if(view==="statistics") renderStatistics();
  if(view==="calls"){todayOnly=true; activeStatsFilter="today";} else if(view!=="tasks"&&view!=="dashboard") todayOnly=false;
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.crmView===view));
  const titles={
    dashboard:["업무 대시보드","오늘 처리할 고객과 계약 현황을 한눈에 확인합니다."],
    customers:["고객 관리","전체 고객을 검색하고 상담 상태를 관리합니다."],
    tasks:["오늘 할 일","계약 경과일·30일 미접촉 고객·연락 예정일을 자동 계산합니다."],
    calls:["오늘 해야 할 전화","생일·후속 연락·계약 관리·자동차보험 만기 고객을 한 번에 확인합니다."],
    calendar:["업무 캘린더","상담일·생일·계약·자동차보험 만기를 월별로 확인합니다."],
    statistics:["업무 통계","고객·계약·유입경로 성과를 한눈에 분석합니다."],
    contracts:["계약 관리","계약 완료 고객의 여러 계약과 경과일을 관리합니다."],
    recruiting:["리크루팅 관리","설계사 지원자와 리크루팅 유입 고객을 관리합니다."]
  };
  $("pageTitle").textContent=titles[view][0]; $("pageSubtitle").textContent=titles[view][1];
  $("newBtn").textContent=view==="recruiting"?"+ 지원자 등록":"+ 신규 고객 등록";
  $("contractTabs").classList.toggle("hidden",view!=="contracts");
  todayOnly=false; activeStatsFilter="all";
  if(view==="contracts") { $("statusFilter").value=""; }
  if(view==="recruiting") { $("statusFilter").value=""; }
  currentPage=1; render();
}
function getViewScopedCustomers(list){
  if(crmView==="contracts") return list.filter(c=>{
    const contracts=getContracts(c);
    if(activeContractFilter==="auto")return isAutoRenewalDue(c);
    if(!contracts.length)return false;
    if(activeContractFilter==="30")return contracts.some(x=>contractReached(x,30));
    if(activeContractFilter==="90")return contracts.some(x=>contractReached(x,90));
    if(activeContractFilter==="365")return contracts.some(x=>contractReached(x,365));
    if(activeContractFilter==="maintenance")return contracts.some(x=>["유지관리","확인필요","실효위험"].includes(x.status));
    return true;
  });
  if(crmView==="calls") return list.filter(c=>customerTasks(c).length>0);
  if(crmView==="recruiting") return list.filter(c=>/리크루팅|육아|경단|사업설명회|설계사/i.test(`${c.source||""} ${c.interest||""} ${c.memo||""}`));
  return list;
}
function goCrmBack(){
  if($("consultModal")?.classList.contains("open")){closeConsultation();return;}
  if(!$("formView")?.classList.contains("hidden")){clearForm();showListView();return;}
  const previous=crmViewHistory.pop();
  applyCrmView(previous||"dashboard",{skipHistory:true});
}
function goCrmHome(){
  if($("consultModal")?.classList.contains("open")&&!closeConsultation())return;
  if(!$("formView")?.classList.contains("hidden")){clearForm();showListView();}
  crmViewHistory=[];
  applyCrmView("dashboard",{skipHistory:true});
}
document.querySelectorAll(".nav-item").forEach(button=>button.addEventListener("click",()=>{ showListView(); applyCrmView(button.dataset.crmView); }));
$("globalBackBtn")?.addEventListener("click",goCrmBack);
$("globalHomeBtn")?.addEventListener("click",goCrmHome);


function getCalendarEvents(){
  const events=[];
  customers.forEach(c=>{
    const profile=getProfileInfo(c);
    if(c.follow_up_date) events.push({date:c.follow_up_date,label:`전화 · ${c.name}`,type:'call',customer:c});
    if(profile.birthday){const y=calendarDate.getFullYear(); events.push({date:`${y}-${profile.birthday.slice(5)}`,label:`생일 · ${c.name}`,type:'birthday',customer:c});}
    getContracts(c).forEach((ct,i)=>{if(ct.date) events.push({date:dateOnly(ct.date),label:`계약 · ${c.name} (${i+1})`,type:'contract',customer:c});});
    const ins=getInsuranceInfo(c); if(ins.auto_expiry_date) events.push({date:ins.auto_expiry_date,label:`자동차 만기 · ${c.name}`,type:'auto',customer:c});
  }); return events;
}
function renderCalendar(){
  if(!$("calendarGrid"))return; const y=calendarDate.getFullYear(),m=calendarDate.getMonth(); $("calTitle").textContent=`${y}년 ${m+1}월`;
  const first=new Date(y,m,1), last=new Date(y,m+1,0), start=first.getDay(); const events=getCalendarEvents();
  const heads=['일','월','화','수','목','금','토'].map(x=>`<div class="cal-head">${x}</div>`).join(''); let cells='';
  for(let i=0;i<start;i++)cells+='<div class="cal-cell muted"></div>';
  for(let d=1;d<=last.getDate();d++){const date=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; const dayEvents=events.filter(e=>e.date===date); cells+=`<div class="cal-cell ${date===today()?'today':''}"><b>${d}</b>${dayEvents.map(e=>`<button class="cal-event ${e.type}" data-cal-id="${esc(e.customer.id)}">${esc(e.label)}</button>`).join('')}</div>`;}
  $("calendarGrid").innerHTML=heads+cells;
}

async function checkSession(){
  const {data} = await db.auth.getSession();
  if(data.session) showApp(); else showLogin();
}
function showLogin(){ $("loginScreen").classList.remove("hidden"); $("app").classList.add("hidden"); }
async function showApp(){ $("loginScreen").classList.add("hidden"); $("app").classList.remove("hidden"); crmViewHistory=[]; applyCrmView("dashboard",{skipHistory:true}); await loadCustomers(); }

$("loginForm").addEventListener("submit", async e=>{
  e.preventDefault();
  const email=$("loginEmail").value.trim(), password=$("loginPassword").value;
  const {error} = await db.auth.signInWithPassword({email,password});
  const msg=$("loginMsg");
  if(error){msg.textContent="로그인에 실패했습니다. 이메일과 비밀번호를 확인하세요.";msg.classList.remove("hidden");msg.style.background="#fff0f0";msg.style.color="#b52d2d";}
  else{msg.classList.add("hidden");showApp();}
});
$("logoutBtn").addEventListener("click", async()=>{await db.auth.signOut();showLogin();});

async function loadCustomers(){
  const {data,error} = await db.from("customers").select("*").order("created_at",{ascending:false});
  if(error){alert("고객 목록을 불러오지 못했습니다: "+error.message);return}
  customers=data||[]; populateSourceFilter(); populateReferrers(); render();
}
function populateSourceFilter(){
  const select=$("sourceFilter");
  const current=select.value;
  const preferred=["AI보험점검 랜딩페이지","리크루팅랜딩페이지1","육아경단녀 랜딩페이지","랜딩페이지","CRM","카카오톡","전화","소개","기타"];
  const values=[...new Set(customers.map(c=>c.source).filter(Boolean))];
  values.sort((a,b)=>{const ai=preferred.indexOf(a),bi=preferred.indexOf(b);if(ai!==-1||bi!==-1)return (ai===-1?999:ai)-(bi===-1?999:bi);return a.localeCompare(b);});
  select.innerHTML='<option value="">전체 유입경로</option>'+values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
  if(values.includes(current)) select.value=current;
}
function getFilteredCustomers(){
  const q=$("search").value.trim().toLowerCase();
  const sf=$("statusFilter").value;
  const sourcef=$("sourceFilter").value;
  const sort=$("sortBy").value;

  let list=getViewScopedCustomers(customers).filter(c=>{
    const profile=getProfileInfo(c);
    const familyText=[profile.family_info,...getFamilyMembers(c).map(m=>{const linked=familyMemberCustomer(m);return `${linked?.name||m.name||""} ${linked?.phone||m.phone||""}`;})].join(" ");
    const contractText=getContracts(c).map(x=>`${x.company||""} ${x.product||""}`).join(" ");
    const haystack=`${c.name||""} ${c.phone||""} ${cleanPhone(c.phone||"")} ${contractText} ${familyText}`.toLowerCase();
    const normalizedQ=cleanPhone(q);
    return (!q||haystack.includes(q)||(normalizedQ&&haystack.includes(normalizedQ))) &&
    (!sf||c.status===sf) &&
    (!sourcef||(c.source||"")===sourcef) &&
    (!todayOnly||c.follow_up_date===today()) &&
    (
      activeStatsFilter==="all" ||
      (activeStatsFilter==="new" && (c.status||"신규")==="신규") ||
      (activeStatsFilter==="today" && getConsultHistory(c).some(x=>dateOnly(x.created_at)===today())) ||
      (activeStatsFilter==="analysis" && ["분석대기","분석진행"].includes(c.status)) ||
      (activeStatsFilter==="done" && c.status==="계약완료")
    );
  });

  if(sort==="createdDesc") list.sort((a,b)=>(b.created_at||"").localeCompare(a.created_at||""));
  if(sort==="recentConsult") list.sort((a,b)=>(getLastTouchDate(b)||"").localeCompare(getLastTouchDate(a)||""));
  if(sort==="followAsc") list.sort((a,b)=>(a.follow_up_date||"9999").localeCompare(b.follow_up_date||"9999"));
  if(sort==="nameAsc") list.sort((a,b)=>(a.name||"").localeCompare(b.name||"","ko"));
  if(sort==="autoExpiry") list.sort((a,b)=>(getInsuranceInfo(a).auto_expiry_date||"9999").localeCompare(getInsuranceInfo(b).auto_expiry_date||"9999"));
  if(sort==="birthday") list.sort((a,b)=>((getProfileInfo(a).birthday||"9999").slice(5)).localeCompare((getProfileInfo(b).birthday||"9999").slice(5)));
  list.sort((a,b)=>Number(isFavorite(b.id))-Number(isFavorite(a.id)));
  return list;
}

function render(){
  const list=getFilteredCustomers();
  const totalPages=Math.max(1,Math.ceil(list.length/pageSize));
  if(currentPage>totalPages) currentPage=totalPages;
  if(currentPage<1) currentPage=1;

  const start=(currentPage-1)*pageSize;
  const pageList=list.slice(start,start+pageSize);

  $("customerBody").innerHTML=pageList.map(c=>{
    const checked=selectedIds.has(String(c.id));
    return `<tr class="customer-row ${checked?"selected-row":""}" data-customer-id="${esc(c.id)}">
      <td class="select-col"><input type="checkbox" class="row-check" data-id="${esc(c.id)}" ${checked?"checked":""}></td>
      <td>${esc((c.created_at||"").slice(0,10))}</td><td><button type="button" class="favorite-btn ${isFavorite(c.id)?'active':''}" data-action="favorite" data-id="${esc(c.id)}" title="중요 고객 즐겨찾기">${isFavorite(c.id)?'★':'☆'}</button><span class="grade grade-${esc(getProfileInfo(c).grade||"B")}">${esc(getProfileInfo(c).grade||"B")}</span></td><td><b>${esc(c.name)}</b><small class="last-contact">${esc(lastContactLabel(c))}</small></td>
      <td><a href="tel:${esc(c.phone)}">${esc(c.phone)}</a></td><td>${esc(c.source||"-")}</td><td>${esc(c.age_group||"-")}</td>
      <td><span class="status ${esc(c.status||"신규")}">${esc(c.status||"신규")}</span></td>
      <td>${esc(c.available_time||"-")}</td><td>${esc(c.follow_up_date||"-")}</td>
      <td>${getContracts(c).length}건</td>
      <td>${esc(latestContractDate(c)||"-")}</td>
      <td class="money">${formatWon(contractTotal(c))}</td>
      <td title="${esc(c.memo||c.message||"")}">${esc((c.memo||c.message||"").slice(0,24))}</td>
      <td><div class="actions-cell">
        <button type="button" class="icon-btn customer-open-btn" data-action="open" data-id="${esc(c.id)}">상담·계약</button>
        <button type="button" class="icon-btn" data-action="edit" data-id="${esc(c.id)}">기본정보</button>
        <button type="button" class="icon-btn del" data-action="delete" data-id="${esc(c.id)}">삭제</button>
      </div></td>
    </tr>`;
  }).join("");

  $("emptyState").style.display=list.length?"none":"block";
  $("sTotal").textContent=customers.length;
  $("sNew").textContent=customers.filter(c=>c.status==="신규").length;
  $("sToday").textContent=customers.filter(c=>getConsultHistory(c).some(x=>dateOnly(x.created_at)===today())).length;
  if($("sAuto")) $("sAuto").textContent=customers.filter(c=>{const d=daysUntil(getInsuranceInfo(c).auto_expiry_date);return d!==null&&d>=0&&d<=30;}).length;
  if($("sBirthday")) $("sBirthday").textContent=customers.filter(c=>{const b=getProfileInfo(c).birthday;if(!b)return false;const y=today().slice(0,4);let date=`${y}-${b.slice(5)}`;if(date<today())date=`${Number(y)+1}-${b.slice(5)}`;const d=daysUntil(date);return d!==null&&d>=0&&d<=7;}).length;

  const month=today().slice(0,7);
  const thisMonthTotal=customers.flatMap(getContracts).filter(c=>(dateOnly(c.date)||"").slice(0,7)===month).reduce((sum,c)=>sum+num(c.amount),0);
  $("sPremium").textContent=formatWon(thisMonthTotal);

  renderPagination(totalPages);
  updateSelectAll(pageList);
  renderTasks();
  renderDashboard();
  if(crmView==="statistics") renderStatistics();
}

function renderPagination(totalPages){
  const parts=[];
  parts.push(`<button type="button" class="page-btn" data-page="${currentPage-1}" ${currentPage===1?"disabled":""}>이전</button>`);
  for(let p=1;p<=totalPages;p++){
    parts.push(`<button type="button" class="page-btn ${p===currentPage?"active":""}" data-page="${p}">${p}</button>`);
  }
  parts.push(`<button type="button" class="page-btn" data-page="${currentPage+1}" ${currentPage===totalPages?"disabled":""}>다음</button>`);
  parts.push(`<span class="selected-count">선택 ${selectedIds.size}명</span>`);
  $("pagination").innerHTML=parts.join("");
}

function updateSelectAll(pageList){
  const selectAll=$("selectAll");
  const ids=pageList.map(c=>String(c.id));
  const selected=ids.filter(id=>selectedIds.has(id)).length;
  selectAll.checked=ids.length>0&&selected===ids.length;
  selectAll.indeterminate=selected>0&&selected<ids.length;
}

function populateReferrers(selected=""){const s=$("referrerId"); if(!s)return; s.innerHTML='<option value="">없음</option>'+customers.map(c=>`<option value="${esc(c.id)}">${esc(c.name||"이름없음")} · ${esc(c.phone||"")}</option>`).join(""); s.value=selected||"";}
function clearForm(){ $("customerForm").reset(); $("customerId").value=""; $("formTitle").textContent="신규 고객 등록"; $("status").value="신규"; $("source").value="DB"; $("customerGrade").value="B"; $("birthday").value=""; $("age").value=""; $("landingSourceField").classList.add("hidden"); $("autoInsuranceBox")?.classList.add("hidden"); populateReferrers(); }
function syncBirthday(){
  const y=$("birthYear").value.replace(/\D/g,"").slice(0,4),m=$("birthMonth").value.replace(/\D/g,"").slice(0,2),d=$("birthDay").value.replace(/\D/g,"").slice(0,2);
  $("birthYear").value=y; $("birthMonth").value=m; $("birthDay").value=d;
  if(y.length===4&&m.length===2&&d.length===2){ const date=`${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`; const parsed=parseLocalDate(date); if(parsed&&parsed.getFullYear()===Number(y)&&parsed.getMonth()+1===Number(m)&&parsed.getDate()===Number(d)){ $("birthday").value=date; const now=new Date(); let age=now.getFullYear()-Number(y); const before=(now.getMonth()+1<Number(m))||(now.getMonth()+1===Number(m)&&now.getDate()<Number(d)); if(before)age--; $("age").value=age<20?"10대 이하":age>=60?"60대 이상":`${Math.floor(age/10)*10}대`; return; }}
  $("birthday").value=""; $("age").value="";
}
function setBirthdayParts(value=""){ const [y="",m="",d=""]=String(value||"").split("-"); $("birthYear").value=y; $("birthMonth").value=m; $("birthDay").value=d; syncBirthday(); }
function toggleLandingSource(){ $("landingSourceField").classList.toggle("hidden",$("source").value!=="랜딩페이지"); if($("source").value!=="랜딩페이지") $("landingSource").value=""; }
function getSensitiveInfo(customer){const raw=customer?.payment_identity_info;if(raw&&typeof raw==="object")return raw;if(typeof raw==="string"){try{return JSON.parse(raw)||{}}catch(e){}}return {}}
function getProfileInfo(customer){const raw=customer?.profile_info;if(raw&&typeof raw==="object")return raw;if(typeof raw==="string"){try{return JSON.parse(raw)||{}}catch(e){}}return {}}
function getFamilyMembers(customer){const members=getProfileInfo(customer).family_members;return Array.isArray(members)?members:[]}
function familyMemberCustomer(member){return member?.customer_id?customers.find(c=>String(c.id)===String(member.customer_id)):null}
function populateFamilyCustomerOptions(){
  const select=$("familyLinkedCustomer"); if(!select)return;
  const options=customers.filter(c=>String(c.id)!==String(activeConsultCustomerId)).sort((a,b)=>(a.name||"").localeCompare(b.name||"","ko"));
  select.innerHTML='<option value="">직접 입력</option>'+options.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} · ${esc(c.phone||"연락처 없음")}</option>`).join("");
}
function renderFamilyTree(){
  const customer=customers.find(c=>String(c.id)===String(activeConsultCustomerId)); if(!customer||!$("familyTree"))return;
  const members=getFamilyMembers(customer); $("detailFamilyCount").textContent=members.length; populateFamilyCustomerOptions();
  const rootContracts=getContracts(customer);
  const contractHtml=(contracts)=>contracts.length?contracts.map(x=>`<li><b>${esc(x.company||"보험사 미입력")}</b> ${esc(x.product||"상품명 미입력")} <span>${esc(x.status||"유지")}</span></li>`).join(""):'<li class="family-no-contract">등록 계약 없음</li>';
  const root=`<div class="family-root"><div class="family-person main"><span>본인</span><div><b>${esc(customer.name)}</b><small>${esc(customer.phone||"")}</small></div><em>${rootContracts.length}건</em></div><ul class="family-contracts">${contractHtml(rootContracts)}</ul></div>`;
  const children=members.map((member,index)=>{const linked=familyMemberCustomer(member);const name=linked?.name||member.name||"이름 미입력";const phone=linked?.phone||member.phone||"";const contracts=linked?getContracts(linked):[];return `<div class="family-branch"><div class="family-line"></div><div class="family-person"><span>${esc(member.relation||"가족")}</span><div><b>${esc(name)}</b><small>${esc(phone)}</small></div><em>${contracts.length}건</em><button type="button" data-family-action="open" data-family-index="${index}" ${linked?'':'disabled'}>고객 열기</button><button type="button" data-family-action="delete" data-family-index="${index}">삭제</button></div><ul class="family-contracts">${contractHtml(contracts)}</ul></div>`}).join("");
  $("familyTree").innerHTML=root+(children||'<div class="family-empty">등록된 가족이 없습니다. 위에서 가족을 추가하세요.</div>');
}
async function saveFamilyMembers(nextMembers){
  const customer=customers.find(c=>String(c.id)===String(activeConsultCustomerId)); if(!customer)return false;
  const profile={...getProfileInfo(customer),family_members:nextMembers};
  const {error}=await db.from("customers").update({profile_info:profile}).eq("id",customer.id);
  if(error){alert("가족 정보 저장 실패: "+error.message);return false;} customer.profile_info=profile; renderFamilyTree(); return true;
}
async function addFamilyMember(){
  const customer=customers.find(c=>String(c.id)===String(activeConsultCustomerId)); if(!customer)return;
  const linkedId=$("familyLinkedCustomer").value; const linked=customers.find(c=>String(c.id)===String(linkedId)); const name=linked?.name||$("familyMemberName").value.trim();
  if(!name){alert("가족 구성원의 이름을 입력하거나 고객을 선택해주세요.");return;}
  const members=[...getFamilyMembers(customer)]; if(linkedId&&members.some(x=>String(x.customer_id)===String(linkedId))){alert("이미 연결된 가족 고객입니다.");return;}
  members.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),relation:$("familyRelation").value,customer_id:linkedId||null,name,phone:linked?.phone||$("familyMemberPhone").value.trim()});
  const familyBtn=$("familyMemberAdd"); setSaving(familyBtn,true,"＋ 가족 추가");
  if(await saveFamilyMembers(members)){
    $("familyLinkedCustomer").value="";$("familyMemberName").value="";$("familyMemberPhone").value="";
    showSaveToast("가족 정보가 저장되었습니다.");
  }
  setSaving(familyBtn,false,"＋ 가족 추가");
}
async function handleFamilyAction(event){
  const button=event.target.closest("button[data-family-action]");if(!button)return;const customer=customers.find(c=>String(c.id)===String(activeConsultCustomerId));if(!customer)return;const index=Number(button.dataset.familyIndex);const member=getFamilyMembers(customer)[index];
  if(button.dataset.familyAction==="delete"){if(confirm("이 가족 연결을 삭제할까요?")){const next=[...getFamilyMembers(customer)];next.splice(index,1);if(await saveFamilyMembers(next))showSaveToast("가족 정보가 저장되었습니다.");}}
  if(button.dataset.familyAction==="open"&&member?.customer_id){openConsultation(member.customer_id);setCustomerDetailTab("overview");}
}
function getInsuranceInfo(customer){
  let info={types:[]};
  const raw=customer?.insurance_info;
  if(raw&&typeof raw==="object") info={...info,...raw};
  else if(typeof raw==="string"){try{info={...info,...(JSON.parse(raw)||{})};}catch(e){}}
  // 계약관리에서 입력한 자동차보험 정보를 대시보드/오늘 할 일과 자동 연동
  const autoContract=[...getContracts(customer)].reverse().find(c=>c&&(
    c.is_auto_insurance||c.auto_expiry_date||c.vehicle_number||String(c.product||"").includes("자동차")
  ));
  if(autoContract){
    info={
      ...info,
      types:Array.from(new Set([...(Array.isArray(info.types)?info.types:[]),"자동차보험"])),
      vehicle_number:autoContract.vehicle_number||info.vehicle_number||"",
      auto_expiry_date:dateOnly(autoContract.auto_expiry_date||autoContract.expiry_date||info.auto_expiry_date),
      auto_renewal_status:autoContract.auto_renewal_status||info.auto_renewal_status||"갱신 예정"
    };
  }
  return info;
}
function daysUntil(value){const a=parseLocalDate(today()),b=parseLocalDate(value);return a&&b?Math.ceil((b-a)/86400000):null}
function isAutoRenewalDue(customer){const info=getInsuranceInfo(customer);const d=daysUntil(info.auto_expiry_date);return info.auto_expiry_date&&info.auto_renewal_status!=="갱신 완료"&&d!==null&&d>=0&&d<=30}
function toggleAutoInsuranceBox(){const checked=$("autoInsuranceCheck").checked;$("autoInsuranceBox").classList.toggle("hidden",!checked)}
function editCustomer(id){
  const c=customers.find(x=>String(x.id)===String(id));
  if(!c){alert("고객 정보를 찾지 못했습니다.");return;}
  $("customerId").value=c.id;
  $("name").value=c.name||"";
  $("phone").value=formatPhoneNumber(c.phone||"");
  $("age").value=c.age_group||"";
  $("status").value=c.status||"신규";
  $("source").value=c.source||"DB";
  $("availableTime").value=c.available_time||"";
    const profile=getProfileInfo(c);
   setBirthdayParts(profile.birthday||""); $("customerGrade").value=profile.grade||"B"; populateReferrers(profile.referrer_id||""); $("familyInfo").value=profile.family_info||""; $("landingSource").value=profile.landing_source||""; toggleLandingSource();
  const insurance=getInsuranceInfo(c);
  const hasAuto=Boolean(insurance.auto_expiry_date||insurance.vehicle_number||insurance.auto_renewal_status);
  $("autoInsuranceCheck").checked=hasAuto;
  $("vehicleNumber").value=insurance.vehicle_number||"";
  $("autoExpiryDate").value=insurance.auto_expiry_date||"";
  $("autoRenewalStatus").value=insurance.auto_renewal_status||"갱신 예정";
  toggleAutoInsuranceBox();
  $("memo").value=c.memo||c.message||"";
  $("formTitle").textContent="고객 정보 수정";
  showFormView();
}

function formatDateTime(value){
  if(!value)return "";
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return String(value);
  return d.toLocaleString("ko-KR",{
    year:"numeric",month:"2-digit",day:"2-digit",
    hour:"2-digit",minute:"2-digit"
  });
}

function getConsultHistory(customer){
  const raw=customer?.consultation_history;
  if(Array.isArray(raw))return raw;
  if(typeof raw==="string"){
    try{
      const parsed=JSON.parse(raw);
      return Array.isArray(parsed)?parsed:[];
    }catch(e){return [];}
  }
  return [];
}

function renderConsultHistory(customer){
  const history=getConsultHistory(customer);
  const reversed=history.map((item,index)=>({item,index})).reverse();

  $("consultHistory").innerHTML=reversed.length
    ? reversed.map(({item,index},position)=>`
      <div class="history-item${position<3?" recent-history-item":""}" data-history-index="${index}">
        <div class="history-item-head">
          <div class="time">${esc(formatDateTime(item.created_at))}${position<3?' <span class="recent-history-badge">최근</span>':''}</div>
          <div class="history-actions">
            <button type="button" class="history-btn edit" data-history-action="edit" data-history-index="${index}">수정</button>
            <button type="button" class="history-btn delete" data-history-action="delete" data-history-index="${index}">삭제</button>
          </div>
        </div>
        <div class="content">${esc(item.content||"")}</div>
      </div>
    `).join("")
    : '<div class="history-empty">아직 저장된 상담 기록이 없습니다.</div>';
}

function openConsultation(id){
  const customer=customers.find(c=>String(c.id)===String(id));
  if(!customer){alert("고객 정보를 찾지 못했습니다.");return;}

  activeConsultCustomerId=String(customer.id);
  $("consultName").textContent=customer.name||"-";
  $("consultPhone").textContent=customer.phone||"-";
  $("consultStatus").textContent=customer.status||"신규";
  $("consultFollowUp").textContent=customer.follow_up_date||"-";
  $("consultAvailableTime").textContent=customer.available_time||"-";
  const insurance=getInsuranceInfo(customer);
  const expiry=insurance.auto_expiry_date||"";
  const remain=daysUntil(expiry);
  const profile=getProfileInfo(customer); const referrer=customers.find(x=>String(x.id)===String(profile.referrer_id));
  $("consultGrade").textContent=profile.grade||"B"; $("consultBirthday").textContent=profile.birthday||"-"; $("consultReferrer").textContent=referrer?.name||"-"; $("consultFamily").textContent=profile.family_info||"-";
  const expiryLevel=autoExpiryLevel(customer);
  $("consultAutoExpiry").innerHTML=expiry?(esc(expiry)+` <span class="expiry-pill expiry-${expiryLevel}">${remain===null?"":remain<0?"만기 지남":remain===0?"오늘 만기":`D-${remain}`}</span>`):"-";
  $("consultFollowUpInput").value=customer.follow_up_date||"";
  const sensitive=getSensitiveInfo(customer);
  $("consultPaymentBank").value=sensitive.payment_bank||""; $("consultPaymentAccount").value=sensitive.payment_account||""; $("consultPaymentDay").value=sensitive.payment_day||""; $("consultCardNumber").value=sensitive.card_number||""; $("consultCardExpiry").value=sensitive.card_expiry||""; $("consultIdentityVerified").checked=Boolean(sensitive.identity_verified); $("consultDriverLicense").value=sensitive.driver_license||""; $("consultResidentIssueDate").value=sensitive.resident_issue_date||"";
  initialPaymentInfo=currentPaymentInfo(); initialIdentityInfo=currentIdentityInfo();
  setSectionStatus("paymentSaveStatus","saved","저장됨"); setSectionStatus("identitySaveStatus","saved","저장됨");
  $("consultMemo").value="";
  $("consultResultStatus").value="";
  $("consultComposer").classList.remove("hidden");
  $("consultComposerOpen").classList.add("hidden");
  consultInitialMemo="";
  editingHistoryIndex=null;
  $("consultSave").textContent="상담 기록 저장";
  renderConsultHistory(customer);
  $("consultHistory").scrollTop=0;
  renderContracts(customer);
  renderFamilyTree();
  $("detailContractCount").textContent=getContracts(customer).length;
  setCustomerDetailTab("overview");

  $("consultModal").classList.add("open");
  $("consultModal").setAttribute("aria-hidden","false");
  document.body.style.overflow="hidden";
  setTimeout(()=>$("consultMemo").focus(),100);
}

function closeConsultation(force=false){
  const current=$("consultMemo").value.trim();
  if(!force&&current!==consultInitialMemo&&current){
    if(!confirm("작성 중인 상담 내용이 있습니다. 저장하지 않고 닫을까요?")) return false;
  }
  $("consultModal").classList.remove("open");
  $("consultModal").setAttribute("aria-hidden","true");
  document.body.style.overflow="";
  activeConsultCustomerId=null;
  editingHistoryIndex=null;
  $("consultMemo").value="";
  $("consultResultStatus").value="";
  $("consultSave").textContent="상담 기록 저장";
  consultInitialMemo="";
  return true;
}

async function saveConsultation(){
  if(!activeConsultCustomerId)return;

  const content=$("consultMemo").value.trim();
  if(!content){alert("상담 내용을 입력해주세요.");return;}
  const nextStatus=$("consultResultStatus").value;

  const customer=customers.find(c=>String(c.id)===String(activeConsultCustomerId));
  if(!customer){alert("고객 정보를 찾지 못했습니다.");return;}

  const history=getConsultHistory(customer);
  let nextHistory;

  if(editingHistoryIndex!==null){
    nextHistory=history.map((item,index)=>
      index===editingHistoryIndex
        ? {...item,content,updated_at:new Date().toISOString()}
        : item
    );
  }else{
    nextHistory=[
      ...history,
      {
        created_at:new Date().toISOString(),
        content
      }
    ];
  }

  const saveBtn=$("consultSave");
  const originalText=saveBtn.textContent;
  saveBtn.disabled=true;
  saveBtn.textContent="저장 중...";

  const {error}=await db
    .from("customers")
    .update(nextStatus?{consultation_history:nextHistory,status:nextStatus}:{consultation_history:nextHistory})
    .eq("id",activeConsultCustomerId);

  saveBtn.disabled=false;

  if(error){
    saveBtn.textContent=originalText;
    alert("상담 기록 저장 실패: "+error.message);
    return;
  }

  const oldTouch=getLastTouchDate(customer);
  if(oldTouch){ const completed=readCompletedTasks(); completed[`${customer.id}:no_touch_14d:${oldTouch}`]=new Date().toISOString(); writeCompletedTasks(completed); }
  customer.consultation_history=nextHistory;
  if(nextStatus){
    customer.status=nextStatus;
    $("consultStatus").textContent=nextStatus;
  }
  $("consultMemo").value="";
  $("consultResultStatus").value="";
  consultInitialMemo="";
  editingHistoryIndex=null;
  saveBtn.textContent="상담 기록 저장";
  renderConsultHistory(customer);
  render();
  showSaveToast(originalText==="수정 내용 저장"?"상담 기록이 수정되었습니다.":"상담 기록이 저장되었습니다.");
}

async function deleteConsultationHistory(index){
  if(!activeConsultCustomerId)return;

  const customer=customers.find(c=>String(c.id)===String(activeConsultCustomerId));
  if(!customer){alert("고객 정보를 찾지 못했습니다.");return;}

  const history=getConsultHistory(customer);
  const target=history[index];
  if(!target)return;

  if(!confirm("이 상담 기록을 삭제할까요?"))return;

  const nextHistory=history.filter((_,i)=>i!==index);
  const {error}=await db
    .from("customers")
    .update({consultation_history:nextHistory})
    .eq("id",activeConsultCustomerId);

  if(error){
    alert("상담 기록 삭제 실패: "+error.message);
    return;
  }

  customer.consultation_history=nextHistory;
  if(editingHistoryIndex===index){
    editingHistoryIndex=null;
    $("consultMemo").value="";
    $("consultSave").textContent="상담 기록 저장";
  }
  renderConsultHistory(customer);
  alert("상담 기록이 삭제되었습니다.");
}

function editConsultationHistory(index){
  if(!activeConsultCustomerId)return;

  const customer=customers.find(c=>String(c.id)===String(activeConsultCustomerId));
  if(!customer)return;

  const history=getConsultHistory(customer);
  const target=history[index];
  if(!target)return;

  editingHistoryIndex=index;
  $("consultMemo").value=target.content||"";
  consultInitialMemo=target.content||"";
  $("consultSave").textContent="수정 내용 저장";
  $("consultMemo").focus();
  $("consultMemo").scrollIntoView({behavior:"smooth",block:"center"});
}

async function saveConsultFollowUp(){
  if(!activeConsultCustomerId)return;

  const customer=customers.find(c=>String(c.id)===String(activeConsultCustomerId));
  if(!customer){alert("고객 정보를 찾지 못했습니다.");return;}

  const nextDate=$("consultFollowUpInput").value||null;
  if((customer.follow_up_date||null)===nextDate){showSaveToast("변경된 내용이 없습니다.","info");return;}
  const button=$("consultFollowUpSave");
  const originalText=button.textContent;
  button.disabled=true;
  button.textContent="저장 중...";

  const {error}=await db
    .from("customers")
    .update({follow_up_date:nextDate})
    .eq("id",activeConsultCustomerId);

  button.disabled=false;
  button.textContent=originalText;

  if(error){
    alert("다음 연락일 저장 실패: "+error.message);
    return;
  }

  customer.follow_up_date=nextDate;
  $("consultFollowUp").textContent=nextDate||"-";
  render();
  showSaveToast("다음 연락일이 저장되었습니다.");
}


async function savePaymentInfo(){
  const customer=customers.find(c=>String(c.id)===String(activeConsultCustomerId)); if(!customer)return;
  const payment=currentPaymentInfo();
  if(sameData(payment,initialPaymentInfo)){showSaveToast("변경된 내용이 없습니다.","info");return;}
  const existing=getSensitiveInfo(customer);
  const payload={...existing,...payment};
  const btn=$("paymentSave"); setSaving(btn,true,"결제계좌 저장");
  const {error}=await db.from("customers").update({payment_identity_info:payload}).eq("id",customer.id);
  setSaving(btn,false,"결제계좌 저장");
  if(error){alert("결제계좌 저장 실패: "+error.message);return;}
  customer.payment_identity_info=payload; initialPaymentInfo={...payment};
  setSectionStatus("paymentSaveStatus","saved",savedTimeText());
  showSaveToast("결제계좌가 저장되었습니다.");
}

async function saveIdentityInfo(){
  const customer=customers.find(c=>String(c.id)===String(activeConsultCustomerId)); if(!customer)return;
  const identity=currentIdentityInfo();
  if(sameData(identity,initialIdentityInfo)){showSaveToast("변경된 내용이 없습니다.","info");return;}
  const existing=getSensitiveInfo(customer);
  const payload={...existing,...identity};
  const btn=$("identitySave"); setSaving(btn,true,"신분증 저장");
  const {error}=await db.from("customers").update({payment_identity_info:payload}).eq("id",customer.id);
  setSaving(btn,false,"신분증 저장");
  if(error){alert("신분증 정보 저장 실패: "+error.message);return;}
  customer.payment_identity_info=payload; initialIdentityInfo={...identity};
  setSectionStatus("identitySaveStatus","saved",savedTimeText());
  showSaveToast("신분증 정보가 저장되었습니다.");
}

function renderContracts(customer){
  const contracts=getContracts(customer);
  const warning=contractsColumnAvailable?"":'<div class="schema-warning">여러 계약 저장을 사용하려면 ZIP 안의 <b>Supabase_계약기능_SQL.txt</b> 내용을 한 번 실행해야 합니다.</div>';
  $("contractList").innerHTML=warning+(contracts.length?contracts.map((contract,index)=>`
    <div class="contract-card" data-contract-index="${index}">
      <div class="contract-card-head"><strong>${index+1}번째 계약</strong><span class="task-badge">${esc(contract.status||"유지")}</span></div>
      <div class="contract-grid">
        <div class="field"><label>보험회사</label><input data-contract-field="company" value="${esc(contract.company||"")}" placeholder="보험회사"></div>
        <div class="field"><label>상품명</label><input data-contract-field="product" value="${esc(contract.product||"")}" placeholder="상품명"></div>
        <div class="field"><label>계약일</label><input type="text" inputmode="numeric" data-smart-date="true" placeholder="YYYY-MM-DD" data-contract-field="date" value="${esc(dateOnly(contract.date))}"></div>
        <div class="field"><label>계약만료일</label><input type="text" inputmode="numeric" data-smart-date="true" placeholder="YYYY-MM-DD" data-contract-field="expiry_date" value="${esc(dateOnly(contract.expiry_date))}"></div><div class="field"><label>보험기간</label><input data-contract-field="insurance_period" value="${esc(contract.insurance_period||"")}" placeholder="예: 20년 / 종신"></div><div class="field"><label>납입기간</label><input data-contract-field="payment_period" value="${esc(contract.payment_period||"")}" placeholder="예: 10년납"></div><div class="field"><label>월보험료</label><input type="number" min="0" step="1000" data-contract-field="amount" value="${num(contract.amount)||""}" placeholder="원"></div>
        <div class="field"><label>계약상태</label><select data-contract-field="status"><option ${contract.status==="유지"?"selected":""}>유지</option><option ${contract.status==="유지관리"?"selected":""}>유지관리</option><option ${contract.status==="확인필요"?"selected":""}>확인필요</option><option ${contract.status==="실효위험"?"selected":""}>실효위험</option><option ${contract.status==="해지"?"selected":""}>해지</option></select></div>
      </div>
      <div class="contract-auto-box">
        <label class="contract-auto-check"><input type="checkbox" data-contract-field="is_auto_insurance" ${contract.is_auto_insurance||contract.auto_expiry_date||String(contract.product||"").includes("자동차")?"checked":""}> 자동차보험 계약</label>
        <div class="contract-auto-grid">
          <div class="field"><label>차량번호</label><input data-contract-field="vehicle_number" value="${esc(contract.vehicle_number||"")}" placeholder="예: 12가3456"></div>
          <div class="field"><label>자동차보험 만기일</label><input type="text" inputmode="numeric" data-smart-date="true" placeholder="YYYY-MM-DD" data-contract-field="auto_expiry_date" value="${esc(dateOnly(contract.auto_expiry_date||""))}"></div>
          <div class="field"><label>갱신 상태</label><select data-contract-field="auto_renewal_status"><option ${contract.auto_renewal_status!=="갱신 완료"?"selected":""}>갱신 예정</option><option ${contract.auto_renewal_status==="갱신 완료"?"selected":""}>갱신 완료</option></select></div>
        </div>
        <small>만기일을 저장하면 대시보드 자동차 만기 30일 이내와 오늘 할 일에 자동 반영됩니다.</small>
      </div>
      <div class="contract-actions"><button type="button" class="btn danger" data-contract-action="delete" data-contract-index="${index}">계약 삭제</button><button type="button" class="btn primary" data-contract-action="save" data-contract-index="${index}">계약 저장</button></div>
    </div>`).join(""):'<div class="contract-empty">등록된 계약이 없습니다. 위의 <b>＋ 계약 추가</b>를 눌러주세요.</div>');
}
function newContract(){return {id:(crypto.randomUUID?crypto.randomUUID():String(Date.now())),company:"",product:"",date:"",expiry_date:"",insurance_period:"",payment_period:"",amount:0,status:"유지",is_auto_insurance:false,vehicle_number:"",auto_expiry_date:"",auto_renewal_status:"갱신 예정"}}
async function persistContracts(customer,nextContracts){
  const {error}=await db.from("customers").update({contracts:nextContracts}).eq("id",customer.id);
  if(error){
    if(/contracts|column|schema cache/i.test(error.message||"")) contractsColumnAvailable=false;
    renderContracts(customer);
    alert("계약 저장 실패: "+error.message+"\n\nZIP 안의 Supabase_계약기능_SQL.txt를 Supabase SQL Editor에서 한 번 실행해주세요.");
    return false;
  }
  contractsColumnAvailable=true;
  customer.contracts=nextContracts;
  $("detailContractCount").textContent=nextContracts.length;
  customer.status=nextContracts.length?"계약완료":customer.status;
  const autoContract=[...nextContracts].reverse().find(c=>c.is_auto_insurance&&c.auto_expiry_date);
  let insuranceInfo=getInsuranceInfo({...customer,contracts:[]});
  if(autoContract){
    insuranceInfo={
      ...insuranceInfo,
      types:Array.from(new Set([...(Array.isArray(insuranceInfo.types)?insuranceInfo.types:[]),"자동차보험"])),
      vehicle_number:autoContract.vehicle_number||"",
      auto_expiry_date:dateOnly(autoContract.auto_expiry_date),
      auto_renewal_status:autoContract.auto_renewal_status||"갱신 예정"
    };
  }
  customer.insurance_info=insuranceInfo;
  await db.from("customers").update({status:customer.status,insurance_info:insuranceInfo}).eq("id",customer.id);
  renderContracts(customer); render(); renderTasks(); renderDashboard();
  return true;
}
async function addContract(){
  const customer=customers.find(c=>String(c.id)===String(activeConsultCustomerId)); if(!customer)return;
  const next=[...getContracts(customer),newContract()];
  if(await persistContracts(customer,next)) setTimeout(()=>$("contractList").lastElementChild?.scrollIntoView({behavior:"smooth",block:"center"}),50);
}
async function saveContractFromCard(index){
  const customer=customers.find(c=>String(c.id)===String(activeConsultCustomerId)); if(!customer)return;
  const card=$("contractList").querySelector(`[data-contract-index="${index}"]`); if(!card)return;
  const current=[...getContracts(customer)];
  const updated={...current[index]};
  card.querySelectorAll("[data-contract-field]").forEach(input=>{
    const field=input.dataset.contractField;
    updated[field]=input.type==="checkbox"?input.checked:(field==="amount"?num(input.value):input.value);
  });
  if(updated.is_auto_insurance){
    updated.auto_expiry_date=formatSmartDate(updated.auto_expiry_date)||updated.auto_expiry_date;
    if(!updated.auto_expiry_date){alert("자동차보험 만기일을 입력해주세요.");return;}
  }else{
    updated.vehicle_number=""; updated.auto_expiry_date=""; updated.auto_renewal_status="갱신 예정";
  }
  if(!updated.date){alert("계약일을 입력해주세요.");return;}
  if(sameData(updated,current[index])){showSaveToast("변경된 내용이 없습니다.","info");return;}
  current[index]=updated;
  const saveButton=card.querySelector('[data-contract-action="save"]');
  setSaving(saveButton,true,"계약 저장");
  const saved=await persistContracts(customer,current);
  setSaving(saveButton,false,"계약 저장");
  if(saved) showSaveToast("계약이 저장되었습니다.");
}
async function deleteContractAt(index){
  const customer=customers.find(c=>String(c.id)===String(activeConsultCustomerId)); if(!customer)return;
  if(!confirm(`${index+1}번째 계약을 삭제할까요?`))return;
  const next=getContracts(customer).filter((_,i)=>i!==index);
  if(await persistContracts(customer,next)) alert("계약이 삭제되었습니다.");
}

async function deleteCustomer(id){
  const c=customers.find(x=>String(x.id)===String(id));
  const customerName=c?.name||"선택한 고객";
  if(!confirm(customerName+" 정보를 삭제할까요?"))return;

  const {error}=await db.from("customers").delete().eq("id",id);
  if(error){
    alert("삭제 실패: "+error.message);
    return;
  }
  await loadCustomers();
  alert("삭제되었습니다.");
}

$("customerBody").addEventListener("click",async event=>{
  const button=event.target.closest("button[data-action]");
  if(!button)return;

  const id=button.dataset.id;
  const action=button.dataset.action;

  if(action==="favorite") toggleFavorite(id);
  if(action==="open") openConsultation(id);
  if(action==="edit") editCustomer(id);
  if(action==="delete") await deleteCustomer(id);
});

$("customerForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const id=$("customerId").value;
  const enteredPhone=formatPhoneNumber($("phone").value);
  const duplicate=customers.find(c=>String(c.id)!==String(id)&&cleanPhone(c.phone)===cleanPhone(enteredPhone));
  if(duplicate){
    const proceed=confirm(`이미 등록된 휴대폰 번호입니다.\n\n고객: ${duplicate.name||"이름 없음"}\n최근 연락: ${lastContactLabel(duplicate)}\n\n확인을 누르면 중복으로 계속 등록하고, 취소를 누르면 기존 고객을 엽니다.`);
    if(!proceed){ clearForm(); showListView(); openConsultation(duplicate.id); return; }
  }
  const payload={
    name:$("name").value.trim(), phone:enteredPhone, age_group:$("age").value, status:$("status").value,
    source:$("source").value||"DB", available_time:$("availableTime").value.trim(),
    profile_info:{birthday:$("birthday").value||null,grade:$("customerGrade").value||"B",referrer_id:$("referrerId").value||null,family_info:$("familyInfo").value.trim(),landing_source:$("source").value==="랜딩페이지"?$("landingSource").value.trim():""},
    insurance_info:$("autoInsuranceCheck").checked?{types:["자동차보험"],vehicle_number:$("vehicleNumber").value.trim(),auto_expiry_date:$("autoExpiryDate").value||null,auto_renewal_status:$("autoRenewalStatus").value||"갱신 예정"}:{types:[]},
    memo:$("memo").value.trim()
  };
  const formSaveButton=$("customerForm").querySelector('button[type="submit"]');
  setSaving(formSaveButton,true,id?"고객 수정 저장":"고객 저장");
  const res=id
    ? await db.from("customers").update(payload).eq("id",id).select().single()
    : await db.from("customers").insert(payload).select().single();
  setSaving(formSaveButton,false,id?"고객 수정 저장":"고객 저장");

  if(res.error){
    alert("저장 실패: "+res.error.message);
  }else{
    const wasEdit=Boolean(id);
    const savedId=res.data?.id||id;
    clearForm();
    await loadCustomers();
    if(savedId){
      showListView();
      openConsultation(savedId);
      showSaveToast(wasEdit?"고객 정보가 저장되었습니다.":"고객이 등록되었습니다.");
    }else{
      showListView();
      showSaveToast(wasEdit?"고객 정보가 저장되었습니다.":"고객이 등록되었습니다.");
    }
  }
});
["search","statusFilter","sourceFilter","sortBy"].forEach(id=>$(id).addEventListener("input",()=>{
  currentPage=1;
  render();
}));
$("phone").addEventListener("input",e=>{
  const cursorFromEnd=e.target.value.length-e.target.selectionStart;
  e.target.value=formatPhoneNumber(e.target.value);
  const next=Math.max(0,e.target.value.length-cursorFromEnd);
  requestAnimationFrame(()=>e.target.setSelectionRange(next,next));
});
$("phone").addEventListener("blur",e=>{e.target.value=formatPhoneNumber(e.target.value);});

$("cancelBtn").addEventListener("click",()=>{clearForm();showListView();});
$("newBtn").addEventListener("click",()=>{clearForm();showFormView();});
$("backToListBtn").addEventListener("click",()=>{clearForm();showListView();});
$("formCloseBtn")?.addEventListener("click",()=>{clearForm();showListView();});
$("formHomeBtn")?.addEventListener("click",goCrmHome);
document.querySelectorAll(".task-filter").forEach(button=>button.addEventListener("click",()=>{activeTaskFilter=button.dataset.taskFilter;document.querySelectorAll(".task-filter").forEach(b=>b.classList.toggle("active",b===button));renderTasks();}));
$("taskSort")?.addEventListener("change",()=>{activeTaskSort=$("taskSort").value;renderTasks();});
$("priorityList")?.addEventListener("click",e=>{const b=e.target.closest("[data-priority-id]");if(b)openConsultation(b.dataset.priorityId);});
$("attentionList")?.addEventListener("click",e=>{const b=e.target.closest("[data-attention-id]");if(b)openConsultation(b.dataset.attentionId);});

$("taskList").addEventListener("click",event=>{
  const button=event.target.closest("button[data-task-action]"); if(!button)return;
  const task=($("taskList")._tasks||[])[Number(button.dataset.taskIndex)]; if(!task)return;
  if(button.dataset.taskAction==="open") openConsultation(task.customer.id);
  if(button.dataset.taskAction==="done") completeTask(task.unique);
});


function getSelectedCustomers(){
  return customers.filter(c=>selectedIds.has(String(c.id)));
}

function buildMessage(selected){
  const names=selected.map(c=>c.name).filter(Boolean);
  const nameText=names.length===1?names[0]+" 고객님":"고객님";
  return `안녕하세요. ${nameText}
AI보험 미래전략사업부 김민석 사업단장입니다.

상담 신청 감사합니다.
확인 후 상담 가능 시간에 맞춰 연락드리겠습니다.

문의: 010-8795-8502`;
}

$("todayBtn").addEventListener("click",()=>{
  todayOnly=!todayOnly;
  activeStatsFilter=todayOnly?"today":"all";
  currentPage=1;

  $("todayBtn").classList.toggle("today-active",todayOnly);
  $("todayBtn").textContent=todayOnly?"전체 고객 보기":"오늘 연락 예정만 보기";

  document.querySelectorAll(".stat-filter").forEach(card=>{
    card.classList.toggle("active",card.dataset.filter===activeStatsFilter);
  });

  render();
});

$("smsBtn").addEventListener("click",()=>{
  const selected=getSelectedCustomers();
  if(!selected.length){alert("문자를 보낼 고객을 먼저 체크해주세요.");return;}

  const phones=selected.map(c=>cleanPhone(c.phone)).filter(Boolean);
  if(!phones.length){alert("선택한 고객의 휴대폰 번호가 없습니다.");return;}

  const body=encodeURIComponent(buildMessage(selected));
  const separator=/iPhone|iPad|iPod/i.test(navigator.userAgent)?"&":"?";
  location.href=`sms:${phones.join(",")}${separator}body=${body}`;
});


document.querySelectorAll(".stat-filter").forEach(card=>{
  card.addEventListener("click",()=>{
    activeStatsFilter=card.dataset.filter||"all";
    currentPage=1;

    document.querySelectorAll(".stat-filter").forEach(item=>{
      item.classList.toggle("active",item===card);
    });

    if(activeStatsFilter==="today"){
      todayOnly=true;
      $("todayBtn").classList.add("today-active");
      $("todayBtn").textContent="전체 고객 보기";
    }else{
      todayOnly=false;
      $("todayBtn").classList.remove("today-active");
      $("todayBtn").textContent="오늘 연락 예정만 보기";
    }

    render();
  });
});


function openDashboardJump(card){
  const view=card?.dataset.jumpView;
  if(!view)return;
  showListView();
  applyCrmView(view);

  const status=card.dataset.jumpStatus||"";
  if($("statusFilter")) $("statusFilter").value=status;

  const taskFilter=card.dataset.jumpTask||"";
  if(view==="tasks"){
    activeTaskFilter=taskFilter||"all";
    document.querySelectorAll(".task-filter").forEach(button=>{
      button.classList.toggle("active",button.dataset.taskFilter===activeTaskFilter);
    });
    renderTasks();
  }else{
    render();
  }
}

document.querySelectorAll(".dashboard-jump").forEach(card=>{
  card.addEventListener("dblclick",event=>{
    if(event.target.closest("button,a,input,select,textarea"))return;
    openDashboardJump(card);
  });
});


$("customerBody").addEventListener("dblclick",event=>{
  if(event.target.closest("button,a,input,select,textarea"))return;
  const row=event.target.closest("tr[data-customer-id]");
  if(!row)return;
  openConsultation(row.dataset.customerId);
});

$("taskList").addEventListener("dblclick",event=>{
  if(event.target.closest("button,a,input,select,textarea"))return;
  const item=event.target.closest(".task-item[data-customer-id]");
  if(!item)return;
  openConsultation(item.dataset.customerId);
});

$("addContractBtn").addEventListener("click",addContract);
$("familyMemberAdd")?.addEventListener("click",addFamilyMember);
$("familyTree")?.addEventListener("click",handleFamilyAction);
$("familyLinkedCustomer")?.addEventListener("change",e=>{const c=customers.find(x=>String(x.id)===String(e.target.value));if(c){$("familyMemberName").value=c.name||"";$("familyMemberPhone").value=c.phone||"";}});
$("contractList").addEventListener("click",event=>{
  const button=event.target.closest("button[data-contract-action]"); if(!button)return;
  const index=Number(button.dataset.contractIndex);
  if(button.dataset.contractAction==="save")saveContractFromCard(index);
  if(button.dataset.contractAction==="delete")deleteContractAt(index);
});
document.querySelectorAll(".contract-tab").forEach(button=>button.addEventListener("click",()=>{
  activeContractFilter=button.dataset.contractFilter||"all";
  document.querySelectorAll(".contract-tab").forEach(x=>x.classList.toggle("active",x===button));
  currentPage=1; render();
}));


function setCustomerDetailTab(tab){
  document.querySelectorAll(".customer-detail-tab").forEach(button=>{
    button.classList.toggle("active",button.dataset.detailTab===tab);
  });
  document.querySelectorAll(".customer-detail-panel").forEach(panel=>{
    panel.classList.toggle("active",panel.dataset.detailPanel===tab);
  });
}

document.querySelectorAll(".customer-detail-tab").forEach(button=>{
  button.addEventListener("click",()=>setCustomerDetailTab(button.dataset.detailTab));
});

$("consultClose").addEventListener("click",closeConsultation);
$("consultBack")?.addEventListener("click",closeConsultation);
$("consultHome")?.addEventListener("click",goCrmHome);
$("consultSave").addEventListener("click",saveConsultation);
$("consultComposerClose").addEventListener("click",()=>{
  const current=$("consultMemo").value.trim();
  if(current&&current!==consultInitialMemo&&!confirm("작성 중인 상담 내용이 있습니다. 기록창을 닫을까요?"))return;
  $("consultComposer").classList.add("hidden");
  $("consultComposerOpen").classList.remove("hidden");
});
$("consultComposerOpen").addEventListener("click",()=>{
  $("consultComposer").classList.remove("hidden");
  $("consultComposerOpen").classList.add("hidden");
  $("consultMemo").focus();
});
$("consultFollowUpSave").addEventListener("click",saveConsultFollowUp);

$("consultHistory").addEventListener("click",event=>{
  const button=event.target.closest("button[data-history-action]");
  if(!button)return;

  const index=Number(button.dataset.historyIndex);
  const action=button.dataset.historyAction;

  if(action==="edit") editConsultationHistory(index);
  if(action==="delete") deleteConsultationHistory(index);
});

$("consultModal").addEventListener("click",event=>{
  if(event.target===$("consultModal"))closeConsultation();
});

document.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&$("consultModal").classList.contains("open")){ closeConsultation(); } else if(event.key==="Escape"&&!$("formView").classList.contains("hidden")){ clearForm(); showListView(); }
});

$("pagination").addEventListener("click",event=>{
  const btn=event.target.closest("button[data-page]");
  if(!btn||btn.disabled)return;
  currentPage=Number(btn.dataset.page);
  render();
});

$("customerBody").addEventListener("change",event=>{
  const checkbox=event.target.closest(".row-check");
  if(!checkbox)return;
  const id=String(checkbox.dataset.id);
  checkbox.checked?selectedIds.add(id):selectedIds.delete(id);
  checkbox.closest("tr")?.classList.toggle("selected-row",checkbox.checked);
  renderPagination(Math.max(1,Math.ceil(getFilteredCustomers().length/pageSize)));
  updateSelectAll(getFilteredCustomers().slice((currentPage-1)*pageSize,currentPage*pageSize));
});

$("selectAll").addEventListener("change",event=>{
  document.querySelectorAll(".row-check").forEach(checkbox=>{
    checkbox.checked=event.target.checked;
    const id=String(checkbox.dataset.id);
    event.target.checked?selectedIds.add(id):selectedIds.delete(id);
    checkbox.closest("tr")?.classList.toggle("selected-row",event.target.checked);
  });
  renderPagination(Math.max(1,Math.ceil(getFilteredCustomers().length/pageSize)));
});

document.querySelector('.stat-filter[data-filter="all"]')?.classList.add("active");

["birthYear","birthMonth","birthDay"].forEach((id,index)=>$(id).addEventListener("input",e=>{e.target.value=e.target.value.replace(/\D/g,""); if((index===0&&e.target.value.length===4)||(index>0&&e.target.value.length===2))syncBirthday(); if(index===0&&e.target.value.length===4)$("birthMonth").focus(); if(index===1&&e.target.value.length===2)$("birthDay").focus();}));
$("source").addEventListener("change",toggleLandingSource);
$("autoInsuranceCheck")?.addEventListener("change",toggleAutoInsuranceBox);
$("formView").addEventListener("click",e=>{if(e.target===$("formView")){clearForm();showListView();}});
$("paymentSave").addEventListener("click",savePaymentInfo);
$("identitySave").addEventListener("click",saveIdentityInfo);
$("consultCardNumber").addEventListener("input",e=>{const d=e.target.value.replace(/\D/g,"").slice(0,16);e.target.value=d.replace(/(.{4})/g,"$1 ").trim();});
$("consultCardExpiry").addEventListener("input",e=>{const d=e.target.value.replace(/\D/g,"").slice(0,4);e.target.value=d.length>2?d.slice(0,2)+"/"+d.slice(2):d;});
$("consultPaymentAccount").addEventListener("input",e=>{e.target.value=e.target.value.replace(/[^0-9-]/g,"");});
["consultPaymentBank","consultPaymentAccount","consultPaymentDay","consultCardNumber","consultCardExpiry"].forEach(id=>$(id).addEventListener(id==="consultPaymentDay"?"change":"input",markPaymentDirty));
["consultIdentityVerified","consultDriverLicense","consultResidentIssueDate"].forEach(id=>$(id).addEventListener(id==="consultDriverLicense"?"input":"change",markIdentityDirty));
checkSession();

$("calPrev")?.addEventListener("click",()=>{calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()-1,1);renderCalendar();});
$("calNext")?.addEventListener("click",()=>{calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()+1,1);renderCalendar();});
$("calendarGrid")?.addEventListener("click",e=>{const b=e.target.closest("[data-cal-id]");if(b)openConsultation(b.dataset.calId);});

// 5.4.19: 대시보드 약속일 경과 카드 제목을 항상 정확히 표시합니다.
const missedScheduleTitle = document.getElementById("missedScheduleTitle");
if (missedScheduleTitle) missedScheduleTitle.textContent = "놓치기 쉬운 일정 (약속일경과)";


// 5.4.21: 숫자 날짜 입력을 YYYY-MM-DD로 자동 변환합니다.
// 지원: 20260805 -> 2026-08-05, 260805 -> 2026-08-05
function normalizeSmartDate(value){
  const raw=String(value||"").trim();
  if(!raw)return "";
  if(/^\d{4}-\d{2}-\d{2}$/.test(raw)){
    const [y,m,d]=raw.split("-").map(Number);
    const dt=new Date(y,m-1,d);
    return dt.getFullYear()===y&&dt.getMonth()===m-1&&dt.getDate()===d?raw:null;
  }
  const digits=raw.replace(/\D/g,"");
  let y,m,d;
  if(digits.length===8){
    y=Number(digits.slice(0,4));m=Number(digits.slice(4,6));d=Number(digits.slice(6,8));
  }else if(digits.length===6){
    y=2000+Number(digits.slice(0,2));m=Number(digits.slice(2,4));d=Number(digits.slice(4,6));
  }else return null;
  const dt=new Date(y,m-1,d);
  if(dt.getFullYear()!==y||dt.getMonth()!==m-1||dt.getDate()!==d)return null;
  return `${String(y).padStart(4,"0")}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

function focusNextFormControl(current){
  const scope=current.closest("form, .contract-card, .form-grid, .detail-panel, .modal-card")||document;
  const controls=[...scope.querySelectorAll('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])')]
    .filter(el=>el.offsetParent!==null);
  const index=controls.indexOf(current);
  if(index>=0&&controls[index+1])controls[index+1].focus();
}

document.addEventListener("input",event=>{
  const input=event.target.closest('input[data-smart-date="true"]');
  if(!input)return;
  const digits=input.value.replace(/\D/g,"").slice(0,8);
  // 숫자 8자리가 완성되면 즉시 변환합니다.
  if(digits.length===8){
    const normalized=normalizeSmartDate(digits);
    if(normalized){
      input.value=normalized;
      input.dataset.smartDateFormatted="true";
    }
  }
});

document.addEventListener("blur",event=>{
  const input=event.target.closest('input[data-smart-date="true"]');
  if(!input||!input.value.trim())return;
  const normalized=normalizeSmartDate(input.value);
  if(normalized){
    input.value=normalized;
    input.setCustomValidity("");
  }else{
    input.setCustomValidity("날짜를 20260805 또는 2026-08-05 형식으로 입력해주세요.");
  }
},true);

document.addEventListener("keydown",event=>{
  const input=event.target.closest('input[data-smart-date="true"]');
  if(!input||event.key!=="Enter")return;
  const normalized=normalizeSmartDate(input.value);
  if(!normalized)return;
  event.preventDefault();
  input.value=normalized;
  input.setCustomValidity("");
  focusNextFormControl(input);
});
