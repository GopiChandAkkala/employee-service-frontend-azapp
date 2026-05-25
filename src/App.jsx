import { useEffect, useMemo, useState } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
const REQUESTS_API = `${API_BASE_URL.replace(/\/$/, '')}/api/requests`
const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']

const statusLabels = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed'
}

async function requestJson(url, options) {
  const res = await fetch(url, options)

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`
    try {
      const data = await res.json()
      message = data.message || data.error || message
    } catch {
      // Keep the generic HTTP error when the backend returns no JSON body.
    }
    throw new Error(message)
  }

  if (res.status === 204) {
    return null
  }

  return res.json()
}

export default function App() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    employeeName: '',
    title: '',
    description: ''
  })

  const canSubmit = useMemo(() => Boolean(
    form.employeeName.trim() &&
    form.title.trim() &&
    form.description.trim() &&
    !saving
  ), [form, saving])

  const loadRequests = async () => {
    try {
      setError('')
      setLoading(true)
      const data = await requestJson(REQUESTS_API)
      setRequests(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  const submit = async (e) => {
    e.preventDefault()

    if (!canSubmit) {
      return
    }

    try {
      setError('')
      setSaving(true)
      await requestJson(REQUESTS_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employeeName: form.employeeName.trim(),
          title: form.title.trim(),
          description: form.description.trim()
        })
      })

      setForm({
        employeeName: '',
        title: '',
        description: ''
      })

      await loadRequests()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (id, status) => {
    try {
      setError('')
      const updated = await requestJson(`${REQUESTS_API}/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      })

      setRequests((current) => (
        current.map((request) => request.id === id ? updated : request)
      ))
    } catch (err) {
      setError(err.message)
    }
  }

  const deleteRequest = async (id) => {
    try {
      setError('')
      await requestJson(`${REQUESTS_API}/${id}`, {
        method: 'DELETE'
      })
      setRequests((current) => current.filter((request) => request.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Employee services</p>
          <h1>Request Portal</h1>
        </div>
        <button className="secondary-button" type="button" onClick={loadRequests}>
          Refresh
        </button>
      </header>

      <form onSubmit={submit}>
        <input
          placeholder="Employee Name"
          required
          value={form.employeeName}
          onChange={(e) => setForm({...form, employeeName: e.target.value})}
        />

        <input
          placeholder="Title"
          required
          value={form.title}
          onChange={(e) => setForm({...form, title: e.target.value})}
        />

        <textarea
          placeholder="Description"
          required
          value={form.description}
          onChange={(e) => setForm({...form, description: e.target.value})}
        />

        <button type="submit" disabled={!canSubmit}>
          {saving ? 'Creating...' : 'Create Request'}
        </button>
      </form>

      {error && <div className="alert">{error}</div>}

      <div className="list">
        {loading && <p className="muted">Loading service requests...</p>}

        {!loading && requests.length === 0 && (
          <p className="muted">No service requests yet.</p>
        )}

        {requests.map((r) => (
          <div key={r.id} className="card">
            <div className="card-header">
              <div>
                <h3>{r.title}</h3>
                <small>{r.employeeName}</small>
              </div>
              <span className={`status status-${r.status?.toLowerCase()}`}>
                {statusLabels[r.status] || r.status}
              </span>
            </div>

            <p>{r.description}</p>

            <div className="card-actions">
              <select
                value={r.status || 'OPEN'}
                onChange={(e) => updateStatus(r.id, e.target.value)}
                aria-label={`Update status for ${r.title}`}
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
              <button
                className="danger-button"
                type="button"
                onClick={() => deleteRequest(r.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
