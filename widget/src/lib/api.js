const BASE_URL = import.meta.env.VITE_API_BASE_URL

async function postJSON(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`${path} failed with status ${res.status}`)
  }
  return res.json()
}

export async function getZipFromIp() {
  const res = await fetch(`${BASE_URL}/zip-from-ip`)
  if (!res.ok) {
    throw new Error(`/zip-from-ip failed with status ${res.status}`)
  }
  const data = await res.json()
  return data.zipCodeData?.$items?.[0]?.zipcode ?? null
}

export async function getCallsignsFromZip(zip) {
  const data = await postJSON('/callsign-from-zip', { zip })
  const items = data.callsignData?.$items ?? []
  return items
    .map((item) => item.$links?.[0]?.callsign)
    .filter(Boolean)
}

export async function getProviders(callsign, zip) {
  const data = await postJSON('/provider', { callsign, zip })
  return data.providerData?.headends ?? []
}

export async function getProgram(callsign, pbsId) {
  const data = await postJSON('/program', { callsign, pbs_id: pbsId })
  return data.response
}
