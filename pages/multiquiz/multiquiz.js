// MultiQuiz tiny loader (gzip payloads in same directory)
(async function(){
  async function load(path){
    const r = await fetch(path + '?t=' + Date.now(), {cache:'no-store'});
    if(!r.ok) throw new Error(path + ' HTTP ' + r.status);
    return r.text();
  }
  function b64ToU8(b64){const bin=atob(b64);const u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);return u8;}
  async function gunzip(b64){
    const ds = new DecompressionStream('gzip');
    const stream = new Blob([b64ToU8(b64)]).stream().pipeThrough(ds);
    return await new Response(stream).text();
  }
  function inj(t){const s=document.createElement('script');s.textContent=t;document.head.appendChild(s);}
  try {
    inj(await gunzip(await load('payload_mq.b64')));
    inj(await gunzip(await load('payload_so.b64')));
  } catch(e) {
    console.error(e);
    const el=document.getElementById('errorMessage');
    if(el){el.textContent='MultiQuiz load failed: '+e.message;el.classList.remove('hidden');}
  }
})();
