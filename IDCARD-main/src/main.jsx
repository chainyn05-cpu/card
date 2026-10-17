import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import { toPng } from 'html-to-image'
import jsPDF from 'jspdf'
import { IdCard, Users, Download, Printer, Search, Upload, CheckCircle2, AlertCircle, ShieldCheck, ImagePlus, RefreshCw } from 'lucide-react'
import './styles.css'

// Cloud mode is the default for the deployable package.
// Set VITE_DEMO_MODE=true only when you intentionally want browser-local demo data.
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'
// Accept only the Supabase project root URL. If someone pasted a REST/Storage
// endpoint instead, trim the extra path so Supabase JS can build valid request URLs.
function normalizeSupabaseUrl(value) {
  const raw = String(value || '').trim().replace(/\/+$/, '')
  if (!raw || raw.includes('YOUR-PROJECT')) return ''
  try {
    const parsed = new URL(raw)
    if (!['https:', 'http:'].includes(parsed.protocol)) return ''
    // Project URL is the origin; remove accidental /rest/v1, /storage/v1, etc.
    return parsed.origin
  } catch {
    return ''
  }
}
const SUPABASE_URL = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL)
const SUPABASE_ANON_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()
const CLOUD_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('YOUR_'))
const supabase = !DEMO_MODE && CLOUD_CONFIGURED ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null

const BRANDS = [
  { id: 'PUZZLE', name: 'PUZZLE', logo: '/logos/puzzle.png', color: '#0647d9', desc: 'PUZZLE' },
  { id: 'BAT', name: 'BAT', logo: '/logos/bat.png', color: '#e11d35', desc: 'BAT' },
  { id: 'POS TRAIN', name: 'POS TRAIN', logo: '/logos/pos-train.png', color: '#15965b', desc: 'POS TRAIN' },
]
const blank = { brand: 'PUZZLE', full_name: '', position: '', employee_id: '', phone: '', department: '', photo: '' }
const localKey = 'employee-id-card-generator-records-v1'

function readLocal() { try { return JSON.parse(localStorage.getItem(localKey) || '[]') } catch { return [] } }
function saveLocal(records) { localStorage.setItem(localKey, JSON.stringify(records)) }
function App() {
  const [tab, setTab] = useState('submit')
  const [form, setForm] = useState(blank)
  const [records, setRecords] = useState([])
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [photoZoom, setPhotoZoom] = useState(1)
  const [photoX, setPhotoX] = useState(50)
  const [photoY, setPhotoY] = useState(50)
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [cloudMode, setCloudMode] = useState(Boolean(supabase))
  const [activeRecord, setActiveRecord] = useState(null)
  const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem('company99_admin_token') || '')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminBusy, setAdminBusy] = useState(false)

  const brand = BRANDS.find(b => b.id === form.brand) || BRANDS[0]
  const activeBrand = BRANDS.find(b => b.id === (activeRecord?.brand || form.brand)) || BRANDS[0]

  useEffect(() => {
    if (!supabase) setRecords(readLocal())
  }, [])

  useEffect(() => {
    if (tab !== 'admin' || (supabase && !adminToken)) return
    loadRecords()
    if (!supabase) return
    const timer = window.setInterval(() => loadRecords(), 10000)
    return () => window.clearInterval(timer)
  }, [tab, adminToken])

  async function loadRecords() {
    if (!supabase) { setRecords(readLocal()); return }
    if (!adminToken) { setRecords([]); return }
    const response = await fetch('/api/admin-data', { headers: { Authorization: `Bearer ${adminToken}` } })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      if (response.status === 401) { sessionStorage.removeItem('company99_admin_token'); setAdminToken(''); setRecords([]) }
      setNotice('មិនអាចទាញយកទិន្នន័យបាន៖ ' + (result.error || 'សូមចូល Admin ម្តងទៀត'))
      return
    }
    setRecords(result.records || [])
  }

  async function loginAdmin(e) {
    e.preventDefault(); setAdminBusy(true); setNotice('')
    try {
      const response = await fetch('/api/admin-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: adminPassword }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Password មិនត្រឹមត្រូវ')
      sessionStorage.setItem('company99_admin_token', result.token)
      setAdminToken(result.token); setAdminPassword('')
      setNotice('ចូល Admin បានជោគជ័យ។')
    } catch (err) { setNotice(err.message || 'មិនអាចចូលបាន') }
    finally { setAdminBusy(false) }
  }

  function logoutAdmin() {
    sessionStorage.removeItem('company99_admin_token')
    setAdminToken(''); setAdminPassword(''); setRecords([])
    setNotice('បានចាកចេញពី Admin។')
  }

  function update(k, v) { setForm(prev => ({ ...prev, [k]: v })) }
  function onPhoto(e) {
    const input = e.currentTarget
    const file = input.files?.[0]
    if (!file) return
    // Allow selecting the same image again after a failed/changed selection.
    input.value = ''
    if (!file.type.startsWith('image/')) { setNotice('សូមជ្រើសរើសឯកសាររូបភាព។'); return }
    if (file.size > 5 * 1024 * 1024) { setNotice('រូបថតត្រូវមានទំហំតិចជាង 5MB។'); return }
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result || '')
      setPhotoPreview(dataUrl)
      setPhotoZoom(1); setPhotoX(50); setPhotoY(50)
      update('photo', dataUrl)
    }
    reader.onerror = () => setNotice('មិនអាចអានរូបថតបានទេ។ សូមសាកល្បងរូបភាពផ្សេង។')
    reader.readAsDataURL(file)
  }

  async function submitForm(e) {
    e.preventDefault()
    setNotice('')
    if (!form.full_name.trim() || !form.position.trim() || (!photoFile && !form.photo)) {
      setNotice('សូមបំពេញឈ្មោះ តួនាទី និងបញ្ចូលរូបថត។'); return
    }
    if (!DEMO_MODE && !supabase) {
      setNotice('Supabase មិនទាន់កំណត់ត្រឹមត្រូវទេ។ VITE_SUPABASE_URL ត្រូវជា Project URL ដើម (ឧ. https://xxxxx.supabase.co) មិនមែន /rest/v1 ឬ /storage/v1 ហើយ VITE_SUPABASE_ANON_KEY ត្រូវជា Publishable/anon key។ សូមកែ Variables រួច Redeploy។')
      return
    }
    setBusy(true)
    try {
      if (supabase) {
        let photo_path = null
        if (photoFile) {
          const ext = photoFile.name.split('.').pop()?.toLowerCase() || 'jpg'
          photo_path = `${form.brand.toLowerCase().replace(/\s+/g, '-')}/${crypto.randomUUID()}.${ext}`
          const { error: uploadError } = await supabase.storage.from('employee-photos').upload(photo_path, photoFile, { upsert: false, contentType: photoFile.type })
          if (uploadError) throw uploadError
        }
        const { error } = await supabase.from('employees').insert([{
          brand: form.brand, full_name: form.full_name.trim(), position: form.position.trim(),
          employee_id: '', phone: form.phone.trim(), department: form.department.trim(),
          photo_path, status: 'Pending'
        }])
        if (error) throw error
        setNotice('បានបញ្ជូនព័ត៌មានជោគជ័យ! ព័ត៌មានត្រូវបានរក្សាទុក និងបង្ហាញក្នុង Dashboard។')
      } else {
        const entry = { ...form, id: crypto.randomUUID(), status: 'Pending', created_at: new Date().toISOString(), photo: photoPreview || form.photo }
        const next = [entry, ...readLocal()]
        saveLocal(next); setRecords(next)
        setActiveRecord(entry)
        setNotice('បានរក្សាទុក Demo នៅលើ Browser នេះ។ ដើម្បីឱ្យអ្នកទទួលបានពីឧបករណ៍ផ្សេង សូមភ្ជាប់ Supabase តាម README។')
      }
      setActiveRecord(null)
    } catch (err) {
      setNotice('មានបញ្ហា៖ ' + (err?.message || 'មិនអាចរក្សាទុកបាន'))
    } finally { setBusy(false) }
  }

  function openAdmin() { setNotice(''); setTab('admin') }

  async function downloadCard(record, format = 'png') {
    if (!record?.full_name?.trim() || !record?.position?.trim() || !(record?.photo || photoPreview)) {
      setNotice('សូមបំពេញឈ្មោះ តួនាទី និងបញ្ចូលរូបថត មុនពេល Download ID Card។')
      return
    }
    const node = document.getElementById(`idcard-${record.id || 'preview'}`)
    if (!node) { setNotice('មិនអាចរកឃើញកាតបានទេ។'); return }
    try {
      const dataUrl = await toPng(node, { pixelRatio: 3, cacheBust: true, backgroundColor: '#101116' })
      const name = `${(record.full_name || 'employee').replace(/[^a-z0-9-_]/gi, '-')}-ID`
      if (format === 'pdf') {
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [54, 86] })
        pdf.addImage(dataUrl, 'PNG', 0, 0, 54, 86)
        pdf.save(`${name}.pdf`)
      } else {
        const a = document.createElement('a'); a.href = dataUrl; a.download = `${name}.png`; a.click()
      }
    } catch (err) { setNotice('Download មានបញ្ហា៖ ' + err.message) }
  }

  function exportCsv() {
    const rows = [
      ['Company', 'Full Name', 'Position', 'Phone', 'Department', 'Status', 'Submitted At'],
      ...filtered.map(r => [
        r.brand || '', r.full_name || '', r.position || '',
        r.phone || '', r.department || '', r.status || 'Pending', r.created_at || ''
      ])
    ]
    const csv = '\uFEFF' + rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'company99-employee-id-submissions.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  async function exportAllPdf() {
    const approved = filtered
    if (!approved.length) { setNotice('មិនទាន់មានកាតសម្រាប់ Export ទេ។'); return }
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    let count = 0
    for (const r of approved) {
      const node = document.getElementById(`idcard-${r.id}`)
      if (!node) continue
      const data = await toPng(node, { pixelRatio: 2, cacheBust: true, backgroundColor: '#101116' })
      const x = 8 + (count % 3) * 63
      const y = 8 + Math.floor(count % 9 / 3) * 93
      if (count > 0 && count % 9 === 0) pdf.addPage()
      pdf.addImage(data, 'PNG', x, y, 54, 86)
      count++
    }
    pdf.save('approved-employee-id-cards-a4.pdf')
  }

  const filtered = useMemo(() => records.filter(r => [r.full_name, r.brand, r.position, r.department].join(' ').toLowerCase().includes(search.toLowerCase())), [records, search])
  const previewRecord = activeRecord || { ...form, id: 'preview', photo: photoPreview || form.photo, status: 'Preview' }

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand-lockup"><div className="brand-mark"><IdCard size={23}/></div><div><strong>ID CARD STUDIO</strong><span>EMPLOYEE REGISTRATION PORTAL</span></div></div>
      <div className="top-actions"><span className={`connection ${supabase ? 'connected' : ''}`}><i/> {supabase ? 'CLOUD READY' : DEMO_MODE ? 'DEMO MODE' : 'CLOUD SETUP REQUIRED'}</span></div>
    </header>

    <main className="main">
      <nav className="tabs">
        <button className={tab === 'submit' ? 'tab active' : 'tab'} onClick={() => {setTab('submit'); setActiveRecord(null)}}><ImagePlus size={17}/> Registration Form</button>
        <button className={tab === 'admin' ? 'tab active' : 'tab'} onClick={openAdmin}><ShieldCheck size={17}/> Admin Dashboard</button>
      </nav>

      {tab === 'submit' ? <div className="workspace">
        <section className="panel form-panel">
          <div className="panel-heading"><div><span className="eyebrow">STEP 01 / INFORMATION</span><h2>បញ្ចូលព័ត៌មានបុគ្គលិក</h2><p>Fields with * are required.</p></div><div className="step-number">01</div></div>
          <form onSubmit={submitForm}>
            <label className="field-label">ជ្រើសរើសក្រុមហ៊ុន / BRAND *</label>
            <div className="brand-choices">{BRANDS.map(b => <button type="button" key={b.id} className={`brand-choice ${form.brand === b.id ? 'selected' : ''}`} onClick={() => update('brand', b.id)}><span className="brand-logo"><img src={b.logo} alt={b.name}/></span><span>{b.name}</span>{form.brand === b.id && <CheckCircle2 className="choice-check" size={16}/>}</button>)}</div>
            <div className="form-grid">
              <div className="field full"><label>ឈ្មោះពេញ / Full name *</label><input value={form.full_name} onChange={e => update('full_name', e.target.value)} placeholder="ឧ. Sok Dara" required/></div>
              <div className="field"><label>តួនាទី / Position *</label><input value={form.position} onChange={e => update('position', e.target.value)} placeholder="ឧ. Bartender" required/></div>
              <div className="field"><label>លេខទូរស័ព្ទ / Phone</label><input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="0XX XXX XXX"/></div>
              <div className="field"><label>ផ្នែក / Department</label><input value={form.department} onChange={e => update('department', e.target.value)} placeholder="ឧ. Service"/></div>
            </div>
            <label className="field-label photo-label">រូបថតបុគ្គលិក / PHOTO *</label>
            <label className="upload-box">
              {photoPreview ? <img src={photoPreview} alt="Employee preview" onError={() => { setPhotoPreview(''); update('photo', ''); setNotice('មិនអាចបង្ហាញរូបនេះបានទេ។ សូមជ្រើសរើសរូប JPG ឬ PNG ម្តងទៀត។') }}/> : <div className="upload-placeholder"><Upload size={24}/><b>Click to upload photo</b><span>JPG, PNG • Up to 5MB</span></div>}
              <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose employee photo" onChange={onPhoto}/>
              {photoPreview && <span className="replace-photo">Change photo</span>}
            </label>
            {photoPreview && <div className="crop-controls">
              <div className="crop-control"><label>Zoom <b>{photoZoom.toFixed(1)}×</b></label><input type="range" min="1" max="2.5" step="0.1" value={photoZoom} onChange={e => setPhotoZoom(Number(e.target.value))}/></div>
              <div className="crop-control"><label>Horizontal</label><input type="range" min="0" max="100" value={photoX} onChange={e => setPhotoX(Number(e.target.value))}/></div>
              <div className="crop-control"><label>Vertical</label><input type="range" min="0" max="100" value={photoY} onChange={e => setPhotoY(Number(e.target.value))}/></div>
              <button type="button" className="ghost small" onClick={() => {setPhotoZoom(1);setPhotoX(50);setPhotoY(50)}}>Reset crop</button>
            </div>}
            <div className="form-foot"><span><ShieldCheck size={16}/> សូមពិនិត្យព័ត៌មានមុន Submit</span><button className="primary" disabled={busy}>{busy ? 'កំពុងរក្សាទុក…' : 'Submit Information'} <span>↗</span></button></div>
          </form>
          {notice && <div className="notice"><AlertCircle size={17}/><span>{notice}</span></div>}
        </section>

        <aside className="preview-column">
          <div className="preview-heading"><div><span className="eyebrow">STEP 02 / LIVE PREVIEW</span><h2>ID Card Preview</h2></div><span className="live-pill"><i/> LIVE</span></div>
          <p className="muted">ទម្រង់កាតបញ្ឈរ • 54 × 86 mm</p>
          <IDCard record={previewRecord} brand={activeBrand} photoX={photoX} photoY={photoY} photoZoom={photoZoom}/>
          <div className="preview-actions"><button className="secondary" onClick={() => downloadCard(previewRecord, 'png')}><Download size={16}/> Download My ID (PNG)</button><button className="secondary" onClick={() => downloadCard(previewRecord, 'pdf')}><Download size={16}/> PDF Print</button></div>
          <div className="tip"><div className="tip-icon">✦</div><div><b>Print tip</b><p>Download PDF សម្រាប់ទំហំ 54 × 86 mm។</p></div></div>
        </aside>
      </div> : <section className="panel dashboard">
        {supabase && !adminToken ? <div className="login-box">
          <div className="login-icon"><ShieldCheck size={26}/></div><h3>Admin Dashboard — Restricted</h3>
          <p>សូមបញ្ចូលលេខសម្ងាត់ Admin ដើម្បីមើលទិន្នន័យបុគ្គលិក។</p>
          <form className="admin-login-form" onSubmit={loginAdmin}>
            <input type="password" autoComplete="current-password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="Admin password" required />
            <button className="primary" disabled={adminBusy}>{adminBusy ? 'កំពុងផ្ទៀងផ្ទាត់…' : 'Unlock Dashboard'}</button>
          </form>
        </div> : <>
        <div className="panel-heading dash-heading"><div><span className="eyebrow">STAFF DATABASE</span><h2>Admin Dashboard</h2><p>មើល ពិនិត្យ និងរៀបចំកាតបុគ្គលិក</p></div><div className="dash-actions">{supabase && <><button className="secondary" onClick={loadRecords}><RefreshCw size={16}/> Refresh</button><button className="secondary" onClick={logoutAdmin}>Lock / Logout</button></>}<button className="secondary" onClick={exportCsv}><Download size={16}/> Export Excel / CSV</button><button className="primary" onClick={exportAllPdf}><Printer size={16}/> Export All Cards A4</button></div></div>
        {!supabase && !DEMO_MODE ? <div className="login-box"><div className="login-icon"><AlertCircle size={26}/></div><h3>Supabase setup required</h3><p>សូមកំណត់ VITE_SUPABASE_URL និង VITE_SUPABASE_ANON_KEY ក្នុង Vercel រួច Redeploy។</p></div> : <>
          <div className="stats"><div><span>Total employees</span><b>{records.length}</b></div><div><span>PUZZLE</span><b>{records.filter(r => r.brand === 'PUZZLE').length}</b></div><div><span>BAT</span><b>{records.filter(r => r.brand === 'BAT').length}</b></div><div><span>POS TRAIN</span><b>{records.filter(r => r.brand === 'POS TRAIN').length}</b></div></div>
          {!supabase && DEMO_MODE && <div className="demo-warning"><AlertCircle size={17}/> Demo mode: ទិន្នន័យនៅតែរក្សាទុកក្នុង Browser នេះប៉ុណ្ណោះ។</div>}
          <div className="table-tools"><div className="searchbox"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="ស្វែងរកឈ្មោះ, ផ្នែក, ក្រុមហ៊ុន…"/></div><span>{filtered.length} records</span></div>
          <div className="employee-list">{filtered.length ? filtered.map(row => <div className="employee-row" key={row.id}><div className="employee-avatar">{row.photo ? <img src={row.photo} alt=""/> : <span>{row.full_name?.slice(0,1) || '?'}</span>}</div><div className="employee-info"><b>{row.full_name}</b><span>{row.position} • {row.department || row.brand}</span></div><span className="brand-chip">{row.brand}</span><span className="status approved">Submitted</span><div className="row-actions"><button title="Preview" onClick={() => {setActiveRecord(row); setForm({...blank, ...row}); setPhotoPreview(row.photo || ''); setTab('submit')}}><IdCard size={16}/></button><button title="Download PNG" onClick={() => downloadCard(row, 'png')}><Download size={16}/></button></div><div className="hidden-card"><IDCard record={row} brand={BRANDS.find(b => b.id === row.brand) || BRANDS[0]} elementId={`idcard-${row.id}`}/></div></div>) : <div className="empty"><Users size={28}/><b>មិនទាន់មានព័ត៌មានបុគ្គលិក</b><span>បុគ្គលិកដែល Submit នឹងបង្ហាញនៅទីនេះ។</span></div>}</div>
        </>}
        {notice && <div className="notice"><AlertCircle size={17}/><span>{notice}</span></div>}
        </>}
      </section>}
      <footer className="site-footer">
        <div className="footer-credit"><span className="footer-kicker">DEVELOPED BY</span><strong>Chai</strong></div>
        <span className="footer-brands">PUZZLE <i/> BAT <i/> POS TRAIN</span>
        <div className="footer-legal"><strong>© 2026 Company 99 · Internal Use Only</strong><span>Unauthorized copying, distribution, resale, modification, or use outside Company 99 is prohibited without prior written authorization.</span></div>
      </footer>
    </main>
  </div>
}

function IDCard({ record, brand, elementId, photoX = 50, photoY = 50, photoZoom = 1 }) {
  const name = record?.full_name || 'EMPLOYEE NAME'
  const position = record?.position || 'JOB TITLE'
  const employeeId = ''
  const themeClass = brand.id === 'POS TRAIN' ? 'theme-pos' : brand.id === 'BAT' ? 'theme-bat' : 'theme-puzzle'
  return <div className="card-stage"><div className={`id-card ${themeClass}`} id={elementId || `idcard-${record?.id || 'preview'}`}>
    <div className="card-topline"><span>STAFF IDENTITY</span><span>COMPANY 99</span></div>
    <div className="card-logo"><img src={brand.logo} alt={brand.name}/></div>
    <div className="portrait portrait-large">{record?.photo ? <img src={record.photo} alt={name} style={{ objectPosition: `${photoX}% ${photoY}%`, transform: `scale(${photoZoom})` }}/> : <div className="portrait-placeholder"><Users size={37}/><span>PHOTO</span></div>}</div>
    <div className="card-divider"><span/><span/><span/></div>
    <div className="card-name">{name.toUpperCase()}</div>
    <div className="card-position">{position.toUpperCase()}</div>
    <div className="card-bottom"><div className="card-bottom-red"/><div className="card-bottom-info"><span>EMPLOYEE</span><b>{record?.department || brand.name}</b></div><div className="qr-fake"><div/><div/><div/><div/><div/><div/><div/><div/><div/></div></div>
    <div className="card-footer"><span>{brand.name} • STAFF CARD</span><span>2026</span></div>
  </div></div>
}

createRoot(document.getElementById('root')).render(<App />)
