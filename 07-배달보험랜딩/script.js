(()=>{
const SUPABASE_URL='https://pzlxrlkvbrufhimyglyo.supabase.co';
const SUPABASE_KEY='sb_publishable_WE6jk24ys0guHE1INCZv-w_cmd-HqOd';
const form=document.getElementById('leadForm');
const phone=document.getElementById('phone');
const statusBox=document.getElementById('status');
const btn=document.getElementById('submitBtn');
const formArea=document.getElementById('formArea');
const success=document.getElementById('success');

phone.addEventListener('input',function(){
 let n=this.value.replace(/\D/g,'').slice(0,11);
 if(n.length>7)this.value=n.replace(/(\d{3})(\d{4})(\d{1,4})/,'$1-$2-$3');
 else if(n.length>3)this.value=n.replace(/(\d{3})(\d{1,4})/,'$1-$2');
 else this.value=n;
});

form.addEventListener('submit',async e=>{
 e.preventDefault();
 if(!form.reportValidity())return;
 if(!document.getElementById('agree').checked){alert('개인정보 수집 및 이용에 동의해주세요.');return;}
 if(!/^010-\d{4}-\d{4}$/.test(phone.value)){statusBox.textContent='연락처를 010-0000-0000 형식으로 입력해주세요.';phone.focus();return;}
 const old=btn.textContent;btn.disabled=true;btn.textContent='접수 중...';statusBox.textContent='';
 const fd=new FormData(form);
 const payload={
   name:String(fd.get('name')||'').trim(),
   phone:String(fd.get('phone')||'').trim(),
   age_group:String(fd.get('age_group')||''),
   status:'신규',
   source:'배달보험 랜딩페이지 2번',
   available_time:'',
   interest:String(fd.get('interest')||''),
   memo:'배달보험 랜딩페이지 2번 상담 신청',
   message:''
 };
 try{
   const r=await fetch(SUPABASE_URL+'/rest/v1/customers',{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(payload)});
   if(!r.ok)throw new Error(await r.text());
   form.reset();formArea.style.display='none';success.classList.add('show');document.getElementById('apply').scrollIntoView({behavior:'smooth',block:'start'});
 }catch(err){console.error(err);statusBox.textContent='접수에 실패했습니다. 카카오톡으로 문의해주세요.';}
 finally{btn.disabled=false;btn.textContent=old;}
});
})();
