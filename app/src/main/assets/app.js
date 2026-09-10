const $ = id => document.getElementById(id);
let shape = 'rect';

const presets = {
  'Reng atap genteng': {spacing: 25, stock: 6},
  'Usuk / kaso': {spacing: 50, stock: 4},
  'Baja ringan': {spacing: 120, stock: 6},
  'Rangka plafon': {spacing: 60, stock: 4},
  'Rangka custom': {spacing: 40, stock: 6}
};

const dimensions = {
  rect: [['panjang','Panjang',8],['lebar','Lebar',6]],
  square: [['sisi','Panjang sisi',6]],
  l: [['totalP','Panjang total',10],['totalL','Lebar total',8],['potongP','Panjang potongan',4],['potongL','Lebar potongan',3]],
  t: [['kepalaP','Panjang kepala T',10],['kepalaL','Lebar kepala T',3],['batangP','Panjang batang T',5],['batangL','Lebar batang T',4]]
};

const hints = {
  rect:'Ukuran keseluruhan bidang persegi panjang.', square:'Satu ukuran digunakan untuk keempat sisinya.',
  l:'Bentuk L dihitung dari bidang besar dikurangi potongan di sudut kanan bawah.',
  t:'Batang T berada di tengah dan tersambung di bawah kepala T.'
};

function fields() {
  $('dimensionFields').innerHTML = dimensions[shape].map(([id,label,value]) => `<label>${label}<div class="input-unit"><input id="${id}" inputmode="decimal" value="${value}"><span>m</span></div></label>`).join('');
  $('shapeHint').textContent = hints[shape];
}

document.querySelectorAll('#shapes button').forEach(button => button.addEventListener('click', () => {
  document.querySelector('#shapes .active').classList.remove('active'); button.classList.add('active'); shape = button.dataset.shape; fields();
}));

$('material').addEventListener('change', e => { const p=presets[e.target.value]; $('spacing').value=p.spacing; $('stock').value=p.stock; });
$('waste').addEventListener('input', e => $('wasteValue').textContent=e.target.value+'%');

function n(id) { return Math.max(0, parseFloat($(id).value.replace(',','.')) || 0); }
function polygon() {
  if(shape==='rect') return [[0,0],[n('panjang'),0],[n('panjang'),n('lebar')],[0,n('lebar')]];
  if(shape==='square') { const s=n('sisi'); return [[0,0],[s,0],[s,s],[0,s]]; }
  if(shape==='l') { const w=n('totalP'),h=n('totalL'),cw=Math.min(n('potongP'),w),ch=Math.min(n('potongL'),h); return [[0,0],[w,0],[w,h-ch],[w-cw,h-ch],[w-cw,h],[0,h]]; }
  const hw=n('kepalaP'),hh=n('kepalaL'),sw=Math.min(n('batangL'),hw),sh=n('batangP'),x=(hw-sw)/2;
  return [[0,0],[hw,0],[hw,hh],[x+sw,hh],[x+sw,hh+sh],[x,hh+sh],[x,hh],[0,hh]];
}

function bounds(poly) { return {w:Math.max(...poly.map(p=>p[0])),h:Math.max(...poly.map(p=>p[1]))}; }
function inside(x,y,poly) { let c=false; for(let i=0,j=poly.length-1;i<poly.length;j=i++) { const a=poly[i],b=poly[j]; if(((a[1]>y)!=(b[1]>y)) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) c=!c; } return c; }
function intersections(at,vertical,poly) {
  const vals=[];
  for(let i=0;i<poly.length;i++) { const a=poly[i],b=poly[(i+1)%poly.length]; const p=vertical?a[0]:a[1],q=vertical?b[0]:b[1]; if(p===q) continue; if(at>=Math.min(p,q) && at<Math.max(p,q)) { const t=(at-p)/(q-p); vals.push((vertical?a[1]:a[0])+t*((vertical?b[1]:b[0])-(vertical?a[1]:a[0]))); } }
  return vals.sort((a,b)=>a-b);
}

function calculate() {
  const poly=polygon(), {w,h}=bounds(poly), spacing=n('spacing')/100, stock=n('stock'), waste=n('waste')/100, vertical=$('direction').value==='vertical';
  if(!w || !h || !spacing || !stock) { alert('Lengkapi semua ukuran dengan angka lebih dari nol.'); return; }
  if(shape==='l' && (n('potongP')>=w || n('potongL')>=h)) { alert('Ukuran potongan L harus lebih kecil dari ukuran total.'); return; }
  if(shape==='t' && n('batangL')>w) { alert('Lebar batang T tidak boleh melebihi panjang kepala T.'); return; }
  const limit=vertical?w:h, eps=Math.min(.002,spacing/100), positions=[];
  for(let p=0;p<=limit+eps;p+=spacing) positions.push(Math.min(p,limit-eps));
  if(positions[positions.length-1]<limit-eps) positions.push(limit-eps);
  let total=0, segments=0;
  positions.forEach(p => { const vals=intersections(Math.max(eps,p),vertical,poly); for(let i=0;i+1<vals.length;i+=2){ total+=vals[i+1]-vals[i]; segments++; }});
  let area=0; for(let i=0,j=poly.length-1;i<poly.length;j=i++) area+=(poly[j][0]*poly[i][1]-poly[i][0]*poly[j][1]); area=Math.abs(area/2);
  const bars=Math.ceil(total*(1+waste)/stock);
  $('areaResult').textContent=fmt(area)+' m²'; $('lineResult').textContent=positions.length; $('lengthResult').textContent=fmt(total)+' m'; $('barResult').textContent=bars;
  $('noteText').textContent=`${fmt(total)} m total rangka + ${Math.round(waste*100)}% cadangan = ${fmt(total*(1+waste))} m. Dibagi panjang ${fmt(stock)} m per batang dan dibulatkan ke atas menjadi ${bars} batang. Sambungan/potongan aktual dapat menambah kebutuhan.`;
  draw(poly,positions,vertical,w,h); $('results').classList.remove('hidden'); setTimeout(()=>$('results').scrollIntoView({behavior:'smooth'}),50);
}

function fmt(v) { return new Intl.NumberFormat('id-ID',{maximumFractionDigits:2}).format(v); }
function draw(poly,positions,vertical,w,h) {
  const svg=$('drawing'), pad=28, sw=304,sh=204,scale=Math.min(sw/w,sh/h), ox=(360-w*scale)/2,oy=(260-h*scale)/2;
  const P=p=>[ox+p[0]*scale,oy+p[1]*scale], d=poly.map((p,i)=>(i?'L':'M')+P(p).join(' ')).join(' ')+' Z';
  let html=`<defs><clipPath id="clip"><path d="${d}"/></clipPath></defs><path d="${d}" fill="#eaf5f1" stroke="#173b36" stroke-width="3"/>`;
  html+='<g clip-path="url(#clip)" stroke="#15947e" stroke-width="1.5" opacity=".9">';
  positions.forEach(p=>{ if(vertical){const x=ox+p*scale;html+=`<line x1="${x}" y1="${oy-5}" x2="${x}" y2="${oy+h*scale+5}"/>`;}else{const y=oy+p*scale;html+=`<line x1="${ox-5}" y1="${y}" x2="${ox+w*scale+5}" y2="${y}"/>`;}}); html+='</g>';
  html+=`<path d="${d}" fill="none" stroke="#173b36" stroke-width="3"/><text x="180" y="248" text-anchor="middle" font-size="10" fill="#657672">${fmt(w)} m × ${fmt(h)} m • jarak ${fmt(n('spacing'))} cm</text>`;
  svg.innerHTML=html;
}

$('calculate').addEventListener('click',calculate); fields();
