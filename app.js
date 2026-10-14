
const URL_API="https://yogsjsqctpnmhhsjxcfm.supabase.co";
const PUBLIC_KEY="sb_publishable_0HWgGuV4SkfFXlIbFdRsBw_5R-mLz3H";
const db=window.supabase.createClient(URL_API,PUBLIC_KEY);
const extras=["توفي","كوربة"];
let user=null,profile=null,records=[],channel=null;
const $=id=>document.getElementById(id);
function toast(s){$("toast").textContent=s;$("toast").classList.remove("hidden");setTimeout(()=>$("toast").classList.add("hidden"),3500)}
function esc(s){return String(s==null?"":s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}
function canEdit(){return profile&&["admin","editor"].includes(profile.role)}
function canDelete(){return profile&&profile.role==="admin"}
function roleName(r){return ({admin:"مسؤول النظام",editor:"محرر",viewer:"عرض فقط"})[r]||r}
window.signIn=async function signIn(){try{const email=$("email").value.trim(),password=$("password").value;if(!email||!password)return toast("اكتب البريد وكلمة المرور");const btn=document.querySelector("#login button.primary");if(btn){btn.disabled=true;btn.textContent="جارٍ تسجيل الدخول..."}const {data,error}=await db.auth.signInWithPassword({email,password});if(error)toast("تعذر الدخول: "+error.message);else if(data.user){user=data.user;await load()}}catch(e){toast("خطأ أثناء الدخول: "+(e?.message||String(e)))}finally{const btn=document.querySelector("#login button.primary");if(btn){btn.disabled=false;btn.textContent="دخول"}}};
async function signOut(){if(channel)await db.removeChannel(channel);await db.auth.signOut();location.reload()}
async function start(){const {data:{session}}=await db.auth.getSession();if(session){user=session.user;await load()}db.auth.onAuthStateChange((event,s)=>{if(event==="SIGNED_IN"&&s){user=s.user;load()}if(event==="SIGNED_OUT")location.reload()})}
async function load(){try{const p=await db.from("profiles").select("role,display_name").eq("id",user.id).single();if(p.error)throw new Error("الحساب موجود لكن لم تُحدد له صلاحية في profiles. اطلب من المسؤول إكمال الإعداد.");profile=p.data;await refresh();$("login").classList.add("hidden");$("app").classList.remove("hidden");$("who").textContent=(profile.display_name||user.email)+" — "+roleName(profile.role);$("add").disabled=!canEdit();if(channel)db.removeChannel(channel);channel=db.channel("records-live").on("postgres_changes",{event:"*",schema:"public",table:"branch_records"},refresh).subscribe()}catch(e){toast(e.message||String(e))}}
async function refresh(){const {data,error}=await db.from("branch_records").select("*").order("created_at",{ascending:true});if(error)throw error;records=(data||[]).map(x=>({id:x.id,branch:x.branch,sheet:x.sheet,headers:x.headers||[],row:x.row_data||{},created_at:x.created_at}));fillFilters();render()}
function unique(a){return [...new Set(a)]}
function fillFilters(){const bs=unique([...records.map(x=>x.branch),...extras]),ss=unique(records.map(x=>x.sheet));const oldB=$("branch").value,oldS=$("sheet").value;$("branch").innerHTML='<option value="">كل الفروع</option>'+bs.map(x=>'<option>'+esc(x)+'</option>').join("");$("sheet").innerHTML='<option value="">كل التقارير</option>'+ss.map(x=>'<option>'+esc(x)+'</option>').join("");$("branch").value=bs.includes(oldB)?oldB:"";$("sheet").value=ss.includes(oldS)?oldS:""}
function filtered(){const b=$("branch").value,s=$("sheet").value,st=$("status").value,q=$("search").value.toLowerCase().trim();return records.filter(x=>(!b||x.branch===b)&&(!s||x.sheet===s)&&(!st||String(x.row["الحالة"]||"").includes(st))&&(!q||[x.branch,x.sheet,...Object.values(x.row)].some(v=>String(v||"").toLowerCase().includes(q))))}
function statsHtml(a){const pending=a.filter(x=>{const s=String(x.row["الحالة"]||"");return s.includes("متابعة")||s.includes("مفتوح")||s==="?"||!s}).length;const done=a.filter(x=>String(x.row["الحالة"]||"").includes("تم الحل")).length;const noOwner=a.filter(x=>{const k=Object.keys(x.row).find(k=>k.includes("مسؤول"));return !k||!String(x.row[k]||"").trim()||String(x.row[k]).trim()==="?"}).length;return '<div class="stat"><span>إجمالي السجلات</span><strong>'+a.length+'</strong></div><div class="stat"><span>قيد المتابعة / مفتوح</span><strong>'+pending+'</strong></div><div class="stat"><span>تم الحل</span><strong>'+done+'</strong></div><div class="stat"><span>بدون مسؤول محدد</span><strong>'+noOwner+'</strong></div>'}
function render(){
 const a=filtered();$("stats").innerHTML=statsHtml(a);
 const b=$("branch").value,ba=records.filter(x=>!b||x.branch===b);$("summary").innerHTML=statsHtml(ba);
 const bs=unique([...records.map(x=>x.branch),...extras]);
 $("summaryTabs").innerHTML='<button class="tab '+(!b?'active':'')+'" onclick="selectBranchIndex(-1)">كل الفروع</button>'+bs.map((x,i)=>'<button class="tab '+(x===b?'active':'')+'" onclick="selectBranchIndex('+i+')">'+esc(x)+'</button>').join("");
 $("count").textContent="عرض "+a.length+" من "+records.length+" سجل";
 $("records").innerHTML=a.map(x=>{
   const fields=x.headers.map(h=>{
     const label='<label>'+esc(h)+'</label>';
     const attr=' data-id="'+esc(x.id)+'" data-key="'+esc(h)+'"';
     if(canEdit()&&h==="الحالة")return '<div class="field">'+label+'<select'+attr+' onchange="changeField(this.dataset.id,this.dataset.key,this.value)">'+["قيد المتابعة","تم الحل","مفتوح","مؤجل"].map(v=>'<option '+(String(x.row[h]||"")===v?"selected":"")+'>'+v+'</option>').join("")+'</select></div>';
     if(canEdit())return '<div class="field">'+label+'<textarea'+attr+' onchange="changeField(this.dataset.id,this.dataset.key,this.value)">'+esc(x.row[h])+'</textarea></div>';
     return '<div class="field">'+label+'<div>'+esc(x.row[h])+'</div></div>';
   }).join("");
   return '<article class="record"><h3>'+esc(x.branch)+' — '+esc(x.sheet)+'</h3>'+fields+'<div class="row">'+(canEdit()?'<button class="primary" data-id="'+esc(x.id)+'" onclick="saveCard(this.dataset.id)">حفظ التعديلات</button>':'')+(canDelete()?'<button class="danger" data-id="'+esc(x.id)+'" onclick="deleteRecord(this.dataset.id)">حذف</button>':'')+'</div></article>';
 }).join("");
 applyLanguage();
}
function selectBranchIndex(i){const bs=unique([...records.map(x=>x.branch),...extras]);$("branch").value=i<0?"":(bs[i]||"");render()}
function changeField(id,h,v){const x=records.find(r=>r.id===id);if(x)x.row[h]=v}
async function saveCard(id){if(!canEdit())return;const x=records.find(r=>r.id===id);const {error}=await db.from("branch_records").update({branch:x.branch,sheet:x.sheet,headers:x.headers,row_data:x.row}).eq("id",id);if(error)toast("فشل الحفظ: "+error.message);else toast("تم حفظ التعديلات ومزامنتها")}
async function deleteRecord(id){if(!canDelete()||!confirm("حذف السجل نهائيًا؟"))return;const {error}=await db.from("branch_records").delete().eq("id",id);if(error)toast("فشل الحذف: "+error.message);else{toast("تم الحذف");await refresh()}}
async function addRecord(){
 if(!canEdit())return;
 const branches=unique([...records.map(x=>x.branch).filter(Boolean),...extras]);
 const sheets=unique(records.map(x=>x.sheet).filter(Boolean));
 if(!branches.length||!sheets.length)return toast("لا توجد اختيارات جاهزة للفروع أو أنواع التقارير");
 const statuses=["قيد المتابعة","مفتوح","تم الحل","مؤجل"];
 const people=unique(records.map(x=>{const k=Object.keys(x.row||{}).find(k=>k.includes("مسؤول")||k.includes("متابعة"));return k?String(x.row[k]||"").trim():""}).filter(Boolean));
 const options=a=>a.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join("");
 const overlay=document.createElement("div");
 overlay.id="addRecordModal";
 overlay.style.cssText="position:fixed;inset:0;background:#10182899;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto";
 overlay.innerHTML='<section style="background:white;color:#17202a;border-radius:14px;padding:20px;width:min(620px,100%);max-height:95vh;overflow:auto;box-shadow:0 15px 50px #0003"><h2 style="margin:0 0 6px">إضافة سجل جديد</h2><p class="note">اختار من القوائم بدل ما تكتب أسماء الفروع أو أنواع التقارير.</p><form id="newRecordForm"><label>الفرع</label><select name="branch" required>'+options(branches)+'</select><label>نوع التقرير</label><select name="sheet" required>'+options(sheets)+'</select><label>Task</label><input name="task" type="text" placeholder="Enter task" required><label>التاريخ</label><input name="date" type="date" required value="'+new Date().toISOString().slice(0,10)+'"><label>وصف السجل / المشكلة / الإجراء</label><textarea name="description" required rows="4" placeholder="اكتب التفاصيل هنا"></textarea><label>الحالة</label><select name="status" required>'+options(statuses)+'</select><label>المسؤول عن المتابعة</label><select name="owner"><option value="">غير محدد</option>'+options(people)+'</select><div class="row" style="margin-top:16px"><button type="button" id="cancelNewRecord">إلغاء</button><button type="submit" class="primary">حفظ السجل</button></div></form></section>';
 document.body.appendChild(overlay);
 $("cancelNewRecord").onclick=()=>overlay.remove();
 overlay.addEventListener("click",e=>{if(e.target===overlay)overlay.remove()});
 $("newRecordForm").onsubmit=async e=>{
  e.preventDefault();
  const fd=new FormData(e.currentTarget);
  const row={"Task":String(fd.get("task")||"").trim(),"التاريخ":String(fd.get("date")),"وصف المشكلة التشغيلية والحل":String(fd.get("description")).trim(),"الحالة":String(fd.get("status")),"المسؤول عن المتابعة":String(fd.get("owner")||"")};
  const submit=e.currentTarget.querySelector('button[type="submit"]');submit.disabled=true;submit.textContent="جارٍ الحفظ...";
  const {error}=await db.from("branch_records").insert({branch:String(fd.get("branch")),sheet:String(fd.get("sheet")),headers:Object.keys(row),row_data:row,created_by:user.id});
  if(error){submit.disabled=false;submit.textContent="حفظ السجل";toast("تعذر الإضافة: "+error.message)}
  else{overlay.remove();toast("تمت إضافة السجل");await refresh()}
 };
}
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
