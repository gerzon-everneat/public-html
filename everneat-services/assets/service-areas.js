/* Everneat — Service Areas behaviour.
   Scroll reveals lifted verbatim from the approved Figma build (NYC Location Template 8079:163),
   plus the region-hub quote builder (NYC Hub 8056:164) and the booking-widget bridge.
   Shared by every generated page under /service-areas/. */

(function(){

  // ---- hero quote builder (region hub) — native <select> under an invisible overlay
  document.querySelectorAll('.qb').forEach(function(qb){
    var go=qb.querySelector('.qb-go');
    function sync(){
      qb.querySelectorAll('.qb-pick').forEach(function(pick){
        var sel=pick.querySelector('select'), val=pick.querySelector('.qb-val');
        if(sel&&val&&sel.selectedIndex>=0) val.textContent=sel.options[sel.selectedIndex].textContent;
      });
      var svc=qb.querySelector('select[data-qb="service"]');
      var loc=qb.querySelector('select[data-qb="location"]');
      if(go&&loc&&loc.value) go.href=loc.value;
      else if(go&&svc&&svc.value) go.href=svc.value;
    }
    qb.addEventListener('change',sync);
    sync();
  });
})();

(function(){
  if(window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;

  // nav strengthens on scroll
  var nav=document.querySelector('.nav');
  window.addEventListener('scroll',function(){
    var y=window.scrollY;
    nav.style.background=y>40?'#fff':'';
    nav.style.borderBottomColor=y>40?'rgba(0,0,0,0.10)':'';
  },{passive:true});

  // IntersectionObserver (shared)
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}
    });
  },{threshold:0.12});

  function anim(sel,cls){
    document.querySelectorAll(sel).forEach(function(el){el.classList.add(cls);io.observe(el);});
  }
  function stagger(sel,cls,ms){
    document.querySelectorAll(sel).forEach(function(el,i){
      el.classList.add(cls);
      el.style.animationDelay=(i*ms)+'ms';
      io.observe(el);
    });
  }

  // hero
  anim('.lhero-copy h1,.lhero-sub,.lhero-ctas','av-fadeUp');
  anim('.map-card','av-scaleUp');

  // loc intro
  anim('.locintro-lead','av-fadeUp');
  document.querySelectorAll('.rate,.seen>*').forEach(function(el,i){
    el.classList.add('av-fadeIn');
    el.style.animationDelay=(i*80)+'ms';
    io.observe(el);
  });

  // services steps
  document.querySelectorAll('.svc-step').forEach(function(step){
    var body=step.querySelector('.svc-body'), img=step.querySelector('.svc-img');
    body.classList.add('av-slideLeft'); io.observe(body);
    img.classList.add('av-slideRight'); io.observe(img);
  });
  anim('.svc-note','av-fadeIn');

  // compare rows
  anim('.compare .sec-title,.compare .sec-intro','av-fadeUp');
  stagger('.cmp-row:not(.cmp-head)','av-slideLeft',45);

  // days of protection
  anim('.protect .sec-title,.protect .sec-intro','av-fadeUp');
  var protectEl=document.querySelector('.protect');
  if(protectEl){
    var pBands=[].slice.call(protectEl.querySelectorAll('.band'));
    var pNodes=[].slice.call(protectEl.querySelectorAll('.tl-node'));
    var pDescs=[].slice.call(protectEl.querySelectorAll('.phase-desc .pb'));
    var pLine=protectEl.querySelector('.phase-tl');
    var pTick=false;
    function updateProtect(){
      pTick=false;
      if(window.innerWidth<=900)return;
      var r=protectEl.getBoundingClientRect();
      var total=r.height-window.innerHeight;
      var p=total>0?Math.min(1,Math.max(0,-r.top/total)):1;
      if(pLine) pLine.style.setProperty('--p',p.toFixed(4));
      var step=p>=0.9?2:p>=0.45?1:0;
      pBands.forEach(function(b,i){b.classList.toggle('on',i<=step);});
      pNodes.forEach(function(n,i){n.classList.toggle('on',i<=step);});
      pDescs.forEach(function(d,i){d.classList.toggle('on',i<=step);});
    }
    window.addEventListener('scroll',function(){
      if(!pTick){pTick=true;requestAnimationFrame(updateProtect);}
    },{passive:true});
    updateProtect();
  }

  // blueprint
  anim('.pub-copy .sec-title,.pub-copy p,.pub-copy .btn','av-fadeUp');
  stagger('.bp-item','av-fadeUp',38);

  // retail
  anim('.retail .sec-title,.retail-copy p,.retail-copy .row','av-fadeUp');
  anim('.retail-img','av-fadeIn');

  // testimonial
  anim('.testi-quote,.testi-by','av-fadeUp');

  // coverage
  anim('.coverage .sec-title,.cov-sub','av-fadeUp');
  anim('.cov-map','av-scaleUp');
  stagger('.nbh-col','av-fadeUp',90);

  // faq
  anim('.faq-img','av-fadeIn');
  anim('.faq-eyebrow,.faq-title','av-fadeUp');
  stagger('.faq-item','av-fadeUp',45);

  // CTA word-split reveal
  var ctaTitle=document.querySelector('.cta-title');
  if(ctaTitle){
    var words=ctaTitle.textContent.trim().split(/\s+/);
    ctaTitle.innerHTML=words.map(function(w,i){
      return '<span class="cta-word-wrap"><span class="cta-word-inner" style="animation-delay:'+(i*90)+'ms">'+w+'</span></span>';
    }).join(' ');
    io.observe(ctaTitle);
  }
  anim('.cta-copy,.cta-actions','av-fadeUp');

  // testimonial stat counters
  var statsIO=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(!e.isIntersecting) return;
      statsIO.unobserve(e.target);
      var b=e.target.querySelector('b');
      var raw=b.textContent;
      var m=raw.match(/^([0-9,]+\.?[0-9]*)(.*)$/);
      if(!m) return;
      var num=parseFloat(m[1].replace(/,/g,''));
      var suffix=m[2];
      var hasComma=m[1].indexOf(',')>=0;
      var hasDot=m[1].indexOf('.')>=0;
      var t0=null,dur=1200;
      (function tick(ts){
        if(!t0) t0=ts;
        var p=Math.min((ts-t0)/dur,1);
        var ease=1-Math.pow(1-p,3);
        var cur=ease*num;
        b.textContent=(hasComma?Math.round(cur).toLocaleString():hasDot?cur.toFixed(1):Math.round(cur))+suffix;
        if(p<1) requestAnimationFrame(tick);
      })(performance.now());
    });
  },{threshold:0.5});
  document.querySelectorAll('.testi-stats>div').forEach(function(el){statsIO.observe(el);});

})();

// Book CTAs open the booking overlay in place; if embed.js failed, links fall through to /book/.
(function(){
  var w=document.querySelector('booking-widget');
  if(!w) return;
  w.style.display='none';
  document.addEventListener('click',function(e){
    if(e.defaultPrevented) return;
    var a=e.target.closest('a[href$="book/"]');
    if(!a) return;
    if(!window.customElements||!customElements.get('booking-widget')) return;
    e.preventDefault();
    w.style.display='block';
  });
})();
