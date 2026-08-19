import { useEffect, useState } from 'react'
import { getCallsignsFromZip, getPbsIdFromNola, getProgram, getProviders, getZipFromIp } from './lib/api'
import { getCookie, setCookie } from './lib/cookies'
import { formatBroadcastChannel, formatDayHeader, formatProviderChannel, formatStartTime } from './lib/format'
import './App.css'

// Fallback used only when the page has no ?nola= param (e.g. local dev)
const DEFAULT_PBS_ID = '7840'
const ZIP_COOKIE = 'tvss_zip'
const PROVIDER_COOKIE = 'tvss_provider'

function getNolaCodeFromQuery() {
  const nola = new URLSearchParams(window.location.search).get('nola')
  return nola ? nola.slice(-4) : null
}

function groupByDay(episodes) {
  const groups = new Map()
  for (const ep of episodes) {
    if (!groups.has(ep.day)) groups.set(ep.day, [])
    groups.get(ep.day).push(ep)
  }
  return [...groups.entries()]
    .sort(([dayA], [dayB]) => dayA.localeCompare(dayB))
    .map(([day, eps]) => [day, eps.sort((a, b) => a.start_time.localeCompare(b.start_time))])
}

function App() {
  const [formVisible, setFormVisible] = useState(true)
  const [zip, setZip] = useState('')
  const [headends, setHeadends] = useState([])
  const [selectedHeadendCid, setSelectedHeadendCid] = useState('')
  const [callsigns, setCallsigns] = useState([])
  const [selectedCallsign, setSelectedCallsign] = useState('')
  const [episodes, setEpisodes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pbsId, setPbsId] = useState(DEFAULT_PBS_ID)

  useEffect(() => {
    const init = async () => {
      const nolaCode = getNolaCodeFromQuery()
      let resolvedPbsId = DEFAULT_PBS_ID
      if (nolaCode) {
        resolvedPbsId = await getPbsIdFromNola(nolaCode).catch(() => null)
        if (!resolvedPbsId) {
          setError('Unable to resolve program for this page')
          return
        }
        setPbsId(resolvedPbsId)
      }

      const cookieZip = getCookie(ZIP_COOKIE)
      const initialZip = cookieZip || (await getZipFromIp().catch(() => null))
      if (initialZip) {
        setZip(initialZip)
        await lookup(initialZip, getCookie(PROVIDER_COOKIE), resolvedPbsId)
      }
    }
    init()
  }, [])

  const lookup = async (zipValue, preferredProviderCid, pbsIdValue = pbsId) => {
    setLoading(true)
    setError(null)
    setSelectedCallsign('')
    try {
      const resolvedCallsigns = await getCallsignsFromZip(zipValue)
      if (resolvedCallsigns.length === 0) {
        throw new Error('No station found for that ZIP code')
      }
      setCallsigns(resolvedCallsigns)

      const [providers, ...programs] = await Promise.all([
        getProviders(resolvedCallsigns[0], zipValue),
        ...resolvedCallsigns.map((cs) => getProgram(cs, pbsIdValue)),
      ])
      setHeadends(providers)

      const merged = resolvedCallsigns.flatMap((cs, i) =>
        (programs[i]?.upcoming_episodes ?? []).map((ep) => ({ ...ep, _callsign: cs }))
      )
      setEpisodes(merged)

      if (preferredProviderCid && providers.some((h) => h.cid === preferredProviderCid)) {
        setSelectedHeadendCid(preferredProviderCid)
        setFormVisible(false)
      } else {
        setSelectedHeadendCid('')
      }
    } catch (err) {
      setError(err.message)
      setHeadends([])
      setCallsigns([])
      setEpisodes([])
    } finally {
      setLoading(false)
    }
  }

  const handleZipSubmit = (e) => {
    e.preventDefault()
    if (!zip) return
    setCookie(ZIP_COOKIE, zip)
    lookup(zip, null)
  }

  const handleProviderChange = (e) => {
    const cid = e.target.value
    setSelectedHeadendCid(cid)
    setCookie(PROVIDER_COOKIE, cid)
    if (cid) setFormVisible(false)
  }

  const selectedHeadend = headends.find((h) => h.cid === selectedHeadendCid) || null
  const visibleEpisodes = selectedCallsign
    ? episodes.filter((ep) => ep._callsign === selectedCallsign)
    : episodes
  const dayGroups = groupByDay(visibleEpisodes)

  return (
    <div className="tvss-widget">
      {formVisible ? (
        <>
          <form className="tvss-row" onSubmit={handleZipSubmit}>
            <label htmlFor="tvss-zip">ZIP:</label>
            <input
              id="tvss-zip"
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={zip}
              onChange={(e) => setZip(e.target.value)}
            />
            <button type="submit">OK</button>
          </form>

          <div className="tvss-row">
            <label htmlFor="tvss-provider">Provider:</label>
            <select
              id="tvss-provider"
              value={selectedHeadendCid}
              onChange={handleProviderChange}
              disabled={headends.length === 0}
            >
              <option value=""></option>
              {headends.map((h) => (
                <option key={h.cid} value={h.cid}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
        </>
      ) : (
        <div className="tvss-summary">
          <span>
            {zip} | {selectedHeadend?.name}
          </span>
          <button type="button" className="tvss-change" onClick={() => setFormVisible(true)}>
            Change
          </button>
        </div>
      )}

      {loading && <p className="tvss-status">Loading...</p>}
      {error && <p className="tvss-status tvss-error">{error}</p>}

      {!formVisible && !loading && !error && (
        <>
          <div className="tvss-row">
            <label htmlFor="tvss-channel">Channel:</label>
            <select
              id="tvss-channel"
              value={selectedCallsign}
              onChange={(e) => setSelectedCallsign(e.target.value)}
            >
              <option value="">Show all</option>
              {callsigns.map((cs) => (
                <option key={cs} value={cs}>
                  {cs}
                </option>
              ))}
            </select>
          </div>

          <div className="tvss-listings">
            {dayGroups.map(([day, eps]) => (
              <div key={day} className="tvss-day-group">
                <h3 className="tvss-day-header">{formatDayHeader(day)}</h3>
                <hr />
                {eps.map((ep) => {
                  const providerFeed = selectedHeadend?.feeds.find((f) => f.cid === ep.feed.cid)
                  const channel = providerFeed
                    ? formatProviderChannel(providerFeed)
                    : formatBroadcastChannel(ep.feed)
                  return (
                    <div key={`${ep.cid}-${ep.day}-${ep.start_time}`} className="tvss-episode">
                      <span className="tvss-time">{formatStartTime(ep.start_time)}</span>
                      <div className="tvss-episode-details">
                        <span className="tvss-station">
                          {ep.feed.full_name || ep.feed.short_name}
                          {channel && `, ch.${channel}`}
                        </span>
                        <span className="tvss-episode-title">
                          #{ep.nola_episode} · {ep.episode_title}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default App
