import React, { useEffect, useState } from 'react'
import api from '../../../../Api'

/**
 * Visualizador da trilha de auditoria (AuditLog): quem fez o quê e quando.
 * Ações: user.ban/unban/set-plan/reset-ai/delete, trial.grant, lgpd.export,
 * account.delete, aluno.accept, etc.
 */
const AdminAuditoria = ({ user, tema = 'dark' }) => {
  const isDark = tema === 'dark'
  const adminId = user?._id

  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [fAction, setFAction] = useState('')
  const [fEmail, setFEmail] = useState('')

  const inputCls = isDark ? 'bg-gray-700 text-gray-100 border-gray-600' : 'bg-white text-gray-900 border-gray-300'

  const carregar = async (p = page) => {
    setLoading(true)
    try {
      const res = await api.post('/admin/audit-logs', { adminId, page: p, limit: 25, action: fAction || undefined, email: fEmail || undefined })
      setLogs(Array.isArray(res?.data?.logs) ? res.data.logs : [])
      setPages(res?.data?.pagination?.pages || 1)
      setTotal(res?.data?.pagination?.total || 0)
      setPage(res?.data?.pagination?.page || p)
    } catch (e) {
      setLogs([])
    } finally { setLoading(false) }
  }

  useEffect(() => { if (adminId) carregar(1) /* eslint-disable-next-line */ }, [adminId])

  const fmtDate = (d) => { try { return new Date(d).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) } catch { return String(d) } }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <input value={fAction} onChange={e => setFAction(e.target.value)} placeholder="filtrar por ação (ex.: user.ban)"
          className={`px-2 py-1.5 rounded-lg border text-sm ${inputCls}`} />
        <input value={fEmail} onChange={e => setFEmail(e.target.value)} placeholder="filtrar por email"
          className={`px-2 py-1.5 rounded-lg border text-sm ${inputCls}`} />
        <button onClick={() => carregar(1)} className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white">Filtrar</button>
        <span className="text-xs opacity-60">{total} registros</span>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Carregando auditoria...</div>
      ) : logs.length === 0 ? (
        <div className="text-sm text-gray-400">Nenhum registro.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`text-left ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <th className="p-2">Data</th>
                <th className="p-2">Ação</th>
                <th className="p-2">Email / userId</th>
                <th className="p-2">IP</th>
                <th className="p-2">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l, i) => (
                <tr key={l._id || i} className={`border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <td className="p-2 whitespace-nowrap">{fmtDate(l.criadoEm)}</td>
                  <td className="p-2"><span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/15 text-blue-500">{l.action}</span></td>
                  <td className="p-2 break-all">{l.email || l.userId || '—'}</td>
                  <td className="p-2 whitespace-nowrap">{l.ip || '—'}</td>
                  <td className="p-2 font-mono text-[11px] break-all max-w-md">{l.details ? JSON.stringify(l.details) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center gap-3">
          <button disabled={page <= 1} onClick={() => carregar(page - 1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Anterior</button>
          <span className="text-sm">Página {page} de {pages}</span>
          <button disabled={page >= pages} onClick={() => carregar(page + 1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Próximo</button>
        </div>
      )}
    </div>
  )
}

export default AdminAuditoria
