(function(){
  var map={home:'index.html',personalize:'personalize.html',checkout:'checkout.html',dashboard:'dashboard.html',profile:'dashboard.html'};
  document.querySelectorAll('[data-path]').forEach(function(el){
    var t=map[el.getAttribute('data-path')];
    if(t&&el.tagName==='A'){el.setAttribute('href',t);}
    else if(t){el.addEventListener('click',function(){location.href=t;});}
  });
})();
