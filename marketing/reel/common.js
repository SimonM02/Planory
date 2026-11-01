// Gemeinsame Bausteine der Planory-Reels (Easing, Text-Animation, Logo, Handy-Rahmen).
// ---------- helpers ----------
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const lerp=(a,b,t)=>a+(b-a)*t;
const p=(t,a,b)=>clamp((t-a)/(b-a));
const E={
  outExpo:x=>x>=1?1:1-Math.pow(2,-10*x),
  inExpo:x=>x<=0?0:Math.pow(2,10*x-10),
  outCubic:x=>1-Math.pow(1-x,3),
  inCubic:x=>x*x*x,
  inOutCubic:x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2,
  inOutExpo:x=>x<=0?0:x>=1?1:x<.5?Math.pow(2,20*x-10)/2:(2-Math.pow(2,-20*x+10))/2,
  outQuint:x=>1-Math.pow(1-x,5),
  outBack:(x,s=1.70158)=>1+(s+1)*Math.pow(x-1,3)+s*Math.pow(x-1,2),
  inBack:(x,s=1.70158)=>(s+1)*x*x*x-s*x*x,
  outBounce:x=>{const n=7.5625,d=2.75;if(x<1/d)return n*x*x;if(x<2/d)return n*(x-=1.5/d)*x+.75;if(x<2.5/d)return n*(x-=2.25/d)*x+.9375;return n*(x-=2.625/d)*x+.984375}
};
// damped spring 0->1, x in seconds
const spring=(x,f=2.2,d=7)=>x<=0?0:1-Math.exp(-d*x)*Math.cos(f*2*Math.PI*x);
const $=id=>document.getElementById(id);
function rnd(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
const vis=(el,on)=>{el.style.visibility=on?(el.classList.contains('scene')?'visible':'inherit'):'hidden'};
function reveal(el,t,t0,dur=.62,out){
  const s=el.firstElementChild, q=E.outExpo(p(t,t0,t0+dur));
  let y=(1-q)*118, r=(1-q)*7;
  if(out){const o=E.inExpo(p(t,out,out+.32));y-=o*118;}
  s.style.transform=`translateY(${y}%) rotate(${r}deg)`;
}
const fmt=n=>'€ '+Math.round(n).toLocaleString('de-DE');

// ---------- logo ----------
function logoSVG(){return `<svg viewBox="0 0 100 100" width="100%" height="100%" style="overflow:visible">
 <rect class="lg-bg" width="100" height="100" rx="24" fill="#121826" stroke="rgba(255,255,255,.10)" stroke-width=".6"/>
 <rect x="42" y="8.5" width="16" height="4" rx="2" fill="#222b3c"/><rect x="40" y="90" width="20" height="2.6" rx="1.3" fill="#2a3446"/>
 <g class="lg-k" stroke="#ff9f1c" stroke-width="1.35" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <path pathLength="1" d="M79.5 84 V26 M83 84 V26"/>
  <path pathLength="1" d="M79.5 82 L83 79 L79.5 76 L83 73 L79.5 70 L83 67 L79.5 64 L83 61 L79.5 58 L83 55 L79.5 52 L83 49 L79.5 46 L83 43 L79.5 40 L83 37 L79.5 34 L83 31 L79.5 28"/>
  <path pathLength="1" d="M76 84 H86.5"/><path pathLength="1" d="M79.5 26 L81.25 19 L83 26"/>
  <path pathLength="1" d="M83 26 H32"/><path pathLength="1" d="M79.5 29.5 H37"/>
  <path pathLength="1" d="M79 29.5 L72 26 L65 29.5 L58 26 L51 29.5 L44 26 L37 29.5 L32 26"/>
  <path pathLength="1" d="M81.25 19 L48 26 M81.25 19 L60 26 M81.25 19 L72 26 M81.25 19 L89 26"/>
  <path pathLength="1" d="M83 26 H90"/><path pathLength="1" d="M48 29.5 V34"/>
 </g>
 <g class="lg-kt" style="transform-box:fill-box;transform-origin:50% 50%"><rect x="86.5" y="26.3" width="4.4" height="5.4" rx=".8" fill="#ff9f1c"/><circle cx="48" cy="29.5" r="1.1" fill="#ff9f1c"/></g>
 <g class="lg-h" style="transform-box:fill-box;transform-origin:50% 100%"><rect x="20" y="56" width="30" height="28" fill="#fff"/><rect x="50" y="69" width="20" height="15" fill="#fff"/></g>
 <g class="lg-d" style="transform-box:fill-box;transform-origin:50% 50%"><rect x="48" y="66" width="24" height="3.5" rx="1" fill="#ff9f1c"/><rect x="52.5" y="72" width="15" height="12" fill="#121826"/>
  <rect x="24" y="72" width="9" height="12" fill="#121826"/><rect x="38" y="62" width="8" height="8" fill="#ff9f1c"/></g>
 <path class="lg-r" d="M15 56 L35 44 L55 56 Z" fill="#ff9f1c"/>
</svg>`}
function buildLogo(root,lt){
  const ks=root.querySelectorAll('.lg-k path');
  ks.forEach((pa,i)=>{const q=E.outCubic(p(lt,.04+i*.045,.04+i*.045+.34));pa.style.strokeDasharray='1 1';pa.style.strokeDashoffset=1-q;pa.style.opacity=q>0?1:0});
  const kt=root.querySelector('.lg-kt');kt.style.transform=`scale(${Math.max(0,E.outBack(p(lt,.55,.75),3))})`;
  const h=root.querySelector('.lg-h');h.style.transform=`scaleY(${Math.max(0,E.outBack(p(lt,.42,.78),2.2))})`;
  const d=root.querySelector('.lg-d');const dq=p(lt,.74,.94);d.style.opacity=dq;d.style.transform=`scale(${.6+.4*E.outBack(dq,3)})`;
  const r=root.querySelector('.lg-r');const rq=p(lt,.8,1.2);r.style.opacity=rq>0?1:0;r.style.transform=`translateY(${-46*(1-E.outBounce(rq))}px)`;
}
// ---------- phone ----------
function phone(id,src,sw){
  const B=Math.round(sw*.032),W=sw+2*B,SH=Math.round(sw*2.165),H=SH+2*B,R=Math.round(W*.152),sb=Math.round(sw*.125);
  const f=Math.round(sw*.044);
  return `<div class="phone" id="${id}" style="left:0;top:0;width:${W}px;height:${H}px;border-radius:${R}px;padding:${B}px">
   <div class="screen" style="border-radius:${R-B}px">
    <div class="scroll" id="${id}s" style="top:${sb}px"><img src="${src}" style="width:${sw}px"></div>
    <div class="sbar" style="height:${sb}px;font-size:${f}px;padding:${Math.round(sw*.012)}px ${Math.round(sw*.085)}px 0">
      <span style="letter-spacing:-.01em">9:41</span>
      <span class="island" style="width:${Math.round(sw*.31)}px;height:${Math.round(sw*.09)}px;top:${Math.round(sw*.026)}px"></span>
      <span style="display:flex;gap:${Math.round(sw*.014)}px;align-items:center">
        <svg viewBox="0 0 18 12" width="${f}" height="${Math.round(f*.66)}"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
        <svg viewBox="0 0 16 12" width="${f}" height="${Math.round(f*.72)}"><path d="M8 11.5 L5.6 9 a3.4 3.4 0 0 1 4.8 0z M2.8 6.3 a7.4 7.4 0 0 1 10.4 0 L11.8 7.7 a5.4 5.4 0 0 0 -7.6 0z M0 3.5 a11.3 11.3 0 0 1 16 0 L14.6 4.9 a9.3 9.3 0 0 0 -13.2 0z"/></svg>
        <svg viewBox="0 0 27 13" width="${Math.round(f*1.5)}" height="${Math.round(f*.72)}"><rect x=".5" y=".5" width="23" height="12" rx="3.6" fill="none" stroke="#000" stroke-opacity=".4"/><rect x="2.3" y="2.3" width="17" height="8.4" rx="2"/><path d="M25 4.5 v4 a2 2 0 0 0 0 -4z" fill-opacity=".45"/></svg>
      </span>
    </div>
    <div class="glare" id="${id}g"></div>
   </div></div>`;
}
const PH={};
function placePhone(id,{x,y,s=1,rx=0,ry=0,rz=0}){const el=PH[id];el.style.transform=`translate(${x}px,${y}px) perspective(2600px) rotateY(${ry}deg) rotateX(${rx}deg) rotateZ(${rz}deg) scale(${s})`}

