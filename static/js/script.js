let chats = [];
let selected = new Set();
let current = [];
let filterType = 'all';

function $(id){ return document.getElementById(id); }

function showPanel(n){
    document.querySelectorAll('.step-panel').forEach(p => {
        p.classList.add('hidden');
        p.classList.remove('active');
    });
    const panel = document.querySelector(`[data-panel="${n}"]`);
    panel.classList.remove('hidden');
    panel.classList.add('active');

    document.querySelectorAll('.step-indicator').forEach((ind, i) => {
        ind.classList.remove('active', 'completed');
        if(i < n-1) ind.classList.add('completed');
        if(i === n-1) ind.classList.add('active');
    });
}

function toast(msg, type='error'){
    const t = $('toast');
    const icon = t.querySelector('.toast-icon');
    $('toastMsg').textContent = msg;

    if(type === 'success'){
        icon.style.background = 'rgba(16, 185, 129, 0.1)';
        icon.style.color = '#10b981';
    } else {
        icon.style.background = 'rgba(239, 68, 68, 0.1)';
        icon.style.color = '#ef4444';
    }

    t.classList.add('show');
    t.style.transform = 'translateX(0)';
    setTimeout(() => {
        t.style.transform = 'translateX(120%)';
        t.classList.remove('show');
    }, 3500);
}

async function toStep2(){
    const id = $('apiId').value.trim();
    const hash = $('apiHash').value.trim();
    if(!/^\d+$/.test(id)){ toast('API ID must be numeric'); $('apiId').classList.add('border-red-500'); return; }
    if(hash.length < 20){ toast('API Hash looks invalid'); $('apiHash').classList.add('border-red-500'); return; }
    $('apiId').classList.remove('border-red-500');
    $('apiHash').classList.remove('border-red-500');

    const btn = $('btn1');
    btn.classList.add('loading');
    btn.querySelector('.spinner').classList.remove('hidden');
    btn.querySelector('.btn-text').classList.add('opacity-0');
    btn.disabled = true;

    try {
        const res = await fetch('/api/set-credentials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiId: id, apiHash: hash })
        });
        const data = await res.json();

        if(!res.ok){ toast(data.error || 'Something went wrong'); return; }

        showPanel(2);
    } catch(err) {
        toast('Could not reach the server');
    } finally {
        btn.classList.remove('loading');
        btn.querySelector('.spinner').classList.add('hidden');
        btn.querySelector('.btn-text').classList.remove('opacity-0');
        btn.disabled = false;
    }
}

async function toStep3(){
    const phone = $('phone').value.trim();
    if(!phone.match(/^\+[\d\s]{6,16}$/)){ toast('Enter phone with country code (e.g. +1...)'); $('phone').classList.add('border-red-500'); return; }
    $('phone').classList.remove('border-red-500');

    const btn = $('btn2');
    btn.classList.add('loading');
    btn.querySelector('.spinner').classList.remove('hidden');
    btn.querySelector('.btn-text').classList.add('opacity-0');
    btn.disabled = true;

    try {
        const res = await fetch('/api/send-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone })
        });
        const data = await res.json();

        if(!res.ok){ toast(data.error || 'Something went wrong'); return; }

        showPanel(3);
    } catch(err) {
        toast('Could not reach the server');
    } finally {
        btn.classList.remove('loading');
        btn.querySelector('.spinner').classList.add('hidden');
        btn.querySelector('.btn-text').classList.remove('opacity-0');
        btn.disabled = false;
    }
}

async function toStep4(){
    const code = $('code').value.trim();
    const password = $('password2fa').value.trim();
    if(!/^\d{4,6}$/.test(code)){ toast('Enter the numeric code Telegram sent you'); $('code').classList.add('border-red-500'); return; }
    $('code').classList.remove('border-red-500');

    const btn = $('btn3');
    btn.classList.add('loading');
    btn.querySelector('.spinner').classList.remove('hidden');
    btn.querySelector('.btn-text').classList.add('opacity-0');
    btn.disabled = true;

    try {
        const res = await fetch('/api/verify-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, password })
        });
        const data = await res.json();

        if(!res.ok){
            if(data.needs_password){
                toast('This account has 2FA — enter your password too');
            } else {
                toast(data.error || 'Something went wrong');
            }
            return;
        }

        const chatsRes = await fetch('/api/chats');
        const chatsData = await chatsRes.json();

        if(!chatsRes.ok){ toast(chatsData.error || 'Could not load chats'); return; }

        chats = chatsData.chats;
        current = [...chats];

        showPanel(4);
        render();
        updateStats();
        $('term').classList.remove('hidden');
        log('Session established', 'ok');
        log(`Loaded ${chats.length} chats`, 'ok');
    } catch(err) {
        toast('Could not reach the server');
    } finally {
        btn.classList.remove('loading');
        btn.querySelector('.spinner').classList.add('hidden');
        btn.querySelector('.btn-text').classList.remove('opacity-0');
        btn.disabled = false;
    }
}

function toStep1(){ showPanel(1); }

function render(){
    const filtered = current.filter(c => {
        if(filterType === 'all') return true;
        if(filterType === 'large') return c.members > 10000;
        return c.type === filterType;
    });

    const box = $('listBox');
    if(!filtered.length){
        box.innerHTML = `<div class="text-center py-12 text-stone-600"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-10 h-10 mx-auto mb-3 opacity-30"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg><div class="text-[13px] font-medium">No chats found</div></div>`;
        return;
    }

    box.innerHTML = filtered.map(c => `
        <div class="chat-row flex items-center px-4 py-3 border-b border-obsidian-600 cursor-pointer transition-all duration-150 gap-3 ${selected.has(c.id)?'selected':''}" onclick="toggle(${c.id})">
            <div class="custom-checkbox w-[18px] h-[18px] border-2 border-obsidian-500 rounded-[5px] flex items-center justify-center shrink-0 transition-all duration-200 hover:border-amber-500 ${selected.has(c.id)?'checked':''}" style="pointer-events:none;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3 text-obsidian-950 ${selected.has(c.id)?'block':'hidden'}"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div class="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm font-mono shrink-0 relative overflow-hidden ${c.type==='channel'?'bg-gradient-to-br from-violet-600 to-violet-900 text-violet-200':'bg-gradient-to-br from-emerald-600 to-emerald-800 text-emerald-200'}">
                ${initials(c.name)}
            </div>
            <div class="flex-1 min-w-0">
                <div class="font-semibold text-sm truncate">${esc(c.name)}</div>
                <div class="text-xs text-stone-600 font-mono">${fmt(c.members)} members · ${c.type}</div>
            </div>
        </div>
    `).join('');

    updateSelAll();
}

function toggle(id){
    selected.has(id) ? selected.delete(id) : selected.add(id);
    render();
    updateStats();
}

function toggleAll(){
    const visible = current.filter(c => {
        if(filterType === 'all') return true;
        if(filterType === 'large') return c.members > 10000;
        return c.type === filterType;
    });
    const allSel = visible.every(c => selected.has(c.id));
    visible.forEach(c => allSel ? selected.delete(c.id) : selected.add(c.id));
    render();
    updateStats();
}

function updateSelAll(){
    const visible = current.filter(c => {
        if(filterType === 'all') return true;
        if(filterType === 'large') return c.members > 10000;
        return c.type === filterType;
    });
    const box = $('selAllBox');
    if(visible.length && visible.every(c => selected.has(c.id))){
        box.classList.add('checked');
        box.querySelector('svg').classList.remove('hidden');
    } else {
        box.classList.remove('checked');
        box.querySelector('svg').classList.add('hidden');
    }
}

function filter(type, el){
    filterType = type;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    render();
}

function sort(by){
    if(by === 'name') current.sort((a,b) => a.name.localeCompare(b.name));
    else current.sort((a,b) => b.members - a.members);
    render();
}

function updateStats(){
    $('stTotal').textContent = current.length;
    $('stSel').textContent = selected.size;
    $('modalCount').textContent = selected.size;
    $('btnLeave').disabled = selected.size === 0;
}

function openModal(){
    if(!selected.size) return;
    $('modal').classList.add('show');
}

function closeModal(){
    $('modal').classList.remove('show');
}

async function doLeave(){
    closeModal();
    const btn = $('btnLeave');
    btn.classList.add('loading');
    btn.querySelector('.spinner').classList.remove('hidden');
    btn.querySelector('.btn-text').classList.add('opacity-0');
    btn.disabled = true;

    const ids = Array.from(selected);
    log(`Leaving ${ids.length} chats...`, 'warn');

    try {
        const res = await fetch('/api/leave', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });
        const data = await res.json();

        if(!res.ok){ toast(data.error || 'Something went wrong'); return; }

        let successCount = 0;
        data.results.forEach(r => {
            const c = current.find(x => x.id === r.id);
            const name = c ? c.name : r.id;
            if(r.success){
                log(`Left ${name}`, 'ok');
                successCount++;
                selected.delete(r.id);
                current = current.filter(x => x.id !== r.id);
                chats = chats.filter(x => x.id !== r.id);
            } else {
                log(`Failed to leave ${name}: ${r.error}`, 'warn');
            }
        });

        toast(`Left ${successCount} of ${ids.length} chats`, 'success');
        render();
        updateStats();
    } catch(err) {
        toast('Could not reach the server');
    } finally {
        btn.classList.remove('loading');
        btn.querySelector('.spinner').classList.add('hidden');
        btn.querySelector('.btn-text').classList.remove('opacity-0');
        btn.disabled = false;
    }
}

function log(msg, cls=''){
    const t = new Date().toLocaleTimeString('en-US',{hour12:false});
    const line = document.createElement('div');
    line.className = 'flex gap-2';
    const colorClass = cls==='ok'?'text-emerald-500':cls==='warn'?'text-amber-400':'text-stone-500';
    line.innerHTML = `<span class="text-stone-700 shrink-0 font-mono">${t}</span><span class="${colorClass}">${esc(msg)}</span>`;
    $('term').appendChild(line);
    $('term').scrollTop = $('term').scrollHeight;
}

function fmt(n){
    if(n >= 1000000) return (n/1000000).toFixed(1)+'M';
    if(n >= 1000) return (n/1000).toFixed(1)+'K';
    return n+'';
}

function initials(name){
    const words = name.trim().split(/\s+/);
    if(words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
}

function esc(s){
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

// Enter key handlers
$('apiHash').addEventListener('keypress', e => { if(e.key==='Enter') toStep2(); });
$('phone').addEventListener('keypress', e => { if(e.key==='Enter') toStep3(); });
$('code').addEventListener('keypress', e => { if(e.key==='Enter') toStep4(); });