import React, {useEffect,useMemo,useState} from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { Activity, Bike, CalendarDays, Droplets, Flame, Gauge, Plus, Save, Timer, Waves, Dumbbell, TestTube2, Trash2, ClipboardList, HeartPulse, Scale, ThermometerSun, CheckCircle2, FlaskConical, UploadCloud, Image as ImageIcon } from 'lucide-react';
import './styles.css';

const TYPES = { Swim:{icon:Waves,unit:'yd'}, Bike:{icon:Bike,unit:'mi'}, Run:{icon:Activity,unit:'mi'}, Strength:{icon:Dumbbell,unit:'min'}, Rest:{icon:Timer,unit:''} };
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

function daysUntil(dateStr){ if(!dateStr) return '—'; const target=new Date(dateStr+'T07:00:00'); return Math.max(0, Math.ceil((target - new Date())/86400000)); }
const DEFAULT_RACE={name:'Target Race', date:'2026-09-19', subtitle:'Mission Control'};
function weekStart(d=new Date()){ const x=new Date(d); const day=(x.getDay()+6)%7; x.setDate(x.getDate()-day); x.setHours(0,0,0,0); return x; }
function toISO(d){ return new Date(d).toISOString().slice(0,10); }
function num(v){ return Number(v)||0; }
function avg(arr){ const clean=arr.map(num).filter(v=>v>0); return clean.length ? (clean.reduce((a,b)=>a+b,0)/clean.length).toFixed(1) : '—'; }
function calcRates(payload){
  const hrs = num(payload.duration)/60;
  const carbs_per_hr = hrs ? Math.round(num(payload.carbs)/hrs) : 0;
  const sodium_per_hr = hrs ? Math.round(num(payload.sodium)/hrs) : 0;
  const fluid_per_hr = hrs ? Math.round(num(payload.fluid)/hrs) : 0;
  const sweat_rate_oz_hr = hrs && payload.pre_weight && payload.post_weight ? Math.round(((num(payload.pre_weight)-num(payload.post_weight))*16 + num(payload.fluid))/hrs) : null;
  return {...payload, carbs_per_hr, sodium_per_hr, fluid_per_hr, sweat_rate_oz_hr};
}

function App(){
  const [workouts,setWorkouts]=useState([]);
  const [planned,setPlanned]=useState([]);
  const [readiness,setReadiness]=useState([]);
  const [view,setView]=useState('dashboard');
  const [race,setRace]=useState(()=>JSON.parse(localStorage.getItem('ironman_race')||JSON.stringify(DEFAULT_RACE)));
  const [loading,setLoading]=useState(true);
  const blankWorkout={date:toISO(new Date()), type:'Bike', title:'', duration:'', distance:'', avg_hr:'', temp:'', humidity:'', rpe:'', gut:'', heat:'', energy:'', cramps:false, carbs:'', sodium:'', fluid:'', pre_weight:'', post_weight:'', notes:'', planned_id:null};
  const [form,setForm]=useState(blankWorkout);
  const [planForm,setPlanForm]=useState({date:toISO(new Date()), type:'Bike', title:'', planned_duration:'', planned_distance:'', intensity:'Z2', workout_details:'', fueling_target:'', notes:''});
  const [readyForm,setReadyForm]=useState({date:toISO(new Date()), weight:'', resting_hr:'', sleep_hours:'', hrv:'', energy:'', soreness:'', mood:'', notes:''});
  const [experiment,setExperiment]=useState({title:'', hypothesis:'', protocol:'', result:''});
  const [experiments,setExperiments]=useState(JSON.parse(localStorage.getItem('ironman_experiments')||'[]'));

  useEffect(()=>{ load(); },[]);
  async function load(){
    setLoading(true);
    if(!supabase){ setLoading(false); return; }
    const [w,p,r] = await Promise.all([
      supabase.from('workouts').select('*').order('date',{ascending:false}),
      supabase.from('planned_workouts').select('*').order('date',{ascending:true}),
      supabase.from('daily_readiness').select('*').order('date',{ascending:false})
    ]);
    if(w.error) console.error(w.error); else setWorkouts(w.data||[]);
    if(p.error) console.error(p.error); else setPlanned(p.data||[]);
    if(r.error) console.error(r.error); else setReadiness(r.data||[]);
    setLoading(false);
  }
  async function saveWorkout(e){
    e.preventDefault();
    const payload=calcRates({...form, duration:num(form.duration), distance:num(form.distance), avg_hr:num(form.avg_hr), temp:num(form.temp), humidity:num(form.humidity), rpe:num(form.rpe), gut:num(form.gut), heat:num(form.heat), energy:num(form.energy), carbs:num(form.carbs), sodium:num(form.sodium), fluid:num(form.fluid), pre_weight:form.pre_weight?num(form.pre_weight):null, post_weight:form.post_weight?num(form.post_weight):null});
    if(supabase){
      const {error}=await supabase.from('workouts').insert(payload);
      if(error) alert(error.message); else {
        if(payload.planned_id) await supabase.from('planned_workouts').update({completed:true}).eq('id',payload.planned_id);
        setForm(blankWorkout); load(); setView('dashboard');
      }
    }
  }
  async function savePlan(e){
    e.preventDefault();
    const payload={...planForm, planned_duration:num(planForm.planned_duration), planned_distance:num(planForm.planned_distance)};
    const {error}=await supabase.from('planned_workouts').insert(payload);
    if(error) alert(error.message); else { setPlanForm({date:toISO(new Date()), type:'Bike', title:'', planned_duration:'', planned_distance:'', intensity:'Z2', workout_details:'', fueling_target:'', notes:''}); load(); setView('calendar'); }
  }
  async function saveReadiness(e){
    e.preventDefault();
    const payload={...readyForm, weight:num(readyForm.weight), resting_hr:num(readyForm.resting_hr), sleep_hours:num(readyForm.sleep_hours), hrv:num(readyForm.hrv), energy:num(readyForm.energy), soreness:num(readyForm.soreness), mood:num(readyForm.mood)};
    const {error}=await supabase.from('daily_readiness').upsert(payload,{onConflict:'date'});
    if(error) alert(error.message); else {load(); setView('dashboard');}
  }
  async function deleteWorkout(id){ if(!confirm('Delete this workout?')) return; await supabase.from('workouts').delete().eq('id',id); load(); }
  async function deletePlan(id){ if(!confirm('Delete this planned workout?')) return; await supabase.from('planned_workouts').delete().eq('id',id); load(); }
  function startLogFromPlan(p){ setForm({...blankWorkout, date:p.date, type:p.type, title:p.title, duration:p.planned_duration||'', distance:p.planned_distance||'', notes:`Planned: ${p.workout_details||''}\nFuel target: ${p.fueling_target||''}\n${p.notes||''}`, planned_id:p.id}); setView('log'); }
  function saveExperiment(e){ e.preventDefault(); const next=[{...experiment,id:crypto.randomUUID(),date:toISO(new Date())},...experiments]; setExperiments(next); localStorage.setItem('ironman_experiments',JSON.stringify(next)); setExperiment({title:'',hypothesis:'',protocol:'',result:''}); }

  const stats=useMemo(()=>{
    const ws=weekStart(); const week=workouts.filter(w=>new Date(w.date)>=ws); const pweek=planned.filter(w=>new Date(w.date)>=ws && new Date(w.date)<new Date(ws.getTime()+7*86400000));
    return {week,pweek, swim:week.filter(w=>w.type==='Swim').reduce((a,w)=>a+num(w.distance),0), bike:week.filter(w=>w.type==='Bike').reduce((a,w)=>a+num(w.distance),0), run:week.filter(w=>w.type==='Run').reduce((a,w)=>a+num(w.distance),0), hours:week.reduce((a,w)=>a+num(w.duration),0)/60, heat:week.filter(w=>num(w.temp)>=80).length, plannedHours:pweek.reduce((a,w)=>a+num(w.planned_duration),0)/60, avgGut:avg(week.map(w=>w.gut)), avgHeat:avg(week.map(w=>w.heat)), avgSodium:avg(week.map(w=>w.sodium_per_hr)), avgFluid:avg(week.map(w=>w.fluid_per_hr)), avgSweat:avg(week.map(w=>w.sweat_rate_oz_hr))};
  },[workouts,planned]);
  const latestReadiness = readiness[0];
  return <div className="app">
    <header><div><h1>Ironman Lab</h1><p>{race.subtitle || 'Mission Control'}</p></div><div className="race"><strong>{daysUntil(race.date)}</strong><span>days to {race.name || 'target race'}</span></div></header>
    <nav>{[['dashboard','dashboard'],['race','race setup'],['calendar','calendar'],['plan','add plan'],['log','log actual'],['readiness','readiness'],['fuel','fuel lab'],['sweat','sweat calc'],['simulation','race sims'],['predictor','race predictor'],['coach','coach report'],['analysis','AI screenshots'],['experiments','experiments']].map(([v,label])=><button key={v} onClick={()=>setView(v)} className={view===v?'active':''}>{label}</button>)}</nav>
    {loading? <p>Loading...</p> : view==='dashboard'? <Dashboard stats={stats} workouts={workouts} planned={planned} readiness={latestReadiness} deleteWorkout={deleteWorkout} startLogFromPlan={startLogFromPlan}/> : view==='race'? <RaceSetup race={race} setRace={setRace}/> : view==='calendar'? <Calendar workouts={workouts} planned={planned} deletePlan={deletePlan} startLogFromPlan={startLogFromPlan}/> : view==='plan'? <Plan form={planForm} setForm={setPlanForm} savePlan={savePlan}/> : view==='log'? <Log form={form} setForm={setForm} saveWorkout={saveWorkout}/> : view==='readiness'? <Readiness form={readyForm} setForm={setReadyForm} saveReadiness={saveReadiness} readiness={readiness}/> : view==='fuel'? <FuelLab workouts={workouts}/> : view==='sweat'? <SweatCalculator/> : view==='simulation'? <RaceSimulations workouts={workouts}/> : view==='predictor'? <MarylandPredictor workouts={workouts} race={race}/> : view==='coach'? <CoachReport workouts={workouts} planned={planned} readiness={readiness}/> : view==='analysis'? <ScreenshotAnalysis/> : <Experiments experiment={experiment} setExperiment={setExperiment} saveExperiment={saveExperiment} experiments={experiments}/>} 
  </div>
}
function Card({icon:Icon,title,value,sub}){ return <div className="card"><Icon size={22}/><p>{title}</p><h2>{value}</h2><span>{sub}</span></div> }

function RaceSetup({race,setRace}){
  const [draft,setDraft]=useState(race);
  function save(e){
    e.preventDefault();
    const next={...draft, name:draft.name||'Target Race', subtitle:draft.subtitle||'Mission Control'};
    setRace(next);
    localStorage.setItem('ironman_race',JSON.stringify(next));
    alert('Race setup saved.');
  }
  return <main><section className="panel"><h2><Timer/> Race Setup</h2><p className="muted">Change this anytime. The dashboard countdown and race predictor will update automatically.</p><form onSubmit={save} className="form"><label>Race name<input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} placeholder="Example: Jones Beach 70.3"/></label><label>Race date<input type="date" value={draft.date} onChange={e=>setDraft({...draft,date:e.target.value})}/></label><label>Dashboard subtitle<input value={draft.subtitle} onChange={e=>setDraft({...draft,subtitle:e.target.value})} placeholder="Example: Redemption Tour"/></label><div className="card"><Timer size={22}/><p>Countdown Preview</p><h2>{daysUntil(draft.date)}</h2><span>days to {draft.name||'target race'}</span></div><button className="save"><Save size={18}/> Save Race Setup</button></form></section></main>
}
function Dashboard({stats,workouts,planned,readiness,deleteWorkout,startLogFromPlan}){ const today=toISO(new Date()); const todayPlans=planned.filter(w=>w.date===today); const todayLogs=workouts.filter(w=>w.date===today); return <main><section className="grid"><Card icon={Waves} title="Swim" value={`${Math.round(stats.swim)} yd`} sub="completed this week"/><Card icon={Bike} title="Bike" value={`${stats.bike.toFixed(1)} mi`} sub="completed this week"/><Card icon={Activity} title="Run" value={`${stats.run.toFixed(1)} mi`} sub="completed this week"/><Card icon={Timer} title="Hours" value={stats.hours.toFixed(1)} sub={`${stats.plannedHours.toFixed(1)} planned`}/><Card icon={Flame} title="Heat Sessions" value={stats.heat} sub="80°F+"/><Card icon={Droplets} title="Avg Gut" value={stats.avgGut} sub="1 bad / 10 great"/><Card icon={Gauge} title="Sodium/hr" value={stats.avgSodium} sub="weekly average"/><Card icon={Droplets} title="Fluid/hr" value={stats.avgFluid} sub="weekly average oz"/><Card icon={ThermometerSun} title="Sweat Rate" value={stats.avgSweat} sub="oz/hr when weighed"/></section>
    <section className="panel"><h2><HeartPulse/> Morning Readiness</h2>{readiness?<div className="readinessStrip"><span>Weight <b>{readiness.weight||'—'}</b></span><span>Rest HR <b>{readiness.resting_hr||'—'}</b></span><span>Sleep <b>{readiness.sleep_hours||'—'}h</b></span><span>Energy <b>{readiness.energy||'—'}/10</b></span><span>Soreness <b>{readiness.soreness||'—'}/10</b></span></div>:<p className="muted">No morning check-in yet.</p>}</section>
    <section className="panel"><h2><ClipboardList/> Today&apos;s Plan</h2>{todayPlans.length? todayPlans.map(p=><PlannedWorkout key={p.id} p={p} start={startLogFromPlan}/>):<p className="muted">No planned workout today. Add one in Add Plan.</p>}</section>
    <section className="panel"><h2><CheckCircle2/> Today&apos;s Completed Work</h2>{todayLogs.length?todayLogs.map(w=><Workout key={w.id} w={w} del={deleteWorkout}/>):<p className="muted">Nothing logged yet.</p>}</section><section className="panel"><h2>Recent Lab Notes</h2>{workouts.slice(0,5).map(w=><Workout key={w.id} w={w} del={deleteWorkout}/>)}</section></main> }
function Workout({w,del}){ const Icon=TYPES[w.type]?.icon||Activity; return <div className="workout"><div className="workoutTop"><span className="pill"><Icon size={15}/>{w.type}</span><strong>{w.title||'Untitled'}</strong><small>{w.date}</small><button onClick={()=>del(w.id)}><Trash2 size={15}/></button></div><div className="metrics"><span>{w.distance} {TYPES[w.type]?.unit}</span><span>{w.duration} min</span><span>HR {w.avg_hr||'—'}</span><span>{w.temp||'—'}°F</span><span>RPE {w.rpe||'—'}</span><span>Gut {w.gut||'—'}</span><span>Heat {w.heat||'—'}</span><span>{w.cramps?'Cramps':'No cramps'}</span></div><div className="metrics lab"><span>{w.carbs_per_hr||0}g carbs/hr</span><span>{w.sodium_per_hr||0}mg sodium/hr</span><span>{w.fluid_per_hr||0}oz fluid/hr</span>{w.sweat_rate_oz_hr&&<span>{w.sweat_rate_oz_hr}oz sweat/hr</span>}</div>{w.notes&&<p className="notes">{w.notes}</p>}</div> }
function PlannedWorkout({p,start,del}){ const Icon=TYPES[p.type]?.icon||Activity; return <div className={`planned ${p.completed?'done':''}`}><div className="workoutTop"><span className="pill"><Icon size={15}/>{p.type}</span><strong>{p.title||'Planned Workout'}</strong><small>{p.date}</small>{del&&<button onClick={()=>del(p.id)}><Trash2 size={15}/></button>}</div><div className="metrics"><span>{p.planned_duration||'—'} min</span><span>{p.planned_distance||'—'} {TYPES[p.type]?.unit}</span><span>{p.intensity||'Intensity —'}</span><span>{p.completed?'Completed':'Planned'}</span></div>{p.workout_details&&<p className="notes"><b>Workout:</b> {p.workout_details}</p>}{p.fueling_target&&<p className="notes"><b>Fuel:</b> {p.fueling_target}</p>}{!p.completed&&<button className="miniBtn" onClick={()=>start(p)}>Log this workout</button>}</div> }
function Plan({form,setForm,savePlan}){
  const applyTemplate=(name)=>{
    const templates={
      'Easy Run':{type:'Run', title:'Easy aerobic run', planned_duration:'45', planned_distance:'', intensity:'Z2', workout_details:'Easy steady run. Nose breathing effort. No ego.', fueling_target:'Water as needed. Add sodium if hot.'},
      'Long Bike':{type:'Bike', title:'Long endurance ride', planned_duration:'180', planned_distance:'', intensity:'Z2', workout_details:'Smooth aero endurance. Keep HR controlled. Practice fueling every 10-15 minutes.', fueling_target:'80-90g carbs/hr, 900-1200mg sodium/hr, 24-32oz fluid/hr'},
      'Brick':{type:'Bike', title:'Bike + brick run', planned_duration:'150', planned_distance:'', intensity:'Z2/Z3', workout_details:'Bike steady, then short run off the bike. Focus on cooling, cadence, and gut response.', fueling_target:'Race-practice fuel. Log carbs/hr, sodium/hr, fluid/hr, gut, cramps.'},
      'Swim':{type:'Swim', title:'Technique + endurance swim', planned_duration:'45', planned_distance:'2500', intensity:'Smooth', workout_details:'Warm up, drill work, steady aerobic main set, cooldown.', fueling_target:'Normal hydration.'},
      'Recovery':{type:'Bike', title:'Recovery spin + cadence', planned_duration:'45', planned_distance:'', intensity:'Recovery', workout_details:'Easy aerobic reset. Keep it smooth.', fueling_target:'Optional electrolytes only.'}
    };
    setForm({...form,...templates[name]});
  };
  return <main><section className="panel"><h2><CalendarDays/> Add Planned Workout</h2><div className="templateRow"><button type="button" onClick={()=>applyTemplate('Easy Run')}>Easy Run</button><button type="button" onClick={()=>applyTemplate('Long Bike')}>Long Bike</button><button type="button" onClick={()=>applyTemplate('Brick')}>Brick</button><button type="button" onClick={()=>applyTemplate('Swim')}>Swim</button><button type="button" onClick={()=>applyTemplate('Recovery')}>Recovery</button></div><form onSubmit={savePlan} className="form"><label>Date<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label><label>Type<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>{Object.keys(TYPES).map(t=><option key={t}>{t}</option>)}</select></label><label>Title<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Long bike + brick"/></label><label>Planned duration min<input value={form.planned_duration} onChange={e=>setForm({...form,planned_duration:e.target.value})}/></label><label>Planned distance<input value={form.planned_distance} onChange={e=>setForm({...form,planned_distance:e.target.value})}/></label><label>Intensity / Zone<input value={form.intensity} onChange={e=>setForm({...form,intensity:e.target.value})} placeholder="Z2, intervals, recovery"/></label><label className="wide">Workout details<textarea value={form.workout_details} onChange={e=>setForm({...form,workout_details:e.target.value})} placeholder="Example: 20 min easy, 4x10 min Z3, 10 min cooldown"/></label><label className="wide">Fueling target<textarea value={form.fueling_target} onChange={e=>setForm({...form,fueling_target:e.target.value})} placeholder="Example: 80g carbs/hr, 1000mg sodium/hr, 28oz fluid/hr"/></label><label className="wide">Notes<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label><button className="save"><Save size={18}/> Save Planned Workout</button></form></section></main> }
function Log({form,setForm,saveWorkout}){ const fields=[['title','Workout title'],['duration','Duration min'],['distance','Distance'],['avg_hr','Avg HR'],['temp','Temp °F'],['humidity','Humidity %'],['rpe','RPE 1-10'],['gut','Gut 1-10'],['heat','Heat 1-10'],['energy','Energy 1-10'],['carbs','Total carbs g'],['sodium','Total sodium mg'],['fluid','Total fluid oz'],['pre_weight','Pre weight'],['post_weight','Post weight']]; return <main><section className="panel"><h2><Plus/> Log Actual Workout</h2><form onSubmit={saveWorkout} className="form"><label>Date<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label><label>Type<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>{Object.keys(TYPES).map(t=><option key={t}>{t}</option>)}</select></label>{fields.map(([k,p])=><label key={k}>{p}<input value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></label>)}<label className="check"><input type="checkbox" checked={form.cramps} onChange={e=>setForm({...form,cramps:e.target.checked})}/> Cramps?</label><label className="wide">Notes<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Fueling, heat, cramps, gut, mental notes..."/></label><button className="save"><Save size={18}/> Save Workout</button></form></section></main> }
function Calendar({workouts,planned,deletePlan,startLogFromPlan}){
  const [anchor,setAnchor]=useState(weekStart());
  const days=Array.from({length:28},(_,i)=>{const d=new Date(anchor); d.setDate(anchor.getDate()+i); return d;});
  const moveWeeks=(n)=>{const d=new Date(anchor); d.setDate(d.getDate()+n*7); setAnchor(weekStart(d));};
  const today=toISO(new Date());
  const weekLabel=(i)=>{const a=new Date(anchor); a.setDate(anchor.getDate()+i*7); const b=new Date(a); b.setDate(a.getDate()+6); return `${a.toLocaleDateString(undefined,{month:'short',day:'numeric'})} - ${b.toLocaleDateString(undefined,{month:'short',day:'numeric'})}`};
  return <main><section className="panel"><div className="calendarHeader"><div><h2><CalendarDays/> 4-Week Training Calendar</h2><p className="muted">Plan like the family calendar. Add workouts, delete planned workouts, then convert them to actual logs after training.</p></div><div className="calControls"><button onClick={()=>moveWeeks(-4)}>← 4 weeks</button><button onClick={()=>setAnchor(weekStart())}>Today</button><button onClick={()=>moveWeeks(4)}>4 weeks →</button></div></div>
    {[0,1,2,3].map(week=><div key={week} className="weekBlock"><h3 className="weekTitle">Week {week+1}: {weekLabel(week)}</h3><div className="week fourWeeks">{days.slice(week*7,week*7+7).map(d=>{ const iso=toISO(d); const dayPlans=planned.filter(w=>w.date===iso); const dayLogs=workouts.filter(w=>w.date===iso); return <div className={`day ${iso===today?'today':''}`} key={iso}><h3>{d.toLocaleDateString(undefined,{weekday:'short'})}<span>{iso}</span></h3>{dayPlans.length===0&&dayLogs.length===0&&<p className="emptyDay">—</p>}{dayPlans.map(p=><div className={`mini plannedMini ${p.completed?'done':''}`} key={p.id}><div><b>Plan:</b> {p.type} — {p.title}</div><div className="miniMeta">{p.planned_duration||'—'} min · {p.planned_distance||'—'} {TYPES[p.type]?.unit} · {p.intensity||'—'}</div><div className="miniActions">{!p.completed&&<button onClick={()=>startLogFromPlan(p)}>log</button>}<button className="danger" onClick={()=>deletePlan(p.id)}>delete</button></div></div>)}{dayLogs.map(w=><div className={`mini ${w.type}`} key={w.id}><b>Done:</b> {w.type}: {w.title||`${w.distance} ${TYPES[w.type]?.unit}`}<div className="miniMeta">{w.duration||'—'} min · Gut {w.gut||'—'} · Heat {w.heat||'—'}</div></div>)}</div>})}</div></div>)}
    </section></main> }

function Readiness({form,setForm,saveReadiness,readiness}){ const fields=[['weight','Weight'],['resting_hr','Resting HR'],['sleep_hours','Sleep hours'],['hrv','HRV'],['energy','Energy 1-10'],['soreness','Soreness 1-10'],['mood','Mood 1-10']]; return <main><section className="panel"><h2><Scale/> Morning Readiness</h2><form onSubmit={saveReadiness} className="form"><label>Date<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label>{fields.map(([k,p])=><label key={k}>{p}<input value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></label>)}<label className="wide">Notes<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label><button className="save"><Save size={18}/> Save Readiness</button></form></section><section className="panel"><h2>Recent Check-ins</h2>{readiness.slice(0,10).map(r=><div className="readinessStrip" key={r.id}><span>{r.date}</span><span>Weight <b>{r.weight||'—'}</b></span><span>RHR <b>{r.resting_hr||'—'}</b></span><span>Sleep <b>{r.sleep_hours||'—'}h</b></span><span>Energy <b>{r.energy||'—'}</b></span></div>)}</section></main> }


function FuelLab({workouts}){
  const sessions=workouts.filter(w=>num(w.duration)>0).slice(0,30);
  const hot=sessions.filter(w=>num(w.temp)>=80);
  const cramped=sessions.filter(w=>w.cramps);
  const noCramp=sessions.filter(w=>!w.cramps);
  const badGut=sessions.filter(w=>num(w.gut)>0 && num(w.gut)<=5);
  const goodGut=sessions.filter(w=>num(w.gut)>=8);
  const row=(label,arr)=><tr><td>{label}</td><td>{arr.length}</td><td>{avg(arr.map(w=>w.carbs_per_hr))}</td><td>{avg(arr.map(w=>w.sodium_per_hr))}</td><td>{avg(arr.map(w=>w.fluid_per_hr))}</td><td>{avg(arr.map(w=>w.temp))}</td><td>{avg(arr.map(w=>w.gut))}</td></tr>;
  return <main><section className="panel"><h2><FlaskConical/> Fuel Lab</h2><p className="muted">This is the Eagleman fix without needing an Eagleman page: compare gut, cramps, heat, carbs, sodium, and fluid across real workouts.</p><div className="labGrid"><Card icon={Gauge} title="Avg Carbs/hr" value={avg(sessions.map(w=>w.carbs_per_hr))} sub="recent workouts"/><Card icon={Gauge} title="Avg Sodium/hr" value={avg(sessions.map(w=>w.sodium_per_hr))} sub="recent workouts"/><Card icon={Droplets} title="Avg Fluid/hr" value={avg(sessions.map(w=>w.fluid_per_hr))} sub="oz/hr"/><Card icon={Flame} title="Hot Sessions" value={hot.length} sub="80°F+"/></div><table className="dataTable"><thead><tr><th>Bucket</th><th>#</th><th>Carbs/hr</th><th>Sodium/hr</th><th>Fluid/hr</th><th>Temp</th><th>Gut</th></tr></thead><tbody>{row('All recent',sessions)}{row('Hot 80°F+',hot)}{row('Cramped',cramped)}{row('No cramps',noCramp)}{row('Gut 8-10',goodGut)}{row('Gut 1-5',badGut)}</tbody></table></section><section className="panel"><h2>Cramp / Gut Investigation</h2><p className="muted">What we are looking for: cramps clustering with low sodium/fluid, gut crashes clustering with high carbs plus high heat, or both happening together.</p>{sessions.slice(0,10).map(w=><Workout key={w.id} w={w} del={()=>{}} />)}</section></main>
}
function MarylandPredictor({workouts,race}){
  const swim=workouts.filter(w=>w.type==='Swim'&&num(w.distance)>0&&num(w.duration)>0).slice(0,8);
  const bike=workouts.filter(w=>w.type==='Bike'&&num(w.distance)>0&&num(w.duration)>0).slice(0,8);
  const run=workouts.filter(w=>w.type==='Run'&&num(w.distance)>0&&num(w.duration)>0).slice(0,8);
  const bikeMph=avg(bike.map(w=>num(w.distance)/(num(w.duration)/60)));
  const runPace=avg(run.map(w=>num(w.duration)/num(w.distance)));
  const swimPace100=avg(swim.map(w=>num(w.duration)/(num(w.distance)/100)));
  const bikeTime=bikeMph==='—'?null:112/Number(bikeMph)*60;
  const runTime=runPace==='—'?null:26.2*Number(runPace);
  const swimTime=swimPace100==='—'?null:(4224/100)*Number(swimPace100);
  const t1=8,t2=6;
  const total=[swimTime,bikeTime,runTime].every(Boolean)?swimTime+bikeTime+runTime+t1+t2:null;
  const fmt=m=>!m?'—':`${Math.floor(m/60)}:${String(Math.round(m%60)).padStart(2,'0')}`;
  return <main><section className="panel predictor"><h2><Timer/> Race Predictor</h2><p className="muted">Early rough estimate for {race?.name || 'your target race'} based on recent logged workouts. This gets smarter as we add more real data.</p><div className="predictGrid"><div><span>Swim estimate</span><strong>{fmt(swimTime)}</strong><small>{swimPace100} min/100 yd sample pace</small></div><div><span>Bike estimate</span><strong>{fmt(bikeTime)}</strong><small>{bikeMph} mph sample speed</small></div><div><span>Run estimate</span><strong>{fmt(runTime)}</strong><small>{runPace} min/mi sample pace</small></div><div className="totalPredict"><span>Projected Finish</span><strong>{fmt(total)}</strong><small>includes 8m T1 + 6m T2</small></div></div></section><section className="panel"><h2>What Moves The Number</h2><div className="coachNotes"><p><b>Biggest levers:</b> long bike durability, run-off-bike heat control, gut score 8+, and cramp-free sodium/fluid execution.</p><p><b>Next upgrade:</b> custom race distance, goal splits, and race-specific simulation entries.</p></div></section></main>
}
function CoachReport({workouts,planned,readiness}){
  const ws=weekStart(); const week=workouts.filter(w=>new Date(w.date)>=ws); const pweek=planned.filter(w=>new Date(w.date)>=ws&&new Date(w.date)<new Date(ws.getTime()+7*86400000));
  const plannedMin=pweek.reduce((a,w)=>a+num(w.planned_duration),0); const doneMin=week.reduce((a,w)=>a+num(w.duration),0); const compliance=plannedMin?Math.round(doneMin/plannedMin*100):null;
  const notes=[];
  if(week.filter(w=>num(w.temp)>=80).length===0) notes.push('No heat sessions logged this week yet. Add controlled heat exposure when safe.');
  if(avg(week.map(w=>w.gut))!=='—' && Number(avg(week.map(w=>w.gut)))<7) notes.push('Gut score is trending low. Review carbs/hr, heat, and concentration.');
  if(week.some(w=>w.cramps)) notes.push('Cramping logged this week. Compare sodium/hr and fluid/hr in Fuel Lab.');
  if(!notes.length) notes.push('Clean week so far. Keep stacking boring consistency.');
  return <main><section className="panel"><h2><ClipboardList/> Weekly Coach Report</h2><div className="reportGrid"><Card icon={Timer} title="Completed" value={`${(doneMin/60).toFixed(1)} h`} sub="this week"/><Card icon={CalendarDays} title="Planned" value={`${(plannedMin/60).toFixed(1)} h`} sub="this week"/><Card icon={CheckCircle2} title="Compliance" value={compliance?`${compliance}%`:'—'} sub="done vs planned"/><Card icon={Scale} title="Latest Weight" value={readiness[0]?.weight||'—'} sub="morning check-in"/></div><div className="coachNotes"><h3>Coach Notes</h3>{notes.map((n,i)=><p key={i}>• {n}</p>)}</div></section><section className="panel"><h2>This Week Completed</h2>{week.length?week.map(w=><Workout key={w.id} w={w} del={()=>{}}/>):<p className="muted">No completed workouts logged this week yet.</p>}</section></main>
}

function SweatCalculator(){
  const [f,setF]=useState({duration:'90',pre:'185',post:'183.5',fluid:'40',pee:'0'});
  const hrs=num(f.duration)/60;
  const netLoss=(num(f.pre)-num(f.post))*16;
  const sweat=hrs?Math.round((netLoss+num(f.fluid)-num(f.pee))/hrs):0;
  const pct=num(f.pre)?(((num(f.pre)-num(f.post))/num(f.pre))*100).toFixed(1):'0.0';
  return <main><section className="panel"><h2><Droplets/> Sweat Rate Calculator</h2><p className="muted">Use this after hot rides/runs. This is how we stop guessing on fluids and sodium.</p><div className="form"><label>Duration min<input value={f.duration} onChange={e=>setF({...f,duration:e.target.value})}/></label><label>Pre weight lb<input value={f.pre} onChange={e=>setF({...f,pre:e.target.value})}/></label><label>Post weight lb<input value={f.post} onChange={e=>setF({...f,post:e.target.value})}/></label><label>Fluid consumed oz<input value={f.fluid} onChange={e=>setF({...f,fluid:e.target.value})}/></label><label>Bathroom fluid loss oz<input value={f.pee} onChange={e=>setF({...f,pee:e.target.value})}/></label></div><div className="predictGrid"><div className="totalPredict"><span>Sweat Rate</span><strong>{sweat||'—'} oz/hr</strong><small>training estimate</small></div><div><span>Body Weight Loss</span><strong>{pct}%</strong><small>before replacing fluids</small></div><div><span>Fluid Target</span><strong>{sweat?`${Math.round(sweat*.75)}-${sweat}`:'—'} oz/hr</strong><small>race-practice range</small></div><div><span>Sodium Test Range</span><strong>900-1300</strong><small>mg/hr starting point</small></div></div></section></main>
}

function RaceSimulations({workouts}){
  const [note,setNote]=useState('');
  const [sims,setSims]=useState(JSON.parse(localStorage.getItem('ironman_sims')||'[]'));
  const longBikes=workouts.filter(w=>w.type==='Bike'&&num(w.duration)>=120).length;
  const longRuns=workouts.filter(w=>w.type==='Run'&&num(w.duration)>=75).length;
  const bricks=workouts.filter(w=>(w.title||'').toLowerCase().includes('brick') || (w.notes||'').toLowerCase().includes('brick')).length;
  const hot=workouts.filter(w=>num(w.temp)>=80&&num(w.duration)>=45).length;
  const score=Math.min(100,longBikes*12+longRuns*10+bricks*10+hot*6);
  function saveSim(){ if(!note.trim()) return; const next=[{id:crypto.randomUUID(),date:toISO(new Date()),note},...sims]; setSims(next); localStorage.setItem('ironman_sims',JSON.stringify(next)); setNote(''); }
  return <main><section className="panel"><h2><TestTube2/> Race Simulation Tracker</h2><p className="muted">Mark the key race rehearsal days: long bike, brick run, hot sessions, nutrition tests, and full race-practice fueling.</p><div className="predictGrid"><div className="totalPredict"><span>Simulation Score</span><strong>{score}</strong><small>0-100 readiness signal</small></div><div><span>Long Bikes</span><strong>{longBikes}</strong><small>2h+ logged</small></div><div><span>Long Runs</span><strong>{longRuns}</strong><small>75m+ logged</small></div><div><span>Hot Sessions</span><strong>{hot}</strong><small>80°F+ practice</small></div></div><label className="wide analysisNotes">Simulation note<textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Example: Race Sim #1 — 3hr bike + 30min run, 85g carbs/hr, 1100mg sodium/hr, gut 9, no cramps."/></label><button className="save" onClick={saveSim}><Save size={18}/> Save Simulation Note</button></section><section className="panel"><h2>Saved Sim Notes</h2>{sims.length?sims.map(s=><div className="experiment" key={s.id}><small>{s.date}</small><p>{s.note}</p></div>):<p className="muted">No simulation notes yet.</p>}</section></main>
}

function fileToDataUrl(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=reject;
    reader.readAsDataURL(file);
  });
}

function safeJson(text){
  if(!text) return null;
  try{return JSON.parse(text)}catch{}
  const match=text.match(/\{[\s\S]*\}/);
  if(match){ try{return JSON.parse(match[0])}catch{} }
  return null;
}

function ScreenshotAnalysis(){
  const [files,setFiles]=useState([]);
  const [notes,setNotes]=useState('');
  const [kind,setKind]=useState('Bike');
  const [analyzing,setAnalyzing]=useState(false);
  const [analysis,setAnalysis]=useState('');
  const [fields,setFields]=useState(null);
  const previews=files.map(f=>({name:f.name,url:URL.createObjectURL(f)}));
  const prompt = `
The athlete is an experienced endurance athlete with:

- Multiple Full Ironman finishes
- Multiple Half Ironman finishes
- Current goal is long-course triathlon performance
- Uses heart rate zones extensively
- Frequently performs brick workouts
- Prioritizes pacing discipline
- Wants honest coaching feedback

Do not provide generic beginner advice.

Assume the athlete understands endurance terminology and wants detailed performance analysis.

You are an elite Ironman coach, exercise physiologist, and endurance performance analyst.

Analyze these Garmin screenshots as if you were coaching an athlete preparing for a Half Ironman, Full Ironman, marathon, triathlon, duathlon, or endurance race.

Extract every visible metric possible including:

- workout type
- distance
- duration
- pace
- speed
- average heart rate
- maximum heart rate
- elevation gain
- calories
- cadence
- stroke rate
- power
- lap data
- splits
- training effect
- aerobic training effect
- anaerobic training effect
- temperature
- hydration notes
- nutrition notes

If a metric is not visible, state "not available" rather than guessing.

Then provide a detailed coach report using the following sections:

1. WORKOUT SUMMARY
2. EXECUTION SCORE (1-10)
3. FITNESS IMPACT
4. PACING ANALYSIS
5. HEART RATE ANALYSIS
6. HEAT AND ENVIRONMENTAL IMPACT
7. FUELING AND HYDRATION REVIEW
8. TECHNIQUE REVIEW
9. RED FLAGS
10. WHAT THIS MEANS FOR RACE DAY
11. NEXT WORKOUT RECOMMENDATIONS
12. COACH'S BOTTOM LINE

Be specific.
Be data-driven.
Avoid generic motivational language.
Think like a professional endurance coach preparing an athlete for peak race performance.

Workout type: ${kind}
Athlete notes: ${notes || "None provided"}

Analyze all uploaded screenshots and return:
1. Structured workout data
2. Detailed coach report
3. Specific recommendations
`;
  async function copyPrompt(){ try{ await navigator.clipboard.writeText(prompt); alert('AI analysis prompt copied. Drop the screenshots into ChatGPT and paste this prompt.'); }catch{ alert(prompt); } }
  async function analyzeWithAI(){
    if(!files.length){ alert('Add at least one Garmin screenshot first.'); return; }
    setAnalyzing(true); setAnalysis(''); setFields(null);
    try{
      const images=await Promise.all(files.slice(0,8).map(async f=>({name:f.name,type:f.type,dataUrl:await fileToDataUrl(f)})));
      const res=await fetch('/.netlify/functions/analyze-garmin',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({kind,notes,images})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data.error || `AI request failed (${res.status})`);
      const text=data.analysis || data.text || '';
      setAnalysis(text);
      setFields(data.fields || safeJson(text)?.fields || safeJson(text));
    }catch(err){
      alert(err.message || 'AI analysis failed');
    }finally{
      setAnalyzing(false);
    }
  }
  function applyToLog(){
    if(!fields){ alert('No extracted fields found yet.'); return; }
    const next={...form};
    alert('Next upgrade will auto-fill Log Actual. For now, copy the extracted fields below into Log Actual.');
  }
  return <main>
    <section className="panel">
      <h2><UploadCloud/> Garmin Screenshot AI Analysis</h2>
      <p className="muted">Upload Garmin screenshots, then run AI analysis through your Netlify backend. Your OpenAI key stays private in Netlify.</p>
      <label>Workout type<select className="inlineSelect" value={kind} onChange={e=>setKind(e.target.value)}>{Object.keys(TYPES).map(t=><option key={t}>{t}</option>)}</select></label>
      <label className="dropZone">
        <UploadCloud size={34}/>
        <strong>Choose Garmin screenshots</strong>
        <span>Overview, charts, laps, HR zones, pace, temp, cadence, training effect</span>
        <input type="file" multiple accept="image/*" onChange={e=>{setFiles(Array.from(e.target.files||[])); setAnalysis(''); setFields(null);}}/>
      </label>
      <label className="wide analysisNotes">Workout notes / what you want analyzed<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Example: Long brick. Felt hot. Gut okay until mile 8. Check HR drift and sodium/fluid targets."/></label>
      <div className="aiActions">
        <button className="save" onClick={analyzeWithAI} disabled={analyzing}>{analyzing ? 'Analyzing...' : 'Run AI Analysis'}</button>
        <button onClick={copyPrompt}><ClipboardList size={18}/> Copy Prompt Backup</button>
      </div>
      {files.length>0 && <div className="previewGrid">{previews.map(p=><div className="preview" key={p.name}><img src={p.url}/><span><ImageIcon size={14}/> {p.name}</span></div>)}</div>}
      {fields && <div className="aiBox"><h3>Extracted Fields</h3><pre>{JSON.stringify(fields,null,2)}</pre></div>}
      {analysis && <div className="aiBox"><h3>AI Analysis</h3><p>{analysis}</p></div>}
      <div className="aiBox"><h3>Prompt Backup</h3><p>{prompt}</p></div>
    </section>
  </main>
}

function Experiments({experiment,setExperiment,saveExperiment,experiments}){ return <main><section className="panel"><h2><FlaskConical/> Experiments</h2><form onSubmit={saveExperiment} className="form exp"><label>Experiment<input value={experiment.title} onChange={e=>setExperiment({...experiment,title:e.target.value})} placeholder="1200mg sodium/hr hot ride"/></label><label>Hypothesis<textarea value={experiment.hypothesis} onChange={e=>setExperiment({...experiment,hypothesis:e.target.value})}/></label><label>Protocol<textarea value={experiment.protocol} onChange={e=>setExperiment({...experiment,protocol:e.target.value})}/></label><label>Result<textarea value={experiment.result} onChange={e=>setExperiment({...experiment,result:e.target.value})}/></label><button className="save"><Save size={18}/> Save Experiment</button></form></section><section className="panel">{experiments.map(x=><div className="experiment" key={x.id}><h3>{x.title}</h3><small>{x.date}</small><p><b>Hypothesis:</b> {x.hypothesis}</p><p><b>Protocol:</b> {x.protocol}</p><p><b>Result:</b> {x.result}</p></div>)}</section></main> }

createRoot(document.getElementById('root')).render(<App/>);
