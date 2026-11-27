(() => {
  "use strict";
  const API = String(window.PORTAL_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");
  const $ = id => document.getElementById(id);
  const grid=$("chapterGrid"), search=$("searchInput"), cls=$("classFilter"), subject=$("subjectFilter"), sort=$("sortFilter");
  const BOOKMARK_KEY="sarveshtwr_bookmarked_chapters";
  let chapters=[], showingBookmarks=false, visibleLimit=24, searchTimer=null, loading=false;
  const params=new URLSearchParams(location.search);
  const initialClass=params.get("class");
  if (["9","10","11","12"].includes(initialClass)) cls.value=initialClass;

  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const getBookmarks=()=>{try{return JSON.parse(localStorage.getItem(BOOKMARK_KEY)||"[]")}catch{return[]}};
  const saveBookmarks=value=>{localStorage.setItem(BOOKMARK_KEY,JSON.stringify(value));updateBookmarkCount()};
  function toast(message){const el=$("toast");el.textContent=message;el.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),2200)}
  function updateBookmarkCount(){const count=getBookmarks().length;$("bookmarkCount").textContent=count}
  function card(c){
    const image=c.coverImage?`<img src="${esc(c.coverImage)}" alt="" loading="lazy" onerror="this.style.display='none'">`:`<div class="chapter-art art-${esc(c.className)}"><span>${esc(String(c.className).padStart(2,"0"))}</span><i>✦</i></div>`;
    const saved=getBookmarks().includes(c.slug);
    return `<article class="chapter-card">
      <a class="chapter-cover" href="chapter.html?slug=${encodeURIComponent(c.slug)}">${image}</a>
      <div class="chapter-card-body">
        <div class="card-meta"><span>CLASS ${esc(c.className)}</span><span>${esc(c.subject)}</span></div>
        <h3><a href="chapter.html?slug=${encodeURIComponent(c.slug)}">${esc(c.title)}</a></h3>
        <p>${esc(c.description||"Explore this chapter and strengthen your concepts.")}</p>
        <div class="card-bottom"><span>${esc(c.chapterNumber||"Study notes")}</span><a href="chapter.html?slug=${encodeURIComponent(c.slug)}">Read chapter ↗</a></div>
        <button type="button" class="library-bookmark-btn ${saved?"bookmarked":""}" data-bookmark-slug="${esc(c.slug)}">${saved?"★ Saved":"☆ Save Chapter"}</button>
      </div></article>`;
  }
  function getFiltered(){
    const q=search.value.trim().toLocaleLowerCase();
    const classValue=cls.value, subjectValue=subject.value, bookmarks=getBookmarks();
    let list=chapters.filter(c=>{
      if(classValue && String(c.className)!==classValue)return false;
      if(subjectValue && c.subject!==subjectValue)return false;
      if(showingBookmarks && !bookmarks.includes(c.slug))return false;
      if(!q)return true;
      const fields=[c.title,c.subject,c.description,c.chapterNumber,c.className,`class ${c.className}`];
      return fields.some(v=>String(v??"").toLocaleLowerCase().includes(q));
    });
    if(sort.value==="title")list.sort((a,b)=>String(a.title).localeCompare(String(b.title)));
    if(sort.value==="subject")list.sort((a,b)=>String(a.subject).localeCompare(String(b.subject))||String(a.title).localeCompare(String(b.title)));
    if(sort.value==="class")list.sort((a,b)=>Number(a.className)-Number(b.className)||String(a.subject).localeCompare(String(b.subject)));
    return list;
  }
  function render(){
    const filtered=getFiltered(), shown=filtered.slice(0,visibleLimit);
    grid.innerHTML=shown.length?shown.map(card).join(""):`<div class="library-empty"><span>⌕</span><b>${showingBookmarks?"No saved chapters found":"No matching chapters found"}</b><p>${showingBookmarks?"Save chapters using the ☆ Save Chapter button.":"Try another keyword or reset the filters to see more study material."}</p><button type="button" id="emptyReset">Reset search & filters</button></div>`;
    $("resultCount").textContent=`Showing ${shown.length} of ${filtered.length} chapter${filtered.length===1?"":"s"}${showingBookmarks?" · My Bookmarks":""}`;
    $("loadMoreWrap").hidden=filtered.length<=shown.length;
    updateBookmarkCount();
    grid.querySelectorAll("[data-bookmark-slug]").forEach(button=>button.addEventListener("click",()=>{
      const slug=button.dataset.bookmarkSlug;let saved=getBookmarks();
      if(saved.includes(slug)){saved=saved.filter(x=>x!==slug);toast("Bookmark removed")}else{saved.push(slug);toast("Chapter bookmarked")}
      saveBookmarks(saved);render();
    }));
    $("emptyReset")?.addEventListener("click",resetFilters);
  }
  function resetFilters(){search.value="";cls.value="";subject.value="";sort.value="default";showingBookmarks=false;visibleLimit=24;updateTabs();render();history.replaceState(null,"",location.pathname)}
  function updateTabs(){$("showAllChapters").classList.toggle("active",!showingBookmarks);$("showBookmarkedChapters").classList.toggle("active",showingBookmarks)}
  function scheduleRender(){visibleLimit=24;clearTimeout(searchTimer);searchTimer=setTimeout(render,100)}
  async function load(){
    if(loading)return;loading=true;
    try{
      if(!API)throw new Error("API address is not configured in js/config.js");
      const response=await fetch(`${API}/api/chapters`);
      if(!response.ok)throw new Error(`Server returned ${response.status}`);
      const data=await response.json();chapters=Array.isArray(data.chapters)?data.chapters:[];
      const subjects=[...new Set(chapters.map(c=>c.subject).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
      subject.innerHTML='<option value="">All subjects</option>'+subjects.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join("");
      if(params.get("subject"))subject.value=params.get("subject");
      if(params.get("q"))search.value=params.get("q");
      render();
      if(!chapters.length)grid.innerHTML='<div class="library-empty"><b>No study material published yet</b><p>New chapters added by the administrator will appear here.</p></div>';
    }catch(error){
      grid.innerHTML=`<div class="library-empty error"><b>Study Library could not load</b><p>${esc(error.message)}. Check your internet connection and backend status, then try again.</p><button type="button" id="retryLoad">Try again</button></div>`;
      $("resultCount").textContent="Unable to load resources";
      $("retryLoad")?.addEventListener("click",()=>{loading=false;load()});
    }finally{loading=false}
  }
  search.addEventListener("input",scheduleRender);
  [cls,subject,sort].forEach(el=>el.addEventListener("change",()=>{visibleLimit=24;render()}));
  $("clearSearch").addEventListener("click",()=>{search.value="";search.focus();scheduleRender()});
  $("resetFilters").addEventListener("click",resetFilters);
  $("loadMoreBtn").addEventListener("click",()=>{visibleLimit+=24;render()});
  $("showAllChapters").addEventListener("click",()=>{showingBookmarks=false;visibleLimit=24;updateTabs();render()});
  $("showBookmarkedChapters").addEventListener("click",()=>{showingBookmarks=true;visibleLimit=24;updateTabs();render()});
  window.addEventListener("storage",e=>{if(e.key===BOOKMARK_KEY)render()});
  document.addEventListener("keydown",e=>{if(e.key==="/"&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){e.preventDefault();search.focus()}if(e.key==="Escape"&&document.activeElement===search){search.value="";scheduleRender();search.blur()}});
  const year=$("year");if(year)year.textContent=new Date().getFullYear();
  const toggle=$("menuToggle"),links=$("navLinks");
  if(toggle&&links){toggle.addEventListener("click",()=>{const open=links.classList.toggle("open");toggle.setAttribute("aria-expanded",String(open));toggle.textContent=open?"✕":"☰"});links.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{links.classList.remove("open");toggle.setAttribute("aria-expanded","false");toggle.textContent="☰"}))}
  updateTabs();load();
})();
