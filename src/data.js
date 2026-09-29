import { CONFIG as C, artwork } from './config.js';
const DAY=86400000; const KEY='every-element-v1';
const slots=[]; let events=[]; let listeners=[];
function add(key,type,tier,text,index=0){const id=String(slots.length+1).padStart(3,'0');const content={text,url:'',image:type==='image'?artwork(text,index):''};slots.push({id,key,type,tier,defaultContent:{...content},content,owner:null,expiresAt:null,takeoverPrice:Math.ceil(C.prices[tier]*C.takeoverMinimum),changes:0});}
add('brand','logo','medium',C.name);C.copy.nav.forEach((v,i)=>add('nav'+i,'link','small',v));add('headline','text','hero',C.copy.headline);add('subheadline','text','large',C.copy.subheadline);add('cta','link','medium',C.copy.cta);add('secondary','link','small',C.copy.secondary);add('hero','image','hero',C.copy.heroLabel);C.demo.pills.forEach((v,i)=>add('pill'+i,'link','small',v));
for(let i=0;i<6;i++){add(`card${i}avatar`,'image','small',C.demo.names[i],i);add(`card${i}name`,'text','medium',i%2?C.demo.names[i]:C.copy.labels.next);C.copy.cardFeatures.forEach((v,j)=>add(`card${i}line${j}`,'text','small',v));add(`card${i}button`,'link','small',C.copy.cardButton);}
for(let i=0;i<12;i++)add('logo'+i,'logo','small',C.copy.logoPlaceholder);
C.copy.features.forEach((v,i)=>{const tier=i===0?'large':i<3?'medium':'small';add(`feature${i}title`,'text',tier,v[0]);add(`feature${i}text`,'block',tier,v[1]);add(`feature${i}image`,'image',tier,v[0],i);add(`feature${i}link`,'link',tier,v[2]);});
add('pricingTitle','text','large',C.copy.pricingTitle);add('pricingSub','text','medium',C.copy.pricingSub);
C.tiers.forEach((tier,i)=>{add(`price${i}title`,'text',tier,C.copy.tierNames[i]);add(`price${i}description`,'text','small',C.copy.tierDescriptions[i]);add(`price${i}rate`,'text',tier,C.prices[tier].toLocaleString()+' '+C.ticker+' / day');add(`price${i}button`,'link','small',C.copy.pricingButton);});
C.copy.faq.forEach((v,i)=>{add(`faq${i}q`,'text','small',v[0]);add(`faq${i}a`,'block','medium',v[1]);});C.copy.footerLinks.forEach((v,i)=>add('footer'+i,'link','small',v));
function save(){try{sessionStorage.setItem(KEY,JSON.stringify({slots,events}));}catch{}}
function emit(id){save();listeners.forEach(fn=>fn(id));}
function record(slot,kind,owner){events.unshift({id:globalThis.crypto?.randomUUID?.()||String(Date.now()+Math.random()),slotId:slot.id,key:slot.key,kind,owner,time:Date.now(),price:kind===C.ui.eventTake?slot.takeoverPrice:C.prices[slot.tier]});}
export function quote(slot,days){if(!C.durations[days])throw Error(C.copy.labels.invalidDuration);return Math.round(C.prices[slot.tier]*days*C.durations[days]);}
export function minimumTakeover(slot){return Math.ceil(C.prices[slot.tier]*C.takeoverMinimum);}
export function getSlots(){return slots;}
export function getEvents(){return events;}
export function subscribe(fn){listeners.push(fn);return()=>{listeners=listeners.filter(x=>x!==fn);};}
export function expireSlots(){let changed=false;slots.forEach(s=>{if(s.owner&&s.expiresAt<=Date.now()){record(s,C.ui.eventExpired,s.owner);s.owner=null;s.expiresAt=null;s.content={...s.defaultContent};changed=true;}});if(changed)emit();}
function transaction(id,content,days,takeoverPrice,owner,expectedOccupied){expireSlots();const s=slots.find(x=>x.id===id);if(!s)throw Error(C.copy.labels.unknownSlot);if(Boolean(s.owner)!==expectedOccupied)throw Error(C.copy.labels.changed);quote(s,days);if(!Number.isFinite(takeoverPrice)||takeoverPrice<minimumTakeover(s))throw Error(C.ui.invalidPrice);if(content.url&&!/^https?:\/\//i.test(content.url))throw Error(C.ui.invalidUrl);record(s,s.owner?C.ui.eventTake:C.ui.eventRent,owner);Object.assign(s,{content:{...content},owner,expiresAt:Date.now()+days*DAY,takeoverPrice,changes:s.changes+1});emit(id);return s;}
export function rentSlot(id,content,days,price,owner=C.sessionOwner){return transaction(id,content,days,price,owner,false);}
export function takeOverSlot(id,content,days,price,owner=C.sessionOwner){return transaction(id,content,days,price,owner,true);}
export function simulate(id){const s=id?slots.find(x=>x.id===id):slots[Math.floor(Math.random()*slots.length)];const n=Math.floor(Math.random()*C.demo.names.length);const content={text:s.type==='image'||s.type==='logo'?C.demo.names[n]:s.type==='link'?C.demo.names[n]+' ↗':C.demo.slogans[n],image:s.type==='image'?artwork(C.demo.names[n],n):'',url:''};return (s.owner?takeOverSlot:rentSlot)(s.id,content,3,minimumTakeover(s)+2500,C.demo.wallets[n%4]);}
export function fillAll(){slots.forEach(s=>simulate(s.id));}
export function emptyAll(){slots.forEach(s=>{Object.assign(s,{content:{...s.defaultContent},owner:null,expiresAt:null,changes:0,takeoverPrice:minimumTakeover(s)});});emit();}
let restored=false;try{const saved=JSON.parse(sessionStorage.getItem(KEY));if(saved?.slots?.length===slots.length){saved.slots.forEach((s,i)=>Object.assign(slots[i],s));events=saved.events||[];restored=true;}}catch{}
if(!restored){slots.forEach((s,i)=>{if((i*7)%10<4)simulate(s.id);});}expireSlots();
