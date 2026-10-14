
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
async function signIn(){const email=$("email").value.trim(),password=$("password").value;if(!email||!password)return toast("اكتب البريد وكلمة المرور");const {error}=await db.auth.signInWithPassword({email,password});if(error)toast("تعذر الدخول: "+error.message)}
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
}
function selectBranchIndex(i){const bs=unique([...records.map(x=>x.branch),...extras]);$("branch").value=i<0?"":(bs[i]||"");render()}
function changeField(id,h,v){const x=records.find(r=>r.id===id);if(x)x.row[h]=v}
async function saveCard(id){if(!canEdit())return;const x=records.find(r=>r.id===id);const {error}=await db.from("branch_records").update({branch:x.branch,sheet:x.sheet,headers:x.headers,row_data:x.row}).eq("id",id);if(error)toast("فشل الحفظ: "+error.message);else toast("تم حفظ التعديلات ومزامنتها")}
async function deleteRecord(id){if(!canDelete()||!confirm("حذف السجل نهائيًا؟"))return;const {error}=await db.from("branch_records").delete().eq("id",id);if(error)toast("فشل الحذف: "+error.message);else{toast("تم الحذف");await refresh()}}
async function addRecord(){if(!canEdit())return;const branch=prompt("اسم الفرع:","توفي");if(!branch)return;const sheet=prompt("نوع التقرير:","مشاكل تشغيلية");if(!sheet)return;const desc=prompt("وصف المشكلة أو السجل:","");if(desc===null)return;const row={"التاريخ":new Date().toISOString().slice(0,10),"وصف المشكلة التشغيلية والحل":desc,"الحالة":"قيد المتابعة","المسؤول عن المتابعة":""};const {error}=await db.from("branch_records").insert({branch,sheet,headers:Object.keys(row),row_data:row,created_by:user.id});if(error)toast("تعذر الإضافة: "+error.message);else{toast("تمت إضافة السجل");await refresh()}}
async function importJson(){if(profile.role!=="admin")return toast("الاستيراد متاح لمسؤول النظام فقط");if(records.length&&!confirm("قاعدة البيانات تحتوي بالفعل على "+records.length+" سجل. هل تريد إضافة البيانات مرة أخرى؟"))return;const f=$("importFile").files[0];if(!f)return toast("اختار ملف التقارير_الأصلية.json أولًا");try{const data=JSON.parse(await f.text());if(!Array.isArray(data))throw new Error("صيغة الملف غير صحيحة");const rows=data.map(x=>({branch:x.branch||"غير محدد",sheet:x.sheet||"عام",headers:x.headers||Object.keys(x.row||{}),row_data:x.row||x.row_data||{},created_by:user.id}));for(let i=0;i<rows.length;i+=100){const {error}=await db.from("branch_records").insert(rows.slice(i,i+100));if(error)throw error}toast("تم استيراد "+rows.length+" سجل");await refresh()}catch(e){toast("فشل الاستيراد: "+e.message)}}
function exportCsv(){const a=filtered();if(!a.length)return toast("لا توجد بيانات للتصدير");const hs=unique(a.flatMap(x=>x.headers));const rows=[["الفرع","نوع التقرير",...hs],...a.map(x=>[x.branch,x.sheet,...hs.map(h=>x.row[h]||"")])];const csv="\ufeff"+rows.map(r=>r.map(v=>'"'+String(v??"").replaceAll('"','""')+'"').join(",")).join("\r\n");const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),el=document.createElement("a");el.href=url;el.download="تقرير_الفروع.csv";el.click();URL.revokeObjectURL(url)}
start();
