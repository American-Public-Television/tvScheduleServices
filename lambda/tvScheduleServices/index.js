const axios = require('axios')
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm')
const ssm = new SSMClient({})

const getSSMEnv = async () => {
    const command = new GetParameterCommand({
        Name: process.env.SSM_STORE,
        WithDecryption: true
    })

    try {
        const response = await ssm.send(command)
        return JSON.parse(response.Parameter.Value)
    } catch (error) {
        console.error(`Error fetching ${process.env.SSM_STORE} from SSM: ${error}`)
        throw error
    }
}

const getPBS_AUTH = async () => {
    const command = new GetParameterCommand({
        Name: '/tvss/PBS_AUTH',
        WithDecryption: true
    })

    try {
        const response = await ssm.send(command)
        return response.Parameter.Value
    } catch (error) {
        console.error('Error fetching /tvss/PBS_AUTH from SSM:', error)
        throw error
    }
}

exports.handler = async (event) => {
    const ssmParams = await getSSMEnv()
    const pbsAuth = await getPBS_AUTH()
    const endpoints = ssmParams.pbs_endpoints
    const createtvEndpoints = ssmParams.createtv_endpoints
    const allowedOrigins = ssmParams.ALLOWED_ORIGINS

    let { headers: { origin } } = event
    let corsHeaders = {
        'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : '',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    }

    if (!allowedOrigins.includes(origin)) {
        return {
            statusCode: 403,
            headers: corsHeaders,
            body: JSON.stringify({ message: "Origin not allowed" })
        }
    }

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        }
    }

    const requestedPath = event.path
    const validPaths = [
        '/program', '/stations', '/episode',
        '/kids/today', '/kids/date', '/kids/feed',
        '/schedule/today', '/schedule/date', '/schedule/feed',
        '/search/upcoming_keyword', '/search/callsign', '/search/upcoming_kids',
        '/search/cid_keyword', '/search/upcoming_cid_keyword',
        '/search/siblings', '/search/kids', '/host-show'
    ]

    if (requestedPath === '/host-show') {
        try {
            const requestBody = JSON.parse(event.body)

            if (!requestBody.hostName) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: "Host name is required in the request body" })
                }
            }

            const hostName = requestBody.hostName
            const url = createtvEndpoints.HOST_SHOW_ENDPOINT.replace('{hostName}', encodeURIComponent(hostName))

            const response = await axios.get(url)

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify(response.data)
            }
        } catch (error) {
            console.error("Error fetching host-show data:", error)
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ error: error.message })
            }
        }
    }

    if (requestedPath === '/zip-from-ip') {
        try {
            const ipAddress = event.requestContext.identity.sourceIp
            const zipCodeData = await fetchZipCodeByIP(ipAddress, endpoints.ZIPCODE_BY_IP_ENDPOINT, pbsAuth)
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ zipCodeData })
            }
        } catch (error) {
            console.error("Error handling request:", error)
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ error: error.message })
            }
        }
    } else if (requestedPath === '/callsign-from-zip') {
        try {
            const requestBody = JSON.parse(event.body)

            if (!requestBody.zip) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: "ZIP code is required in the request body" })
                }
            }

            const zip = requestBody.zip
            const url = `${endpoints.CALLSIGN_ENDPOINT}${zip}.json`

            const callsignData = await axios.get(url, { headers: { 'X-PBSAUTH': pbsAuth } })

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ callsignData: callsignData.data })
            }
        } catch (error) {
            console.error("Error fetching callsign data:", error)
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ error: error.message })
            }
        }
    } else if (requestedPath === '/provider') {
        try {
            const requestBody = JSON.parse(event.body)

            if (!requestBody.callsign || !requestBody.zip) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: "Both callsign and ZIP code are required in the request body" })
                }
            }

            const callsign = requestBody.callsign
            const zip = requestBody.zip
            const url = `${endpoints.PROVIDER_ENDPOINT}${callsign}/channels/zip/${zip}`

            const providerData = await axios.get(url, { headers: { 'X-PBSAUTH': pbsAuth } })

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ providerData: providerData.data })
            }
        } catch (error) {
            console.error("Error fetching provider data:", error)
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ error: error.message })
            }
        }
    } else if (validPaths.includes(requestedPath)) {
        try {
            const requestBody = JSON.parse(event.body)
            const response = await fetchDataForEndpoint(requestBody, requestedPath, pbsAuth)
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ response })
            }
        } catch (error) {
            console.error("Error handling request:", error)
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ error: error.message })
            }
        }
    } else {
        return {
            statusCode: 404,
            headers: corsHeaders,
            body: JSON.stringify({ message: `Endpoint ${requestedPath} not supported` })
        }
    }
}

const fetchZipCodeByIP = async (ipAddress, endpoint, pbsAuth) => {
    const url = endpoint.replace(`{ipAddress}`, ipAddress)
    try {
        const response = await axios.get(url, { headers: { 'X-PBSAUTH': pbsAuth } })
        return response.data
    } catch (error) {
        console.error("Error fetching zip code data:", error)
        throw new Error('Failed to fetch zip code data')
    }
}

const fetchDataForEndpoint = async (requestBody, requestedPath, pbsAuth) => {
    const ssmParams = await getSSMEnv()
    const endpoints = ssmParams.pbs_endpoints

    const constructKeywords = (keywords) => {
        if (Array.isArray(keywords)) {
            return keywords.map(encodeURIComponent).join('%20')
        } else if (typeof keywords === 'string') {
            return encodeURIComponent(keywords)
        } else {
            return ''
        }
    }

    const urlMap = {
        '/program': endpoints.PROGRAM_ENDPOINT?.replace('{callsign}', requestBody.callsign)
            .replace('{pbs_id}', requestBody.pbs_id || requestBody.tms_id),
        '/stations': endpoints.STATION_ENDPOINT?.replace('{station_id}', requestBody.station_id),
        '/episode': endpoints.EPISODE_ENDPOINT?.replace('{callsign}', requestBody.callsign)
            .replace('{episode_id}', requestBody.episode_id || requestBody.onetimeonly_id),
        '/kids/today': endpoints.KIDS_TODAY_ENDPOINT?.replace('{callsign}', requestBody.callsign),
        '/kids/date': endpoints.KIDS_DATE_ENDPOINT?.replace('{callsign}', requestBody.callsign)
            .replace('{date}', requestBody.date),
        '/kids/feed': endpoints.KIDS_FEED_ENDPOINT?.replace('{callsign}', requestBody.callsign)
            .replace('{feed_cid}', requestBody.feed_cid),
        '/schedule/today': endpoints.SCHEDULE_TODAY_ENDPOINT?.replace('{callsign}', requestBody.callsign),
        '/schedule/date': endpoints.SCHEDULE_DATE_ENDPOINT?.replace('{callsign}', requestBody.callsign)
            .replace('{date}', requestBody.date),
        '/schedule/feed': endpoints.SCHEDULE_FEED_ENDPOINT?.replace('{callsign}', requestBody.callsign)
            .replace('{date}', requestBody.date)
            .replace('{feed_cid}', requestBody.feed_cid),
        '/search/upcoming_keyword': endpoints.SEARCH_UPCOMING_CS_KW_ENDPOINT?.replace('{callsign}', requestBody.callsign)
            .replace('{search_keyword}', constructKeywords(requestBody.search_keyword)),
        '/search/callsign': endpoints.SEARCH_CS_KW_ENDPOINT?.replace('{callsign}', requestBody.callsign)
            .replace('{search_keyword}', constructKeywords(requestBody.search_keyword)),
        '/search/upcoming_kids': endpoints.SEARCH_UPCOMING_KIDS_ENDPOINT?.replace('{callsign}', requestBody.callsign)
            .replace('{search_keyword}', constructKeywords(requestBody.search_keyword)),
        '/search/cid_keyword': endpoints.SEARCH_CID_KW_ENDPOINT?.replace('{feed_cid}', requestBody.feed_cid)
            .replace('{search_keyword}', constructKeywords(requestBody.search_keyword)),
        '/search/upcoming_cid_keyword': endpoints.SEARCH_UPCOMING_CID_KW_ENDPOINT?.replace('{feed_cid}', requestBody.feed_cid)
            .replace('{search_keyword}', constructKeywords(requestBody.search_keyword)),
        '/search/siblings': endpoints.SEARCH_SIBLING_ENDPOINT?.replace('{callsign}', requestBody.callsign),
        '/search/kids': endpoints.SEARCH_KIDS_ENDPOINT?.replace('{callsign}', requestBody.callsign)
            .replace('{search_keyword}', constructKeywords(requestBody.search_keyword))
    }

    const url = urlMap[requestedPath]

    if (!url) {
        throw new Error(`Unsupported path: ${requestedPath}`)
    }

    try {
        const response = await axios.get(url, { headers: { 'X-PBSAUTH': pbsAuth } })
        return response.data
    } catch (error) {
        console.error("Error fetching data:", error)
        throw error
    }
}
