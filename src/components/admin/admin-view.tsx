"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Activity, ContactRound, LayoutDashboard, LogOut, ReceiptText, ShieldCheck, Users } from "lucide-react"
import { API_BASE_URL } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Person = { id: number; nombre: string; username: string; email: string; telefono: string; role: string }
type Team = {
  tenant_id: number; lider: Person | null; colaboradores: number; prospectos: number; prospectos_totales: number
  ventas_equipo: number; comision: number; ventas_lider: number; ventas_colaboradores: number
  numero_ventas: number; conversion: number; ticket_promedio: number; ultima_actividad?: string | null; busqueda?: string
}
type Member = Person & {
  prospectos: number; citas: number; llamadas: number; numero_ventas: number; monto_vendido: number
  porcentaje_equipo: number; conversion: number; ticket_promedio: number; ultima_actividad?: string | null
}
type Sale = {
  id: number; fecha: string; vendio: Person; prospecto: { id: number; nombre: string }; tipo: string
  monto_con_iva: number; iva: number; monto_sin_iva: number; origen: string
  capturada_por: Person; usuario_efectivo: Person; comision: number
}
type Prospect = {
  id: number; tenant_id: number; equipo: string; nombre: string; numero: string; numero_encuesta?: string | null
  estado: string; forma_obtencion: string; asignado_a: Person; total_vendido: number; created_at: string; updated_at: string
}
type Audit = {
  id: number; admin: Person; action_label: string; target_label: string; target_id: number
  tenant_id?: number | null; details: string; created_at: string
}
type TeamDetail = { team: Team; members: Member[]; sales: Sale[]; prospects: Prospect[]; audit: Audit[] }
type Dashboard = {
  total_vendido: number; comision_estimada: number; total_lideres: number; total_colaboradores: number
  prospectos: number; numero_ventas: number; conversion: number; ticket_promedio: number
  equipo_mas_ventas: Team | null; equipo_menor_conversion: Team | null
}

const sections = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["teams", "Equipos", Users],
  ["prospects", "Prospectos", ContactRound],
  ["sales", "Ventas", ReceiptText],
  ["audit", "Auditoría", Activity],
] as const

function authHeaders(json = false) {
  const token = localStorage.getItem("pulso_token")
  return { ...(json ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}

async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store", ...options, headers: { ...authHeaders(!!options.body), ...(options.headers || {}) } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || "No se pudo completar la operación")
  return data
}

const money = (value: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(value || 0)
const number = (value: number) => new Intl.NumberFormat("es-MX").format(value || 0)
const date = (value?: string | null) => value ? new Date(value).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" }) : "—"
const roleLabel = (role: string) => role === "leader" ? "Líder" : "Colaborador"
const monthLabel = (value: string) => new Date(`${value}-01T12:00:00`).toLocaleDateString("es-MX", { month: "long", year: "numeric" })

function Metric({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{title}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{value}</div>{subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}</CardContent></Card>
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[][] }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm">{options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}</select>
}

function SalesTable({ sales }: { sales: Sale[] }) {
  return <div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[1100px] text-sm"><thead className="bg-muted/50 text-left"><tr>{["Fecha", "Vendió", "Rol", "Prospecto", "Tipo", "Con IVA", "IVA", "Sin IVA", "Origen", "Capturada por", "Usuario efectivo", "Comisión"].map((heading) => <th key={heading} className="p-3 font-medium">{heading}</th>)}</tr></thead><tbody>{sales.map((sale) => <tr key={sale.id} className="border-t"><td className="p-3">{date(sale.fecha)}</td><td className="p-3 font-medium">{sale.vendio.nombre}</td><td className="p-3">{roleLabel(sale.vendio.role)}</td><td className="p-3">{sale.prospecto.nombre}</td><td className="p-3 capitalize">{sale.tipo}</td><td className="p-3">{money(sale.monto_con_iva)}</td><td className="p-3">{money(sale.iva)}</td><td className="p-3 font-medium">{money(sale.monto_sin_iva)}</td><td className="p-3 capitalize">{sale.origen}</td><td className="p-3">{sale.capturada_por.nombre}</td><td className="p-3">{sale.usuario_efectivo.nombre}</td><td className="p-3">{money(sale.comision)}</td></tr>)}</tbody></table>{sales.length === 0 ? <div className="p-8 text-center text-muted-foreground">Sin ventas en el periodo.</div> : null}</div>
}

function ProspectsTable({ prospects }: { prospects: Prospect[] }) {
  return <div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[1050px] text-sm"><thead className="bg-muted/50 text-left"><tr>{["Prospecto", "Equipo", "Asignado a", "Teléfono", "Encuesta", "Estado", "Forma de obtención", "Total vendido", "Creado"].map((heading) => <th key={heading} className="p-3 font-medium">{heading}</th>)}</tr></thead><tbody>{prospects.map((prospect) => <tr key={prospect.id} className="border-t"><td className="p-3 font-medium">{prospect.nombre}</td><td className="p-3">{prospect.equipo}</td><td className="p-3">{prospect.asignado_a.nombre}</td><td className="p-3">{prospect.numero}</td><td className="p-3">{prospect.numero_encuesta || "—"}</td><td className="p-3"><Badge variant="outline" className="capitalize">{prospect.estado.replaceAll("_", " ")}</Badge></td><td className="p-3">{prospect.forma_obtencion}</td><td className="p-3">{money(prospect.total_vendido)}</td><td className="p-3">{date(prospect.created_at)}</td></tr>)}</tbody></table>{prospects.length === 0 ? <div className="p-8 text-center text-muted-foreground">Sin prospectos.</div> : null}</div>
}

function AuditList({ rows }: { rows: Audit[] }) {
  return <div className="space-y-3">{rows.map((row) => <Card key={row.id}><CardContent className="flex flex-col justify-between gap-3 p-4 sm:flex-row"><div><div className="font-semibold">{row.action_label}</div><p className="mt-1 text-sm text-muted-foreground">{row.details}</p><p className="mt-2 text-xs text-muted-foreground">Administrador: {row.admin.nombre} · Objetivo: {row.target_label} #{row.target_id}</p></div><div className="shrink-0 text-xs text-muted-foreground">{date(row.created_at)}</div></CardContent></Card>)}{rows.length === 0 ? <div className="rounded-lg border p-8 text-center text-muted-foreground">Todavía no hay acciones administrativas.</div> : null}</div>
}

export function AdminView() {
  const router = useRouter()
  const currentMonth = new Date().toISOString().slice(0, 7)
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [section, setSection] = useState<(typeof sections)[number][0]>("dashboard")
  const [months, setMonths] = useState<string[]>([currentMonth])
  const [month, setMonth] = useState(currentMonth)
  const [day, setDay] = useState("")
  const period = day || month
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [globalSales, setGlobalSales] = useState<Sale[]>([])
  const [globalProspects, setGlobalProspects] = useState<Prospect[]>([])
  const [globalAudit, setGlobalAudit] = useState<Audit[]>([])
  const [selectedTeam, setSelectedTeam] = useState<TeamDetail | null>(null)
  const [search, setSearch] = useState("")
  const [prospectSearch, setProspectSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [resetUser, setResetUser] = useState<Person | null>(null)
  const [password, setPassword] = useState("")
  const [saleRole, setSaleRole] = useState("all")
  const [saleUser, setSaleUser] = useState("all")
  const [saleType, setSaleType] = useState("all")
  const [saleOrigin, setSaleOrigin] = useState("all")

  useEffect(() => {
    api("/users/me").then(async (data) => {
      const canAccess = !!data.user?.is_platform_admin
      setAllowed(canAccess)
      if (canAccess) {
        const periods = await api("/admin/periods")
        setMonths(periods.months || [currentMonth])
      }
    }).catch(() => setAllowed(false))
  }, [currentMonth])

  async function openTeam(tenantId: number) {
    setLoading(true); setError("")
    try { setSelectedTeam(await api(`/admin/teams/${tenantId}?period=${encodeURIComponent(period)}`)) }
    catch (error) { setError(error instanceof Error ? error.message : "Error") }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (!allowed) return
    setLoading(true); setError("")
    Promise.all([
      api(`/admin/dashboard?period=${encodeURIComponent(period)}`),
      api(`/admin/teams?period=${encodeURIComponent(period)}`),
    ]).then(([dashboardData, teamData]) => {
      setDashboard(dashboardData.dashboard); setTeams(teamData.teams || [])
    }).catch((error) => setError(error.message)).finally(() => setLoading(false))
  }, [allowed, period])

  useEffect(() => {
    if (!allowed) return
    if (section === "sales") api(`/admin/sales?period=${encodeURIComponent(period)}`).then((data) => setGlobalSales(data.sales || [])).catch((error) => setError(error.message))
    if (section === "prospects") api("/admin/prospects").then((data) => setGlobalProspects(data.prospects || [])).catch((error) => setError(error.message))
    if (section === "audit") api("/admin/audit").then((data) => setGlobalAudit(data.audit || [])).catch((error) => setError(error.message))
  }, [allowed, section, period])

  async function resetPassword() {
    if (!resetUser) return
    try {
      await api(`/admin/users/${resetUser.id}/reset-password`, { method: "POST", body: JSON.stringify({ password }) })
      setResetUser(null); setPassword(""); alert("Contraseña actualizada")
      if (selectedTeam) await openTeam(selectedTeam.team.tenant_id)
    } catch (error) { alert(error instanceof Error ? error.message : "No se pudo actualizar") }
  }

  const visibleTeams = useMemo(() => {
    const query = search.trim().toLowerCase()
    return query ? teams.filter((team) => (team.busqueda || "").includes(query)) : teams
  }, [teams, search])
  const visibleProspects = useMemo(() => {
    const query = prospectSearch.trim().toLowerCase()
    const rows = selectedTeam?.prospects || globalProspects
    return query ? rows.filter((prospect) => `${prospect.nombre} ${prospect.numero} ${prospect.equipo} ${prospect.asignado_a.nombre}`.toLowerCase().includes(query)) : rows
  }, [selectedTeam?.prospects, globalProspects, prospectSearch])
  const filteredSales = useMemo(() => (selectedTeam?.sales || []).filter((sale) => {
    if (saleRole !== "all" && sale.vendio.role !== saleRole) return false
    if (saleUser !== "all" && String(sale.vendio.id) !== saleUser) return false
    if (saleType !== "all" && sale.tipo !== saleType) return false
    return saleOrigin === "all" || sale.origen === saleOrigin
  }), [selectedTeam?.sales, saleRole, saleUser, saleType, saleOrigin])

  if (allowed === null) return <div className="grid min-h-screen place-items-center text-muted-foreground">Validando acceso…</div>
  if (!allowed) return <div className="grid min-h-screen place-items-center p-6"><Card className="max-w-md"><CardContent className="space-y-4 p-6 text-center"><ShieldCheck className="mx-auto h-10 w-10 text-destructive"/><h1 className="text-xl font-bold">Acceso restringido</h1><p className="text-sm text-muted-foreground">Esta cuenta no tiene permiso de administración.</p><Button onClick={() => { localStorage.clear(); router.push("/login") }}>Cerrar sesión</Button></CardContent></Card></div>

  const logout = () => { localStorage.clear(); router.push("/login") }

  return <div className="flex min-h-screen bg-background">
    <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
      <div className="border-b p-6"><div className="flex items-center gap-2 text-xl font-bold"><ShieldCheck className="h-6 w-6 text-primary"/>Pulso Admin</div><p className="mt-1 text-xs text-muted-foreground">Control interno de equipos</p></div>
      <nav className="flex-1 space-y-1 p-3">{sections.map(([id, label, Icon]) => <Button key={id} variant={section === id ? "secondary" : "ghost"} className="w-full justify-start gap-3" onClick={() => { setSection(id); setSelectedTeam(null) }}><Icon className="h-4 w-4"/>{label}</Button>)}</nav>
      <div className="border-t p-3"><Button variant="ghost" className="w-full justify-start gap-2 text-destructive" onClick={logout}><LogOut className="h-4 w-4"/>Cerrar sesión</Button></div>
    </aside>

    <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div><h1 className="text-2xl font-bold">Administración interna</h1><p className="text-sm text-muted-foreground">Equipos, prospectos, ventas y actividad administrativa.</p></div>
        <div className="flex flex-wrap gap-2 md:hidden">{sections.map(([id, label]) => <Button key={id} size="sm" variant={section === id ? "default" : "outline"} onClick={() => { setSection(id); setSelectedTeam(null) }}>{label}</Button>)}</div>
        <div className="flex flex-wrap items-end gap-2"><div><Label className="text-xs">Mes</Label><select value={month} onChange={(event) => { setMonth(event.target.value); setDay(""); setSelectedTeam(null) }} className="mt-1 block h-10 rounded-md border bg-background px-3 text-sm">{months.map((value) => <option key={value} value={value}>{monthLabel(value)}</option>)}</select></div><div><Label className="text-xs">Día específico</Label><Input type="date" value={day} onChange={(event) => { setDay(event.target.value); setSelectedTeam(null) }} className="mt-1 w-auto"/></div>{day ? <Button variant="outline" onClick={() => { setDay(""); setSelectedTeam(null) }}>Ver mes completo</Button> : null}</div>
      </div>
      {error ? <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div> : null}
      {loading ? <div className="mb-4 text-sm text-muted-foreground">Actualizando datos…</div> : null}

      {section === "dashboard" && dashboard ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric title="Total vendido" value={money(dashboard.total_vendido)}/><Metric title="Comisión estimada 1%" value={money(dashboard.comision_estimada)}/><Metric title="Personas" value={number(dashboard.total_lideres)} subtitle={`${number(dashboard.total_colaboradores)} colaboradores`}/><Metric title="Prospectos creados" value={number(dashboard.prospectos)} subtitle={`${number(dashboard.numero_ventas)} ventas`}/><Metric title="Conversión general" value={`${dashboard.conversion}%`}/><Metric title="Ticket promedio" value={money(dashboard.ticket_promedio)}/><Metric title="Equipo con más ventas" value={dashboard.equipo_mas_ventas?.lider?.nombre || "—"} subtitle={money(dashboard.equipo_mas_ventas?.ventas_equipo || 0)}/><Metric title="Menor conversión" value={dashboard.equipo_menor_conversion?.lider?.nombre || "—"} subtitle={`${dashboard.equipo_menor_conversion?.conversion || 0}%`}/></div> : null}

      {section === "teams" && !selectedTeam ? <div className="space-y-4"><Input placeholder="Buscar por líder, colaborador, usuario o teléfono…" value={search} onChange={(event) => setSearch(event.target.value)}/><div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[1300px] text-sm"><thead className="bg-muted/50 text-left"><tr>{["Líder", "Colaboradores", "Prospectos totales", "Nuevos en periodo", "Ventas equipo", "Comisión 1%", "Ventas líder", "Ventas colaboradores", "Núm. ventas", "Conversión", "Ticket promedio", "Última actividad"].map((heading) => <th key={heading} className="p-3 font-medium">{heading}</th>)}</tr></thead><tbody>{visibleTeams.map((team) => <tr key={team.tenant_id} className="cursor-pointer border-t hover:bg-muted/30" onClick={() => openTeam(team.tenant_id)}><td className="p-3"><div className="font-medium">{team.lider?.nombre || "Sin líder"}</div><div className="text-xs text-muted-foreground">{team.lider?.email}</div></td><td className="p-3">{team.colaboradores}</td><td className="p-3 font-medium">{team.prospectos_totales}</td><td className="p-3">{team.prospectos}</td><td className="p-3 font-semibold">{money(team.ventas_equipo)}</td><td className="p-3">{money(team.comision)}</td><td className="p-3">{money(team.ventas_lider)}</td><td className="p-3">{money(team.ventas_colaboradores)}</td><td className="p-3">{team.numero_ventas}</td><td className="p-3">{team.conversion}%</td><td className="p-3">{money(team.ticket_promedio)}</td><td className="p-3">{date(team.ultima_actividad)}</td></tr>)}</tbody></table></div></div> : null}

      {section === "teams" && selectedTeam ? <div className="space-y-5"><Button variant="outline" onClick={() => setSelectedTeam(null)}>← Volver a equipos</Button><div><h2 className="text-2xl font-bold">Equipo de {selectedTeam.team.lider?.nombre}</h2><p className="text-sm text-muted-foreground">{selectedTeam.team.lider?.email} · {selectedTeam.team.colaboradores} colaboradores · {selectedTeam.team.prospectos_totales} prospectos totales</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric title="Vendido por el equipo" value={money(selectedTeam.team.ventas_equipo)}/><Metric title="Comisión 1%" value={money(selectedTeam.team.comision)}/><Metric title="Ventas del líder" value={money(selectedTeam.team.ventas_lider)}/><Metric title="Ventas de colaboradores" value={money(selectedTeam.team.ventas_colaboradores)}/><Metric title="Prospectos creados" value={number(selectedTeam.team.prospectos)}/><Metric title="Número de ventas" value={number(selectedTeam.team.numero_ventas)}/><Metric title="Conversión" value={`${selectedTeam.team.conversion}%`}/><Metric title="Ticket promedio" value={money(selectedTeam.team.ticket_promedio)}/></div><Tabs defaultValue="members"><TabsList className="flex h-auto flex-wrap"><TabsTrigger value="members">Integrantes</TabsTrigger><TabsTrigger value="prospects">Prospectos ({selectedTeam.prospects.length})</TabsTrigger><TabsTrigger value="sales">Ventas</TabsTrigger><TabsTrigger value="audit">Auditoría</TabsTrigger></TabsList><TabsContent value="members"><div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[1150px] text-sm"><thead className="bg-muted/50 text-left"><tr>{["Persona", "Rol", "Prospectos", "Citas", "Llamadas", "Ventas", "Monto vendido", "% equipo", "Conversión", "Ticket promedio", "Última actividad", "Contraseña"].map((heading) => <th key={heading} className="p-3 font-medium">{heading}</th>)}</tr></thead><tbody>{selectedTeam.members.map((member) => <tr key={member.id} className="border-t"><td className="p-3"><div className="font-medium">{member.nombre}</div><div className="text-xs text-muted-foreground">{member.email}</div></td><td className="p-3">{roleLabel(member.role)}</td><td className="p-3">{member.prospectos}</td><td className="p-3">{member.citas}</td><td className="p-3">{member.llamadas}</td><td className="p-3">{member.numero_ventas}</td><td className="p-3 font-medium">{money(member.monto_vendido)}</td><td className="p-3">{member.porcentaje_equipo}%</td><td className="p-3">{member.conversion}%</td><td className="p-3">{money(member.ticket_promedio)}</td><td className="p-3">{date(member.ultima_actividad)}</td><td className="p-3"><Button size="sm" variant="outline" onClick={() => { setResetUser(member); setPassword("") }}>Cambiar</Button></td></tr>)}</tbody></table></div></TabsContent><TabsContent value="prospects"><div className="mb-3"><Input placeholder="Buscar prospecto del equipo…" value={prospectSearch} onChange={(event) => setProspectSearch(event.target.value)}/></div><ProspectsTable prospects={visibleProspects}/></TabsContent><TabsContent value="sales"><div className="mb-3 flex flex-wrap gap-2"><FilterSelect value={saleRole} onChange={setSaleRole} options={[["all", "Todos"], ["leader", "Líder"], ["collaborator", "Colaboradores"]]}/><FilterSelect value={saleUser} onChange={setSaleUser} options={[["all", "Todas las personas"], ...selectedTeam.members.map((member) => [String(member.id), member.nombre])]}/><FilterSelect value={saleType} onChange={setSaleType} options={[["all", "Contado y crédito"], ["contado", "Contado"], ["credito", "Crédito"]]}/><FilterSelect value={saleOrigin} onChange={setSaleOrigin} options={[["all", "Todos los orígenes"], ["cita", "Cita"], ["llamada", "Llamada"], ["manual", "Manual"]]}/></div><SalesTable sales={filteredSales}/></TabsContent><TabsContent value="audit"><AuditList rows={selectedTeam.audit}/></TabsContent></Tabs></div> : null}

      {section === "prospects" ? <div className="space-y-3"><div className="flex items-center justify-between gap-3"><Input placeholder="Buscar por prospecto, equipo, teléfono o responsable…" value={prospectSearch} onChange={(event) => setProspectSearch(event.target.value)}/><div className="shrink-0 text-sm text-muted-foreground">{visibleProspects.length} prospectos</div></div><ProspectsTable prospects={visibleProspects}/></div> : null}
      {section === "sales" ? <SalesTable sales={globalSales}/> : null}
      {section === "audit" ? <AuditList rows={globalAudit}/> : null}
    </main>

    <Dialog open={!!resetUser} onOpenChange={(open) => !open && setResetUser(null)}><DialogContent><DialogHeader><DialogTitle>Cambiar contraseña</DialogTitle><DialogDescription>Escribe directamente la nueva contraseña para {resetUser?.nombre}. No se necesita la contraseña anterior.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="admin-password">Nueva contraseña</Label><Input id="admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus/></div><DialogFooter><Button variant="outline" onClick={() => setResetUser(null)}>Cancelar</Button><Button disabled={password.length < 8} onClick={resetPassword}>Guardar nueva contraseña</Button></DialogFooter></DialogContent></Dialog>
  </div>
}
