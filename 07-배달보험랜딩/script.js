(() => {
const SUPABASE_URL='https://pzlxrlkvbrufhimyglyo.supabase.co';
const SUPABASE_KEY='sb_publishable_WE6jk24ys0guHE1INCZv-w_cmd-HqOd';
const form=document.getElementById('leadForm');
const phone=document.getElementById('phone');
const statusBox=document.getElementById('status');
const completion=document.getElementById('completion');
const closeComplete=document.getElementById('closeComplete');

phone.addEventListener('input',function(){
 let n=this.value.replace(/\D/g,'').slice(0,11);
 if(n.length>7)this.value=n.replace(/(\d{3})(\d{4})(\d{1,4})/,'$1-$2-$3');
 else if(n.length>3)this.value=n.replace(/(\d{3})(\d{1,4})/,'$1-$2');
 else this.value=n;
});

function closeModal(){
 completion.classList.remove('show');
 document.body.style.removeProperty('overflow');
 window.scrollTo({top:0,behavior:'smooth'});
}
closeComplete.addEventListener('click',closeModal);
completion.addEventListener('click',e=>{if(e.target===completion)closeModal()});

form.addEventListener('submit',async e=>{
 e.preventDefault();
 if(!form.reportValidity())return;
 const btn=document.getElementById('submitBtn');
 const old=btn.textContent;
 btn.disabled=true; btn.textContent='접수 중...'; statusBox.className='status'; statusBox.textContent='';
 const fd=new FormData(form);
 const msg=(fd.get('message')||'').toString().trim();
 const payload={
   name:(fd.get('name')||'').toString().trim(),
   phone:(fd.get('phone')||'').toString().trim(),
   age_group:(fd.get('age_group')||'').toString(),
   status:'신규',
   source:'배달보험 랜딩페이지',
   available_time:(fd.get('available_time')||'').toString(),
   interest:(fd.get('interest')||'').toString(),
   memo:msg||'배달보험 랜딩페이지 상담 신청',
   message:msg
 };
 try{
   const r=await fetch(SUPABASE_URL+'/rest/v1/customers',{
     method:'POST',
     headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY,'Content-Type':'application/json',Prefer:'return=minimal'},
     body:JSON.stringify(payload)
   });
   if(!r.ok)throw new Error(await r.text());
   form.reset();
   completion.classList.add('show');
   document.body.style.overflow='hidden';
   window.scrollTo(0,0);
 }catch(err){
   console.error(err);
   statusBox.textContent='접수에 실패했습니다. 카카오톡으로 문의해주세요.';
   statusBox.className='status err';
 }finally{
   btn.disabled=false; btn.textContent=old;
 }
});
})();