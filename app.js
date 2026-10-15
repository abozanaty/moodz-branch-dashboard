
const URL_API="https://yogsjsqctpnmhhsjxcfm.supabase.co";
const PUBLIC_KEY="sb_publishable_0HWgGuV4SkfFXlIbFdRsBw_5R-mLz3H";
const db=window.supabase.createClient(URL_API,PUBLIC_KEY);
const extras=["BKLN PTS","BKLN KORBA","BKLN TOFFIE","BKLN PORTO","BKLN G","BKLN PARK","MOODZ 1","MOODZ G","MOODZ MD","MOODZ PORTO","CALL-CENTER","NINO JEANS"];
let user=null,profile=null,records=[],channel=null,branchSettings={},activeTimeBranch="",recordsVisible=false,userBranches=[],dashboardBranchSettings={},dailyRevenue=[];
const $=id=>document.getElementById(id);
function toast(s){$("toast").textContent=s;$("toast").classList.remove("hidden");setTimeout(()=>$("toast").classList.add("hidden"),3500)}
function esc(s){return String(s==null?"":s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}
function canEdit(){return profile&&["admin","editor"].includes(profile.role)}
function canDelete(){return profile&&profile.role==="admin"}
function canManageUsers(){return profile&&profile.role==="admin"}
function canEditBranch(branch){return !!profile&&(profile.role==="admin"||(profile.role==="editor"&&userBranches.some(x=>x.branch===branch&&x.access_level==="edit")))}
function availableEditableBranches(){return availableBranches().filter(b=>canEditBranch(b))}
function availableBranches(){const known=extras.filter(b=>dashboardBranchSettings[b]?.is_visible!==false);return profile?.role==="admin"?known:known.filter(b=>userBranches.some(x=>x.branch===b))}
function roleName(r){return ({admin:"مسؤول النظام",editor:"محرر",viewer:"عرض فقط"})[r]||r}
window.signIn=async function signIn(){try{const email=$("email").value.trim(),password=$("password").value;if(!email||!password)return toast("اكتب البريد وكلمة المرور");const btn=document.querySelector("#login button.primary");if(btn){btn.disabled=true;btn.textContent="جارٍ تسجيل الدخول..."}const {data,error}=await db.auth.signInWithPassword({email,password});if(error)toast(error.message==="Invalid login credentials"?"بيانات الدخول غير صحيحة. راجع البريد وكلمة المرور، أو اطلب من المسؤول إعادة تعيين كلمة المرور.":"تعذر الدخول: "+error.message);else if(data.user){user=data.user;await load()}}catch(e){toast("خطأ أثناء الدخول: "+(e?.message||String(e)))}finally{const btn=document.querySelector("#login button.primary");if(btn){btn.disabled=false;btn.textContent="دخول"}}};
async function signOut(){if(channel)await db.removeChannel(channel);await db.auth.signOut();location.reload()}
async function start(){try{const result=await Promise.race([db.auth.getSession(),new Promise((_,reject)=>setTimeout(()=>reject(new Error("الاتصال بخدمة تسجيل الدخول استغرق وقتًا طويلًا. حدّث الصفحة وتأكد من اتصال الإنترنت.")),12000))]);const session=result?.data?.session;if(session){user=session.user;await load()}db.auth.onAuthStateChange((event)=>{if(event==="SIGNED_OUT")location.reload()})}catch(e){console.error("Dashboard startup failed",e);const login=$("login");if(login)login.classList.remove("hidden");toast("تعذر بدء الداشبورد: "+(e?.message||String(e)))}}
async function load(){try{const p=await db.from("profiles").select("role,display_name").eq("id",user.id).single();if(p.error)throw new Error("الحساب موجود لكن لم تُحدد له صلاحية في profiles. اطلب من المسؤول إكمال الإعداد.");profile=p.data;if(location.pathname.endsWith("/users.html")&&profile.role!=="admin"){location.href="./index.html";return}const {data:assignments,error:assignError}=await db.from("user_branch_access").select("branch,access_level").eq("user_id",user.id);if(assignError)throw assignError;userBranches=(assignments||[]).map(x=>({branch:x.branch,access_level:x.access_level||"view"}));await refresh();$("login").classList.add("hidden");$("app").classList.remove("hidden");$("who").textContent=(profile.display_name||user.email)+" — "+roleName(profile.role);$("add").disabled=!canEdit();if(location.pathname.endsWith("/users.html")){document.body.classList.add("users-page");setTimeout(()=>window.openUserManagement(),0)}const userTab=$("usersNav");if(userTab)userTab.classList.toggle("hidden",!canManageUsers());if(channel)db.removeChannel(channel);channel=db.channel("records-live").on("postgres_changes",{event:"*",schema:"public",table:"branch_records"},refresh).subscribe()}catch(e){console.error("Dashboard load failed",e);toast("تعذر تحميل الداشبورد: "+(e.message||String(e)))}}
async function refresh(){const {data,error}=await db.from("branch_records").select("*").order("created_at",{ascending:true});if(error)throw error;records=(data||[]).map(x=>({id:x.id,branch:x.branch,sheet:x.sheet,headers:x.headers||[],row:x.row_data||{},created_at:x.created_at}));await loadBranchSettings();await loadDashboardBranchSettings();if(profile?.role==="admin")await loadDailyRevenue();fillFilters();render();renderAdminTools();const manage=$("manageUsers");if(manage)manage.classList.toggle("hidden",!canManageUsers())}
function egyptDate(value=new Date()){return new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Cairo",year:"numeric",month:"2-digit",day:"2-digit"}).format(value)}
async function loadBranchSettings(){const {data,error}=await db.from("branch_settings").select("*");if(error){console.error(error);return}branchSettings={};const today=egyptDate();for(const x of (data||[])){const savedDay=x.updated_at?egyptDate(new Date(x.updated_at)):"";if(x.opening_time&&savedDay&&savedDay!==today){const {error:clearError}=await db.from("branch_settings").update({opening_time:null,updated_at:new Date().toISOString(),updated_by:user?.id||null}).eq("branch",x.branch);if(clearError){console.error(clearError);branchSettings[x.branch]=String(x.opening_time).slice(0,5)}else branchSettings[x.branch]="";}else branchSettings[x.branch]=x.opening_time?String(x.opening_time).slice(0,5):"";}}

async function loadDashboardBranchSettings(){
 const {data,error}=await db.from("branch_dashboard_settings").select("branch,is_visible");
 if(error){console.error("Branch dashboard settings",error);dashboardBranchSettings={};return}
 dashboardBranchSettings={};for(const b of extras)dashboardBranchSettings[b]={is_visible:true};
 for(const x of data||[])dashboardBranchSettings[x.branch]={is_visible:x.is_visible!==false};
}
async function loadDailyRevenue(){
 const {data,error}=await db.from("branch_daily_revenue").select("*").order("revenue_date",{ascending:false}).limit(365);
 if(error){console.error("Daily revenue",error);dailyRevenue=[];return}
 dailyRevenue=data||[];
}
function renderAdminTools(){
 const root=$("adminTools");if(!root)return;
 if(profile?.role!=="admin"){root.classList.add("hidden");return}
 root.classList.remove("hidden");
 const branchPanel=$("branchSettingsAdmin"),revPanel=$("dailyRevenueAdmin");
 if(branchPanel)branchPanel.innerHTML='<h3>إعدادات ظهور الفروع</h3><p class="note">إخفاء الفرع يخفي سجلاته وملخصاته من الداشبورد الرئيسية، ويمكن إظهاره مرة أخرى في أي وقت.</p><div class="branch-toggle-grid">'+extras.map(b=>'<label class="branch-toggle"><span>'+esc(b)+'</span><input type="checkbox" data-visible-branch="'+esc(b)+'" '+(dashboardBranchSettings[b]?.is_visible===false?'':'checked')+'><small>'+(dashboardBranchSettings[b]?.is_visible===false?'مخفي':'ظاهر')+'</small></label>').join('')+'</div><button type="button" class="primary" id="saveBranchVisibility">حفظ إعدادات الفروع</button>';
 if(revPanel){
 const today=egyptDate();
 revPanel.innerHTML='<h3>إدخال الإيراد اليومي — مسؤول النظام فقط</h3><div class="revenue-form"><label>الفرع<select id="revenueBranch">'+extras.map(b=>'<option>'+esc(b)+'</option>').join('')+'</select></label><label>التاريخ<input id="revenueDate" type="date" value="'+today+'"></label><label>الإيراد بالجنيه<input id="revenueAmount" type="number" min="0" step="0.01" placeholder="0.00"></label><label>ملاحظات<input id="revenueNotes" type="text" placeholder="اختياري"></label><button type="button" class="primary" id="saveRevenue">حفظ الإيراد</button></div><div id="revenueChart" class="revenue-chart"></div><div class="table-scroll"><table class="revenue-table"><thead><tr><th>التاريخ</th><th>الفرع</th><th>الإيراد</th><th>ملاحظات</th></tr></thead><tbody>'+dailyRevenue.slice(0,60).map(x=>'<tr><td>'+esc(x.revenue_date)+'</td><td>'+esc(x.branch)+'</td><td>'+Number(x.revenue).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})+'</td><td>'+esc(x.notes||"—")+'</td></tr>').join('')+'</tbody></table></div>';
 const totals={};for(const x of dailyRevenue){totals[x.branch]=(totals[x.branch]||0)+Number(x.revenue||0)}
 const max=Math.max(1,...extras.map(b=>totals[b]||0));
 $("revenueChart").innerHTML='<h4>إجمالي الإيرادات المسجلة حسب الفرع</h4>'+extras.map(b=>'<div class="bar-row"><span>'+esc(b)+'</span><div class="bar-track"><i style="width:'+Math.round((totals[b]||0)/max*100)+'%"></i></div><b>'+Math.round(totals[b]||0).toLocaleString("en-US")+' ج.م</b></div>').join('');
 }
 const saveVis=$("saveBranchVisibility");if(saveVis)saveVis.onclick=async()=>{saveVis.disabled=true;try{const rows=[...branchPanel.querySelectorAll("[data-visible-branch]")].map(x=>({branch:x.dataset.visibleBranch,is_visible:x.checked,updated_by:user.id,updated_at:new Date().toISOString()}));for(const row of rows){const {error}=await db.from("branch_dashboard_settings").upsert(row,{onConflict:"branch"});if(error)throw error;dashboardBranchSettings[row.branch]={is_visible:row.is_visible}}toast("تم حفظ إعدادات ظهور الفروع");fillFilters();render();renderAdminTools()}catch(e){toast("تعذر حفظ الإعدادات: "+e.message)}finally{saveVis.disabled=false}};
 const saveRev=$("saveRevenue");if(saveRev)saveRev.onclick=async()=>{const branch=$("revenueBranch").value,date=$("revenueDate").value,revenue=Number($("revenueAmount").value),notes=$("revenueNotes").value.trim();if(!date||!Number.isFinite(revenue)||revenue<0)return toast("اكتب التاريخ والإيراد بشكل صحيح");saveRev.disabled=true;try{const {error}=await db.from("branch_daily_revenue").upsert({branch,revenue_date:date,revenue,notes:notes||null,created_by:user.id,updated_at:new Date().toISOString()},{onConflict:"branch,revenue_date"});if(error)throw error;await loadDailyRevenue();toast("تم حفظ الإيراد اليومي");renderAdminTools()}catch(e){toast("تعذر حفظ الإيراد: "+e.message)}finally{saveRev.disabled=false}};
}

function unique(a){return [...new Set(a)]}
function fillFilters(){const bs=availableBranches(),ss=unique([...records.map(x=>x.sheet),"Task"]);const oldB=$("branch").value,oldS=$("sheet").value;$("branch").innerHTML='<option value="">كل الفروع</option>'+bs.map(x=>'<option>'+esc(x)+'</option>').join("");$("sheet").innerHTML='<option value="">كل التقارير</option>'+ss.map(x=>'<option>'+esc(x)+'</option>').join("");$("branch").value=bs.includes(oldB)?oldB:"";$("sheet").value=ss.includes(oldS)?oldS:""}
function filtered(){const b=$("branch").value,s=$("sheet").value,st=$("status").value,q=$("search").value.toLowerCase().trim(),visible=new Set(availableBranches());return records.filter(x=>visible.has(x.branch)&&(!b||x.branch===b)&&(!s||x.sheet===s)&&(!st||String(x.row["الحالة"]||"").includes(st))&&(!q||[x.branch,x.sheet,...Object.values(x.row)].some(v=>String(v||"").toLowerCase().includes(q))))}
function statsHtml(a){const pending=a.filter(x=>{const s=String(x.row["الحالة"]||"");return s.includes("متابعة")||s.includes("مفتوح")||s==="?"||!s}).length;const done=a.filter(x=>String(x.row["الحالة"]||"").includes("تم الحل")).length;const noOwner=a.filter(x=>{const k=Object.keys(x.row).find(k=>k.includes("مسؤول"));return !k||!String(x.row[k]||"").trim()||String(x.row[k]).trim()==="?"}).length;return '<div class="stat"><span>إجمالي السجلات</span><strong>'+a.length+'</strong></div><div class="stat"><span>قيد المتابعة / مفتوح</span><strong>'+pending+'</strong></div><div class="stat"><span>تم الحل</span><strong>'+done+'</strong></div><div class="stat"><span>بدون مسؤول محدد</span><strong>'+noOwner+'</strong></div>'}
function render(){
 const a=filtered();$("stats").innerHTML=statsHtml(a);
 const b=$("branch").value,ba=records.filter(x=>!b||x.branch===b);$("summary").innerHTML=statsHtml(ba);
 const bs=availableBranches();
 $("summaryTabs").innerHTML='<button class="tab '+(!b?'active':'')+'" onclick="selectBranchIndex(-1)">كل الفروع</button>'+bs.map((x,i)=>'<button class="tab '+(x===b?'active':'')+'" onclick="selectBranchIndex('+i+')">'+esc(x)+'</button>').join("");
 const sidebar=$("branchTabs");if(sidebar)sidebar.innerHTML='<button class="branch-tab '+(!b?'active':'')+'" onclick="selectBranchIndex(-1)">كل الفروع</button>'+bs.map((x,i)=>'<button class="branch-tab '+(x===b?'active':'')+'" onclick="selectBranchIndex('+i+')">'+esc(x)+'<span>'+records.filter(r=>r.branch===x).length+'</span></button>').join("");
 $("count").textContent="عرض "+a.length+" من "+records.length+" سجل";
 const recordsEl=$("records");
 if(!recordsVisible){recordsEl.classList.add("hidden");$("toggleRecords").textContent="＋ إظهار سجلات "+(b||"كل الفروع");$("toggleRecords").setAttribute("aria-expanded","false");}
 else{recordsEl.classList.remove("hidden");$("toggleRecords").textContent="− إخفاء السجلات";$("toggleRecords").setAttribute("aria-expanded","true");}
 recordsEl.innerHTML=a.map(x=>{
   const fields=x.headers.map(h=>{
     const label='<label>'+esc(h)+'</label>';
     const attr=' data-id="'+esc(x.id)+'" data-key="'+esc(h)+'"';
     if(canEditBranch(x.branch)&&h==="الحالة")return '<div class="field">'+label+'<select'+attr+' onchange="changeField(this.dataset.id,this.dataset.key,this.value)">'+["قيد المتابعة","تم الحل","مفتوح","مؤجل"].map(v=>'<option '+(String(x.row[h]||"")===v?"selected":"")+'>'+v+'</option>').join("")+'</select></div>';
     if(canEditBranch(x.branch))return '<div class="field">'+label+'<textarea'+attr+' onchange="changeField(this.dataset.id,this.dataset.key,this.value)">'+esc(x.row[h])+'</textarea></div>';
     return '<div class="field">'+label+'<div>'+esc(x.row[h])+'</div></div>';
   }).join("");
   return '<article class="record"><h3>'+esc(x.branch)+' — '+esc(x.sheet)+'</h3>'+fields+'<div class="row">'+(canEditBranch(x.branch)?'<button class="primary" data-id="'+esc(x.id)+'" onclick="saveCard(this.dataset.id)">حفظ التعديلات</button>':'')+(canDelete()?'<button class="danger" data-id="'+esc(x.id)+'" onclick="deleteRecord(this.dataset.id)">حذف</button>':'')+'</div></article>';
 }).join("");
 renderVisuals(a,ba);renderOpeningTimes();applyLanguage();
}

function renderVisuals(a,ba){
 const el=$("visuals");if(!el)return;
 const statuses=[["قيد المتابعة",a.filter(x=>String(x.row["الحالة"]||"").includes("متابعة")).length],["مفتوح",a.filter(x=>String(x.row["الحالة"]||"").includes("مفتوح")).length],["تم الحل",a.filter(x=>String(x.row["الحالة"]||"").includes("تم الحل")).length],["مؤجل",a.filter(x=>String(x.row["الحالة"]||"").includes("مؤجل")).length]];
 const branches=availableBranches().map(b=>({name:b,count:records.filter(x=>x.branch===b).length})).sort((x,y)=>y.count-x.count);
 const max=Math.max(1,...branches.map(x=>x.count));
 el.innerHTML='<div class="visual-grid"><section class="panel visual-card"><h3>حالة المهام</h3>'+statuses.map(s=>'<div class="bar-row"><span>'+esc(s[0])+'</span><div class="bar-track"><i style="width:'+(a.length?Math.round(s[1]/a.length*100):0)+'%"></i></div><b>'+s[1]+'</b></div>').join('')+'</section><section class="panel visual-card"><h3>السجلات حسب الفرع</h3>'+branches.map(b=>'<div class="bar-row"><span>'+esc(b.name)+'</span><div class="bar-track"><i style="width:'+Math.round(b.count/max*100)+'%"></i></div><b>'+b.count+'</b></div>').join('')+'</section></div>';
}
function renderOpeningTimes(){
 const el=$("openingTimes");if(!el)return;
 const branches=availableBranches();
 const complete=branches.length>0&&branches.every(b=>!!branchSettings[b]);
 el.innerHTML='<section class="panel opening-panel"><div class="opening-alert '+(complete?'is-complete':'is-pending')+'"><span class="opening-alert-dot"></span><strong>'+(complete?'تم إدخال مواعيد كل الفروع':'ادخل ميعاد الفرع')+'</strong><span>'+(complete?'كل الفروع لها ميعاد فتح مسجل':'الفروع باللون الأحمر لم يتم تسجيل ميعاد فتحها بعد')+'</span></div><h3>مواعيد فتح الفروع</h3><p class="note">سجّل ميعاد فتح كل فرع واضغط حفظ. الفرع يتحول للأخضر بعد حفظ الميعاد.</p><div class="opening-grid">'+branches.map((b,i)=>{const saved=!!branchSettings[b];return '<div class="opening-branch '+(saved?'is-set':'is-missing')+'"><h4><span class="branch-status-dot"></span>'+esc(b)+'</h4><label for="openingTime-'+i+'">ميعاد الفتح</label><div class="time-row"><input id="openingTime-'+i+'" data-branch="'+esc(b)+'" type="time" step="60" value="'+esc(branchSettings[b]||"")+'" '+(!canEditBranch(b)?'disabled':'')+'><button type="button" class="primary" data-branch="'+esc(b)+'" onclick="saveOpeningTimeFor(this.dataset.branch)" '+(!canEdit()?'disabled':'')+'>حفظ</button></div><div class="opening-saved">'+(saved?'تم تسجيل الميعاد: '+esc(branchSettings[b]):'لم يتم تسجيل ميعاد الفتح')+'</div></div>'}).join('')+'</div></section>';
}
window.saveOpeningTimeFor=async function(branch){
 if(!canEdit())return;
 const input=[...document.querySelectorAll("#openingTimes input[data-branch]")].find(x=>x.dataset.branch===branch);
 const value=input?.value;
 if(!value)return toast("اختار ميعاد فتح فرع "+branch);
 const {error}=await db.from("branch_settings").upsert({branch,opening_time:value+":00",updated_by:user.id,updated_at:new Date().toISOString()},{onConflict:"branch"});
 if(error)return toast("تعذر حفظ الميعاد: "+error.message);
 branchSettings[branch]=value;toast("تم حفظ ميعاد فتح فرع "+branch);renderOpeningTimes();
};


function selectBranchIndex(i){const bs=availableBranches();$("branch").value=i<0?"":(bs[i]||"");recordsVisible=true;render()} 
window.toggleRecordsVisibility=function(){recordsVisible=!recordsVisible;render()};
function changeField(id,h,v){const x=records.find(r=>r.id===id);if(x)x.row[h]=v}
async function saveCard(id){const x=records.find(r=>r.id===id);if(!x||!canEditBranch(x.branch))return;const {error}=await db.from("branch_records").update({branch:x.branch,sheet:x.sheet,headers:x.headers,row_data:x.row}).eq("id",id);if(error)toast("فشل الحفظ: "+error.message);else toast("تم حفظ التعديلات ومزامنتها")}
async function deleteRecord(id){if(!canDelete()||!confirm("حذف السجل نهائيًا؟"))return;const {error}=await db.from("branch_records").delete().eq("id",id);if(error)toast("فشل الحذف: "+error.message);else{toast("تم الحذف");await refresh()}}
async function addRecord(){
 if(!canEdit())return;
 const branches=availableEditableBranches();
 const sheets=unique([...records.map(x=>x.sheet).filter(Boolean),"Task"]);
 if(!branches.length||!sheets.length)return toast("لا توجد اختيارات جاهزة للفروع أو أنواع التقارير");
 const statuses=["قيد المتابعة","مفتوح","تم الحل","مؤجل"];
 const people=unique(records.map(x=>{const k=Object.keys(x.row||{}).find(k=>k.includes("مسؤول")||k.includes("متابعة"));return k?String(x.row[k]||"").trim():""}).filter(Boolean));
 const options=a=>a.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join("");
 const overlay=document.createElement("div");
 overlay.id="addRecordModal";
 overlay.style.cssText="position:fixed;inset:0;background:#10182899;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto";
 overlay.innerHTML='<section style="background:white;color:#17202a;border-radius:14px;padding:20px;width:min(620px,100%);max-height:95vh;overflow:auto;box-shadow:0 15px 50px #0003"><h2 style="margin:0 0 6px">إضافة سجل جديد</h2><p class="note">اختار الفرع ونوع التقرير من القوائم، واكتب اسم المسؤول عن المتابعة بحرية.</p><form id="newRecordForm"><label>الفرع</label><select name="branch" required>'+options(branches)+'</select><label>نوع التقرير</label><select name="sheet" required>'+options(sheets)+'</select><label>التاريخ</label><input name="date" type="date" required value="'+new Date().toISOString().slice(0,10)+'"><label>وصف السجل / المشكلة / الإجراء</label><textarea name="description" required rows="4" placeholder="اكتب التفاصيل هنا"></textarea><label>الحالة</label><select name="status" required>'+options(statuses)+'</select><label>المسؤول عن المتابعة</label><input name="owner" list="followupPeople" placeholder="اكتب اسم المسؤول عن المتابعة"><datalist id="followupPeople">'+options(people)+'</datalist><div class="row" style="margin-top:16px"><button type="button" id="cancelNewRecord">إلغاء</button><button type="submit" class="primary">حفظ السجل</button></div></form></section>';
 document.body.appendChild(overlay);
 $("cancelNewRecord").onclick=()=>overlay.remove();
 overlay.addEventListener("click",e=>{if(e.target===overlay)overlay.remove()});
 $("newRecordForm").onsubmit=async e=>{
  e.preventDefault();
  const fd=new FormData(e.currentTarget);
  const row={"التاريخ":String(fd.get("date")),"وصف المشكلة التشغيلية والحل":String(fd.get("description")).trim(),"الحالة":String(fd.get("status")),"المسؤول عن المتابعة":String(fd.get("owner")||"")};
  const submit=e.currentTarget.querySelector('button[type="submit"]');submit.disabled=true;submit.textContent="جارٍ الحفظ...";
  const {error}=await db.from("branch_records").insert({branch:String(fd.get("branch")),sheet:String(fd.get("sheet")),headers:Object.keys(row),row_data:row,created_by:user.id});
  if(error){submit.disabled=false;submit.textContent="حفظ السجل";toast("تعذر الإضافة: "+error.message)}
  else{overlay.remove();toast("تمت إضافة السجل");await refresh()}
 };
}

async function callUserAdmin(payload){
 const {data:{session},error:sessionError}=await db.auth.getSession();if(sessionError)throw new Error("تعذر التحقق من جلسة المسؤول: "+sessionError.message);if(!session)throw new Error("انتهت الجلسة، سجّل الدخول مرة أخرى");
 let response;try{response=await fetch(URL_API+"/functions/v1/manage-dashboard-users",{method:"POST",headers:{"Content-Type":"application/json","apikey":PUBLIC_KEY,"Authorization":"Bearer "+session.access_token},body:JSON.stringify(payload)})}catch(e){throw new Error("تعذر الاتصال بخدمة إنشاء المستخدمين: "+(e?.message||String(e)))}
 let result;try{result=await response.json()}catch{throw new Error("خدمة إنشاء المستخدمين رجعت ردًا غير مفهوم (HTTP "+response.status+")")}
 if(!response.ok||result?.ok===false)throw new Error(result.error||("فشلت العملية (HTTP "+response.status+")"));return result;
}
window.openUserManagement=async function(){
 if(!canManageUsers())return;
 const modal=document.createElement("div");modal.id="usersModal";modal.style.cssText="position:fixed;inset:0;background:"+(location.pathname.endsWith("/users.html")?"#f3f5f8":"#10182899")+";z-index:120;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto";
 modal.innerHTML='<section class="panel users-panel"><div class="users-heading"><div><h2>إدارة المستخدمين والصلاحيات</h2><p class="note">المستخدمون الحاليون وصلاحياتهم على الفروع.</p></div><button type="button" id="closeUsers">إغلاق</button></div><div class="users-toolbar"><h3>المستخدمون الحاليون</h3><button type="button" class="primary" id="newUserBtn">＋ إضافة مستخدم</button></div><div id="usersList">جارٍ تحميل المستخدمين...</div><hr><h3 id="userFormTitle">إضافة مستخدم جديد</h3><form id="userAdminForm"><input type="hidden" name="user_id"><label>الاسم</label><input name="display_name" required><label>البريد الإلكتروني</label><input name="email" type="email" required><div id="passwordWrap"><label>كلمة مرور مؤقتة (8 أحرف على الأقل)</label><input name="password" type="password" minlength="8" autocomplete="new-password"></div><label>الصلاحية</label><select name="role"><option value="viewer">مشاهدة فقط</option><option value="editor">محرر</option><option value="admin">مسؤول النظام</option></select><div id="branchChoices"><label>الفروع المسموح بها</label><div class="user-branch-grid" id="userBranchChecks"></div><p class="note">لو المستخدم ليس مسؤول نظام، سيشاهد الفروع المحددة فقط. يجب اختيار فرع واحد على الأقل.</p></div><div class="row"><button type="button" id="resetUserForm">مستخدم جديد / إلغاء التعديل</button><button type="submit" class="primary">حفظ المستخدم</button></div></form></section>';
 document.body.appendChild(modal);
 const form=modal.querySelector("#userAdminForm");let allUsers=[],allBranches=[];
 const optionsHtml=(users)=>users.map(u=>'<div class="user-list-row"><div class="user-list-info"><strong>'+esc(u.display_name||"بدون اسم")+'</strong><div class="muted">'+esc(u.email)+' — '+esc(roleName(u.role))+'</div><div class="user-branch-summary">'+(u.role==="admin"?"كل الفروع":esc((u.branches||[]).map(x=>x.branch+" ("+(x.access_level==="edit"?"مشاهدة وتعديل":"مشاهدة فقط")+")").join("، ")||"لا توجد فروع محددة"))+'</div></div><div class="row user-actions"><button type="button" data-user="'+esc(u.id)+'">تعديل الصلاحيات</button>'+(u.id===user?.id?"":'<button type="button" data-reset-password="'+esc(u.id)+'">تعيين كلمة مرور</button><button type="button" class="danger" data-delete-user="'+esc(u.id)+'">حذف</button>')+'</div></div>').join("")||'<p>لا يوجد مستخدمون.</p>';
 function resetForm(){form.reset();form.user_id.value="";form.email.disabled=false;form.querySelector("#passwordWrap").style.display="block";form.password.required=true;modal.querySelector("#userFormTitle").textContent="إضافة مستخدم جديد";form.querySelector("#userBranchChecks").innerHTML=allBranches.map(b=>'<div class="branch-permission"><label class="branch-check"><input type="checkbox" name="branches" value="'+esc(b)+'"> '+esc(b)+'</label><select name="access_'+esc(b)+'" aria-label="صلاحية فرع '+esc(b)+'" disabled><option value="view">مشاهدة فقط</option><option value="edit">مشاهدة وتعديل</option></select></div>').join("");form.querySelectorAll('input[name="branches"]').forEach(x=>x.onchange=()=>{const sel=form.querySelector('[name="access_'+CSS.escape(x.value)+'"]');if(sel)sel.disabled=!x.checked;});form.querySelector('[name="role"]').value="viewer";applyBranchRole();}
 function applyBranchRole(){const isAdmin=form.role.value==="admin";form.querySelector("#branchChoices").classList.toggle("hidden",isAdmin);form.querySelectorAll('input[name="branches"]').forEach(x=>x.disabled=isAdmin);}
 form.role.onchange=applyBranchRole;
 modal.querySelector("#closeUsers").textContent=location.pathname.endsWith("/users.html")?"العودة للوحة":"إغلاق";modal.querySelector("#closeUsers").onclick=()=>{if(location.pathname.endsWith("/users.html"))location.href="./index.html";else modal.remove()};
 modal.querySelector("#resetUserForm").onclick=()=>{resetForm();form.scrollIntoView({behavior:"smooth",block:"start"})};modal.querySelector("#newUserBtn").onclick=()=>{resetForm();form.scrollIntoView({behavior:"smooth",block:"start"});form.display_name.focus()};
 modal.addEventListener("click",e=>{if(e.target===modal)modal.remove()});
 try{
  const data=await callUserAdmin({action:"list"});allUsers=Array.isArray(data.users)?data.users:[];allBranches=unique([...(Array.isArray(data.branches)?data.branches:[]),...extras]);
  modal.querySelector("#usersList").innerHTML=optionsHtml(allUsers);
  modal.querySelectorAll("[data-reset-password]").forEach(btn=>btn.onclick=async()=>{const target=btn.dataset.resetPassword;const u=allUsers.find(x=>x.id===target);if(!u)return;const password=prompt("اكتب كلمة مرور مؤقتة جديدة للمستخدم "+(u.display_name||u.email)+" (8 أحرف على الأقل):");if(password===null)return;if(password.length<8)return toast("كلمة المرور يجب ألا تقل عن 8 أحرف");btn.disabled=true;try{await callUserAdmin({action:"reset_password",user_id:target,password});toast("تم تعيين كلمة المرور الجديدة. أرسلها للمستخدم بأمان.");}catch(e){toast("تعذر تعيين كلمة المرور: "+e.message)}finally{btn.disabled=false}});modal.querySelectorAll("[data-delete-user]").forEach(btn=>btn.onclick=async()=>{const target=btn.dataset.deleteUser;const u=allUsers.find(x=>x.id===target);if(!u||!confirm("حذف المستخدم "+(u.display_name||u.email)+" نهائيًا؟ لن يتم حذف سجلات الفروع."))return;btn.disabled=true;try{await callUserAdmin({action:"delete",user_id:target});toast("تم حذف المستخدم");modal.remove();await window.openUserManagement()}catch(e){toast("تعذر الحذف: "+e.message);btn.disabled=false}});modal.querySelectorAll("[data-user]").forEach(btn=>btn.onclick=()=>{const u=allUsers.find(x=>x.id===btn.dataset.user);if(!u)return;resetForm();form.user_id.value=u.id;form.display_name.value=u.display_name||"";form.email.value=u.email||"";form.email.disabled=true;form.role.value=u.role;form.password.required=false;form.password.value="";form.querySelector("#passwordWrap").style.display="none";modal.querySelector("#userFormTitle").textContent="تعديل المستخدم";form.querySelectorAll('input[name="branches"]').forEach(x=>{const a=(u.branches||[]).find(v=>v.branch===x.value);x.checked=!!a;const sel=form.querySelector('[name="access_'+CSS.escape(x.value)+'"]');if(sel){sel.disabled=!a;sel.value=a?.access_level||"view";}});applyBranchRole();});
  resetForm();
 }catch(e){modal.querySelector("#usersList").textContent=e.message;return}
 form.onsubmit=async e=>{e.preventDefault();const fd=new FormData(form);const role=String(fd.get("role"));const branches=fd.getAll("branches").map(branch=>({branch:String(branch),access_level:String(fd.get("access_"+branch)||"view")}));if(role!=="admin"&&!branches.length)return toast("اختار فرعًا واحدًا على الأقل");const payload={action:"save",user_id:String(fd.get("user_id")||"" )||null,display_name:String(fd.get("display_name")||"").trim(),email:String(fd.get("email")||"").trim(),password:String(fd.get("password")||""),role,branches};const submit=form.querySelector('button[type="submit"]');submit.disabled=true;submit.textContent="جارٍ الحفظ...";try{const saved=await callUserAdmin(payload);if(!saved?.ok||!saved?.user_id)throw new Error("الخدمة لم تؤكد حفظ المستخدم؛ لم يتم اعتبار العملية ناجحة.");toast("تم إنشاء الحساب وحفظ الصلاحيات");const refreshed=await callUserAdmin({action:"list"});allUsers=Array.isArray(refreshed.users)?refreshed.users:[];allBranches=unique([...(Array.isArray(refreshed.branches)?refreshed.branches:[]),...extras]);modal.querySelector("#usersList").innerHTML=optionsHtml(allUsers);modal.querySelectorAll("[data-user]").forEach(btn=>btn.onclick=()=>{const u=allUsers.find(x=>x.id===btn.dataset.user);if(!u)return;resetForm();form.user_id.value=u.id;form.display_name.value=u.display_name||"";form.email.value=u.email||"";form.email.disabled=true;form.role.value=u.role;form.password.required=false;form.password.value="";form.querySelector("#passwordWrap").style.display="none";modal.querySelector("#userFormTitle").textContent="تعديل المستخدم";form.querySelectorAll('input[name="branches"]').forEach(x=>{const a=(u.branches||[]).find(v=>v.branch===x.value);x.checked=!!a;const sel=form.querySelector('[name="access_'+CSS.escape(x.value)+'"]');if(sel){sel.disabled=!a;sel.value=a?.access_level||"view";}});applyBranchRole();});form.reset();form.user_id.value="";form.email.disabled=false;form.password.required=true;form.querySelector("#passwordWrap").style.display="block";modal.querySelector("#userFormTitle").textContent="إضافة مستخدم جديد";resetForm();}catch(err){toast("لم يتم حفظ المستخدم: "+(err?.message||String(err)))}finally{submit.disabled=false;submit.textContent="حفظ المستخدم"}};
 form.querySelector('button[type="submit"]').type="button";form.querySelector('button[type="button"].primary').addEventListener("click",e=>{e.preventDefault();form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}))});
};

async function importJson(){if(profile.role!=="admin")return toast("الاستيراد متاح لمسؤول النظام فقط");if(records.length&&!confirm("قاعدة البيانات تحتوي بالفعل على "+records.length+" سجل. هل تريد إضافة البيانات مرة أخرى؟"))return;const f=$("importFile").files[0];if(!f)return toast("اختار ملف التقارير_الأصلية.json أولًا");try{const data=JSON.parse(await f.text());if(!Array.isArray(data))throw new Error("صيغة الملف غير صحيحة");const rows=data.map(x=>({branch:x.branch||"غير محدد",sheet:x.sheet||"عام",headers:x.headers||Object.keys(x.row||{}),row_data:x.row||x.row_data||{},created_by:user.id}));for(let i=0;i<rows.length;i+=100){const {error}=await db.from("branch_records").insert(rows.slice(i,i+100));if(error)throw error}toast("تم استيراد "+rows.length+" سجل");await refresh()}catch(e){toast("فشل الاستيراد: "+e.message)}}
function exportCsv(){const a=filtered();if(!a.length)return toast("لا توجد بيانات للتصدير");const hs=unique(a.flatMap(x=>x.headers));const rows=[["الفرع","نوع التقرير",...hs],...a.map(x=>[x.branch,x.sheet,...hs.map(h=>x.row[h]||"")])];const csv="\ufeff"+rows.map(r=>r.map(v=>'"'+String(v??"").replaceAll('"','""')+'"').join(",")).join("\r\n");const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),el=document.createElement("a");el.href=url;el.download="تقرير_الفروع.csv";el.click();URL.revokeObjectURL(url)}
let uiLanguage="ar";
const englishText=new Map([
 ["تسجيل الدخول","Sign in"],["لوحة متابعة الفروع","Branch Follow-up Dashboard"],
 ["حساب مستقل لكل مدير — جميع الفروع في قاعدة بيانات مشتركة.","Separate account for each manager — all branches share one database."],
 ["البريد الإلكتروني","Email"],["كلمة المرور","Password"],["دخول","Sign in"],
 ["جارٍ تسجيل الدخول...","Signing in..."],["تسجيل الخروج","Sign out"],
 ["تحديثات مشتركة مباشرة — مودز وبروكلينز","Live shared updates — Moodz & Brooklyn’s"],
 ["الفرع","Branch"],["نوع التقرير","Report type"],["الحالة","Status"],["بحث","Search"],
 ["ابحث في البيانات...","Search records..."],["ملخص الفرع","Branch summary"],
 ["＋ إضافة سجل","＋ Add record"],["استيراد التقارير الأصلية (JSON)","Import original reports (JSON)"],
 ["استيراد الملف","Import file"],["تصدير CSV","Export CSV"],
 ["الأدوار: مسؤول النظام (إضافة/تعديل/حذف)، محرر (إضافة/تعديل)، عرض فقط (مشاهدة). لا ترفع ملف التقارير الأصلية أكثر من مرة.","Roles: Admin (add/edit/delete), Editor (add/edit), Viewer (read-only). Do not import the original report file more than once."],
 ["كل الفروع","All branches"],["كل التقارير","All reports"],["كل الحالات","All statuses"],
 ["إجمالي السجلات","Total records"],["قيد المتابعة / مفتوح","Pending / Open"],
 ["تم الحل","Resolved"],["بدون مسؤول محدد","No owner assigned"],["عرض ","Showing "],
 [" من "," of "],[" سجل"," records"],["＋ إضافة سجل جديد","＋ Add new record"],
 ["إلغاء","Cancel"],["حفظ السجل","Save record"],["جارٍ الحفظ...","Saving..."],
 ["وصف السجل / المشكلة / الإجراء","Record / issue / action description"],
 ["المسؤول عن المتابعة","Assigned to"],["غير محدد","Unassigned"],
 ["التاريخ","Date"],["لا توجد بيانات للتصدير","No data to export"],
 ["اختار ملف التقارير_الأصلية.json أولًا","Choose the original reports JSON file first"],
 ["تم حفظ التعديلات ومزامنتها","Changes saved and synced"],["تمت إضافة السجل","Record added"]
]);
function applyLanguage(){
 const en=uiLanguage==="en";
 document.documentElement.lang=en?"en":"ar";
 document.documentElement.dir=en?"ltr":"rtl";
 document.body.style.direction=en?"ltr":"rtl";
 const toggle=$("languageToggle");if(toggle)toggle.textContent=en?"العربية":"English";
 const map=en?englishText:new Map([...englishText].map(([ar,eng])=>[eng,ar]));
 document.querySelectorAll("h1,h2,h3,p,label,button,span,option").forEach(el=>{
   if(el.children.length===0){const v=el.textContent; if(map.has(v))el.textContent=map.get(v);}
 });
 const search=$("search");if(search)search.placeholder=en?"Search records...":"ابحث في البيانات...";
 const desc=document.querySelector('#newRecordForm textarea[name="description"]');if(desc)desc.placeholder=en?"Enter details here":"اكتب التفاصيل هنا";
 document.querySelectorAll("#newRecordForm label").forEach(el=>{if(en){if(el.textContent==="وصف السجل / المشكلة / الإجراء")el.textContent="Record / issue / action description";if(el.textContent==="المسؤول عن المتابعة")el.textContent="Assigned to";if(el.textContent==="التاريخ")el.textContent="Date";if(el.textContent==="الفرع")el.textContent="Branch";if(el.textContent==="نوع التقرير")el.textContent="Report type";if(el.textContent==="الحالة")el.textContent="Status";}else{const back=new Map([...englishText].map(([a,b])=>[b,a]));if(back.has(el.textContent))el.textContent=back.get(el.textContent);}});
}
window.toggleLanguage=function(){uiLanguage=uiLanguage==="ar"?"en":"ar";applyLanguage();};



start();
applyLanguage();
