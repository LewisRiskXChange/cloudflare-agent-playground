import { useCallback, useEffect, useRef, useState } from 'react'

interface Props {
  url: string
  apiKey: string
  instanceName: string
}

type OnboardingStatus =
  | 'started'
  | 'invite_pending_approval'
  | 'invite_sent'
  | 'awaiting_acceptance'
  | 'nudge_pending_approval'
  | 'nudge_sent'
  | 'completed'
  | 'failed'
  | null

interface NovaApproval {
  id: string
  companyId: string
  vendorId: string
  instanceName: string
  stepId: string
  status: 'pending_approval' | 'approved' | 'rejected' | 'sent'
  emailSubject: string
  emailBody: string
  createdAt: string
  updatedAt: string
}

// Maps onboardingStatus to a 0-based step index for the flow visualiser
const STATUS_TO_STEP: Record<string, number> = {
  started: 0,
  invite_pending_approval: 1,
  invite_sent: 2,
  awaiting_acceptance: 2,
  nudge_pending_approval: 2,
  nudge_sent: 2,
  completed: 3,
  failed: -1,
}

const FLOW_STEPS = [
  { label: 'Vendor profile fetched' },
  { label: 'Invite ready for review' },
  { label: 'Invite sent — awaiting acceptance' },
  { label: 'Vendor accepted' },
]

function StatusBadge({ status }: { status: OnboardingStatus }) {
  if (!status) return <span className="text-xs text-gray-400">—</span>

  const map: Record<string, { label: string; cls: string }> = {
    started:                  { label: 'Started',                  cls: 'bg-blue-100 text-blue-700' },
    invite_pending_approval:  { label: 'Pending approval',         cls: 'bg-amber-100 text-amber-700' },
    invite_sent:              { label: 'Invite sent',              cls: 'bg-indigo-100 text-indigo-700' },
    awaiting_acceptance:      { label: 'Awaiting acceptance',      cls: 'bg-indigo-100 text-indigo-700' },
    nudge_pending_approval:   { label: 'Nudge pending approval',   cls: 'bg-amber-100 text-amber-700' },
    nudge_sent:               { label: 'Nudge sent',               cls: 'bg-indigo-100 text-indigo-700' },
    completed:                { label: 'Completed',                cls: 'bg-green-100 text-green-700' },
    failed:                   { label: 'Failed',                   cls: 'bg-red-100 text-red-700' },
  }

  const { label, cls } = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}

export default function WorkflowPanel({ url, apiKey, instanceName }: Props) {
  const [status, setStatus] = useState<OnboardingStatus>(null)
  const [approvals, setApprovals] = useState<NovaApproval[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')
  const [toast, setToast] = useState('')
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 3000)
  }

  const poll = useCallback(async () => {
    try {
      // Fetch session status from KV via GET /nova/sessions
      const sessRes = await fetch(`${url}/nova/sessions`, {
        headers: { 'x-api-key': apiKey },
      })
      if (sessRes.ok) {
        const sessData = await sessRes.json() as { sessions: Array<{ instanceName: string; onboardingStatus?: string }> }
        const session = sessData.sessions.find((s: { instanceName: string }) => s.instanceName === instanceName)
        setStatus((session?.onboardingStatus as OnboardingStatus) ?? null)
      }

      // Fetch pending approvals proxied through Nova Worker
      const apRes = await fetch(
        `${url}/nova/approvals/${encodeURIComponent(instanceName)}`,
        { headers: { 'x-api-key': apiKey } }
      )
      if (apRes.ok) {
        const apData = await apRes.json() as { approvals: NovaApproval[] }
        setApprovals(apData.approvals.filter((a: NovaApproval) => a.status === 'pending_approval'))
      }
    } catch {
      // Silently ignore poll errors — they'll retry next interval
    }
  }, [url, apiKey, instanceName])

  useEffect(() => {
    poll()
    const interval = setInterval(poll, 5000)
    return () => clearInterval(interval)
  }, [poll])

  async function callNova(path: string, body: object) {
    const res = await fetch(`${url}${path}`, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`${res.status}${text ? `: ${text}` : ''}`)
    }
    return res.json()
  }

  async function handleApprove(approval: NovaApproval) {
    setBusy(b => ({ ...b, [approval.id]: true }))
    try {
      const edited = editingId === approval.id
        ? { subject: editSubject, body: editBody }
        : undefined
      await callNova('/nova/approve', {
        instanceName,
        stepId: approval.stepId,
        approved: true,
        ...(edited ? { edited } : {}),
      })
      setEditingId(null)
      showToast(`Approved — "${approval.stepId}" email will be sent`)
      poll()
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(b => ({ ...b, [approval.id]: false }))
    }
  }

  async function handleReject(approval: NovaApproval) {
    setBusy(b => ({ ...b, [`reject-${approval.id}`]: true }))
    try {
      await callNova('/nova/approve', {
        instanceName,
        stepId: approval.stepId,
        approved: false,
      })
      showToast(`Rejected — workflow will stop`)
      poll()
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(b => ({ ...b, [`reject-${approval.id}`]: false }))
    }
  }

  async function handleInviteAccepted() {
    setBusy(b => ({ ...b, accept: true }))
    try {
      await callNova('/nova/invite-accepted', { instanceName })
      showToast('Simulated invite accepted — workflow will complete')
      poll()
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(b => ({ ...b, accept: false }))
    }
  }

  function startEditing(approval: NovaApproval) {
    setEditingId(approval.id)
    setEditSubject(approval.emailSubject)
    setEditBody(approval.emailBody)
  }

  const currentStep = status ? (STATUS_TO_STEP[status] ?? 0) : -1
  const isFailed = status === 'failed'
  const canSimulateAccept = status === 'awaiting_acceptance' || status === 'nudge_sent' || status === 'nudge_pending_approval'

  return (
    <div className="h-full flex flex-col bg-gray-50 border-l border-gray-200 overflow-hidden">
      {/* Panel header */}
      <div className="flex-shrink-0 px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Workflow</span>
            <span className="text-xs text-gray-400 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-amber-600 font-medium">dev</span>
          </div>
          <div className="mt-0.5">
            <StatusBadge status={status} />
          </div>
        </div>
        <button
          onClick={poll}
          title="Refresh"
          className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {/* Flow visualiser */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Onboarding flow</p>
          <div className="relative">
            {FLOW_STEPS.map((step, i) => {
              const isDone = !isFailed && currentStep > i
              const isCurrent = !isFailed && currentStep === i
              const isUpcoming = isFailed ? false : currentStep < i

              return (
                <div key={i} className="flex items-start gap-3 mb-0">
                  {/* Connector line + circle */}
                  <div className="flex flex-col items-center flex-shrink-0" style={{ width: 20 }}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-colors ${
                      isFailed && i >= currentStep ? 'bg-red-100 border-2 border-red-300'
                      : isDone ? 'bg-green-500'
                      : isCurrent ? 'bg-blue-600 ring-4 ring-blue-100'
                      : 'bg-white border-2 border-gray-200'
                    }`}>
                      {isDone && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {isCurrent && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    {i < FLOW_STEPS.length - 1 && (
                      <div className={`w-0.5 h-6 ${isDone ? 'bg-green-400' : 'bg-gray-200'}`} />
                    )}
                  </div>
                  {/* Label */}
                  <p className={`text-xs pt-0.5 pb-6 leading-relaxed transition-colors ${
                    isDone ? 'text-green-700 font-medium'
                    : isCurrent ? 'text-blue-700 font-semibold'
                    : isUpcoming ? 'text-gray-400'
                    : 'text-red-500'
                  }`}>
                    {step.label}
                    {isCurrent && status === 'nudge_pending_approval' && (
                      <span className="block text-amber-600 font-normal mt-0.5">Nudge pending approval</span>
                    )}
                    {isCurrent && status === 'nudge_sent' && (
                      <span className="block text-indigo-500 font-normal mt-0.5">Nudge sent</span>
                    )}
                  </p>
                </div>
              )
            })}

            {isFailed && (
              <div className="flex items-center gap-2 mt-1 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Workflow stopped — rejected or timed out
              </div>
            )}
          </div>
        </div>

        {/* Pending approval cards */}
        {approvals.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pending approval</p>
            <div className="space-y-3">
              {approvals.map(approval => (
                <div key={approval.id} className="bg-white border border-amber-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-3 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-700 capitalize">
                      {approval.stepId.replace(/-/g, ' ')} email
                    </span>
                    <button
                      onClick={() => editingId === approval.id ? setEditingId(null) : startEditing(approval)}
                      className="text-xs text-amber-600 hover:text-amber-800 underline underline-offset-2"
                    >
                      {editingId === approval.id ? 'Cancel edit' : 'Edit'}
                    </button>
                  </div>

                  {editingId === approval.id ? (
                    <div className="p-3 space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
                        <input
                          value={editSubject}
                          onChange={e => setEditSubject(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Body</label>
                        <textarea
                          value={editBody}
                          onChange={e => setEditBody(e.target.value)}
                          rows={6}
                          className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 space-y-2">
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Subject</p>
                        <p className="text-xs font-semibold text-gray-800 leading-snug">{approval.emailSubject}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Body</p>
                        <div className="max-h-48 overflow-y-auto rounded-lg bg-gray-50 border border-gray-100 px-2.5 py-2">
                          <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{approval.emailBody}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="px-3 pb-3 flex gap-2">
                    <button
                      onClick={() => handleApprove(approval)}
                      disabled={busy[approval.id]}
                      className="flex-1 bg-green-600 text-white text-xs font-semibold py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {busy[approval.id] ? 'Sending…' : 'Approve & send'}
                    </button>
                    <button
                      onClick={() => handleReject(approval)}
                      disabled={busy[`reject-${approval.id}`]}
                      className="flex-1 bg-white border border-red-200 text-red-600 text-xs font-semibold py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {busy[`reject-${approval.id}`] ? 'Rejecting…' : 'Reject'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Simulate buttons */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Simulate</p>
          <div className="space-y-2">
            <button
              onClick={handleInviteAccepted}
              disabled={!canSimulateAccept || busy.accept}
              className="w-full text-left px-3 py-2.5 rounded-xl border text-xs font-medium transition-colors
                disabled:opacity-40 disabled:cursor-not-allowed
                enabled:bg-white enabled:border-blue-200 enabled:text-blue-700 enabled:hover:bg-blue-50"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span>
                  {busy.accept ? 'Sending…' : 'Vendor accepted invite'}
                  <span className="block font-normal text-gray-400 mt-0.5">
                    {canSimulateAccept
                      ? 'Fires POST /nova/invite-accepted → workflow completes'
                      : 'Available once invite has been sent'}
                  </span>
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Instance info */}
        <div className="pt-1 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Instance</p>
          <p className="text-xs font-mono text-gray-500 break-all">{instanceName}</p>
          <p className="text-xs text-gray-400 mt-1">Polls every 5s</p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="flex-shrink-0 mx-4 mb-4 px-3 py-2 bg-gray-800 text-white text-xs rounded-xl shadow-lg animate-pulse">
          {toast}
        </div>
      )}
    </div>
  )
}
