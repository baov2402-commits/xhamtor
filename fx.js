// Mưa ký tự code kiểu "hacker" – rơi chậm, dịu mắt. Ký tự lấy từ công thức Vật lí 7.
(function(){
  const cv=document.createElement("canvas");cv.id="rain";document.body.prepend(cv);
  const ctx=cv.getContext("2d");
  const TOK="v=s/t 01 Hz dB N S i=i' km/h m/s 3,6 1/15 20000 λ ∆ Φ B ⚡ ☀ { } < > / = + 0 1 0 1 ア イ ウ エ".split(" ").join("").split("");
  const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W,H,cols,drops,fs=16;
  function rs(){W=cv.width=innerWidth;H=cv.height=innerHeight;cols=Math.ceil(W/fs);drops=Array.from({length:cols},()=>Math.random()*-H/fs)}
  addEventListener("resize",rs);rs();
  let last=0;
  function draw(t){requestAnimationFrame(draw);if(t-last<70)return;last=t;
    ctx.fillStyle="rgba(2,10,6,0.12)";ctx.fillRect(0,0,W,H);
    ctx.font=fs+"px JetBrains Mono, monospace";
    for(let i=0;i<cols;i++){
      const ch=TOK[Math.random()*TOK.length|0],y=drops[i]*fs;
      ctx.fillStyle=Math.random()<.04?"#d8ffe6":(i%3?"#00ff88":"#3df0ff");
      ctx.fillText(ch,i*fs,y);
      if(y>H&&Math.random()>.975)drops[i]=0;
      drops[i]+=.55;
    }
  }
  if(!reduce)requestAnimationFrame(draw);
  // Gõ chữ kiểu terminal: typeLines(el, ["dòng 1","dòng 2"])
  window.typeLines=function(el,lines,speed=18){if(!el)return;el.textContent="";let i=0,j=0;
    (function step(){if(!el.isConnected||i>=lines.length)return;if(j<=lines[i].length){el.textContent=lines.slice(0,i).join("\n")+(i?"\n":"")+lines[i].slice(0,j)+"▌";j++;setTimeout(step,speed)}
    else{i++;j=0;setTimeout(step,180)}})()};
})();
