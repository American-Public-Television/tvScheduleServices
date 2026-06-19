const AWS = require('aws-sdk')
const axios = require('axios')
const { Octokit } = require('@octokit/rest')
const UglifyJS = require('uglify-js')
const ssm = new AWS.SSM()
const dynamoDb = new AWS.DynamoDB.DocumentClient()
const secretsManager = new AWS.SecretsManager()
const codebuild = new AWS.CodeBuild()

// Fetch environment configuration from SSM
const getSSMEnv = async () => {
    const params = {
        Name: process.env.SSM_STORE,
        WithDecryption: true
    }
    try {
        const response = await ssm.getParameter(params).promise()
        console.info(`SSM Parameter fetched successfully: ${JSON.stringify(response.Parameter)}`)
        return JSON.parse(response.Parameter.Value)
    } catch (error) {
        console.error(`Error fetching SSM parameters: ${error.message}`)
        throw error
    }
}

// Filter duplicates
const removeDuplicates = (data) => {
    const seen = new Set()
    return data.filter(item => {
        if (!item.id) {
            console.warn('Skipping entry with missing ID:', JSON.stringify(item))
            return false
        }
        if (seen.has(item.id)) {
            console.warn(`Duplicate ID detected and removed: ${item.id}`)
            return false
        }
        seen.add(item.id)
        return true
    })
}

// Helper function to deduplicate DynamoDB PutRequest
const removeDuplicatesByRequest = (requests) => {
    const seen = new Set()
    return requests.filter(req => {
        const id = req.PutRequest.Item.id
        if (seen.has(id)) return false
        seen.add(id)
        return true
    })
}

const axiosRetry = async (url, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await axios.get(url)
        } catch (error) {
            console.warn(`Retry ${i + 1} for ${url}: ${error.message}`)
            await new Promise(res => setTimeout(res, delay * (i + 1)))
        }
    }
    throw new Error(`Failed to fetch data from ${url} after ${retries} attempts`)
}

const fetchAndCleanData = async (endpoint, tableName, cleaner) => {
    console.info(`Fetching data from endpoint: ${endpoint}`)
    try {
        const response = await axios.get(endpoint)
        const data = response.data

        // Log the full response to inspect structure
        console.debug(`Raw response data: ${JSON.stringify(data).slice(0, 500)}...`)

        // Validate that 'viewentry' exists and is an array
        if (!data.viewentry) {
            console.warn(`No "viewentry" key found in response from ${endpoint}`)
            return []
        }
        if (!Array.isArray(data.viewentry)) {
            console.warn(`"viewentry" is not an array in response from ${endpoint}`)
            return []
        }

        // Clean and filter out invalid entries
        let cleanedData = data.viewentry
            .map(cleaner)
            .filter(item => item && item.id) // Filter out null or invalid items

        console.info(`Total entries after cleaning: ${cleanedData.length}`)

        // Deduplicate entries before writing
        cleanedData = removeDuplicates(cleanedData)
        console.info(`Total valid unique entries: ${cleanedData.length}`)

        const existingData = await fetchDataFromDynamoDB(tableName)

        const deleteRequests = existingData.map(item => ({
            DeleteRequest: { Key: { id: item.id } }
        }))
        if (deleteRequests.length > 0) {
            console.info(`Deleting ${deleteRequests.length} existing records`)
            await batchWriteToDynamoDB(tableName, deleteRequests)
        }

        const putRequests = cleanedData.map(item => ({
            PutRequest: { Item: item }
        }))

        console.info(`Writing ${putRequests.length} new records`)

        if (putRequests.length > 0) {
            await batchWriteToDynamoDB(tableName, putRequests)
        }

        return cleanedData
    } catch (error) {
        console.error(`Error fetching or processing data from ${endpoint}: ${error.message}`)
        throw error
    }
}

// Generic cleaner for viewentry data
const cleanViewEntry = entry => {
    if (!entry['@unid']) {
        console.warn('Skipping entry without @unid:', JSON.stringify(entry))
        return null // Return null to exclude this entry
    }
    const cleanedItem = { id: entry['@unid'] }
    entry.entrydata.forEach(column => {
        const name = column['@name']
        if (column.datetime) cleanedItem[name] = column.datetime['0']
        else if (column.text) cleanedItem[name] = column.text['0']
    })
    return cleanedItem
}

// Helper function to batch write items to DynamoDB
const batchWriteToDynamoDB = async (tableName, requests) => {
    const chunks = []
    while (requests.length) {
        chunks.push(requests.splice(0, 25)) // DynamoDB batch size limit
    }

    for (const chunk of chunks) {
        const params = {
            RequestItems: {
                [tableName]: chunk
            }
        }
        await dynamoDb.batchWrite(params).promise()
    }
}

// Helper function to retrieve all items from a DynamoDB table
const fetchDataFromDynamoDB = async (tableName) => {
    const params = { TableName: tableName }
    const data = await dynamoDb.scan(params).promise()
    return data.Items
}

const getGitHubToken = async () => {
    try {
        const secretData = await secretsManager.getSecretValue({ SecretId: '/createtv/github_token' }).promise()
        console.info('GitHub token retrieved successfully')
        return JSON.parse(secretData.SecretString).github_token
    } catch (error) {
        console.error(`Error retrieving GitHub token: ${error.message}`)
        throw error
    }
}

const findFileSha = async (owner, repo, path, branch, octokit) => {
    try {
        const response = await octokit.repos.getContent({ owner, repo, path, ref: branch })
        return response.data.sha
    } catch (error) {
        if (error.status === 404) return null
        throw error
    }
}

const updateGitHubFile = async (owner, repo, path, branch, content, sha, octokit) => {
    await octokit.repos.createOrUpdateFileContents({
        owner, repo, path, branch,
        message: 'Update static data for marathons and channels',
        content: Buffer.from(content).toString('base64'),
        sha
    })
}

exports.handler = async () => {
    console.log('Handler started, processing data...')

    try {
        const ssmParams = await getSSMEnv()
        console.info(`SSM Params: ${JSON.stringify(ssmParams)}`)
        const { createtv_endpoints, table_names } = ssmParams

        // Fetch and clean data in parallel
        const [marathonsData, showsData, hostsData, partnersData] = await Promise.all([
            fetchAndCleanData(createtv_endpoints.MARATHONS_ENDPOINT, table_names.MARATHONS_TABLE, cleanViewEntry),
            fetchAndCleanData(createtv_endpoints.SHOWS_ENDPOINT, table_names.SHOWS_TABLE, cleanViewEntry),
            fetchAndCleanData(createtv_endpoints.HOSTS_ENDPOINT, table_names.HOSTS_TABLE, cleanViewEntry),
            fetchAndCleanData(createtv_endpoints.PARTNERS_ENDPOINT, table_names.PARTNERS_TABLE, cleanViewEntry)
        ])

        const fileContent = UglifyJS.minify(`
            export const marathonsStatic = ${JSON.stringify(marathonsData)};
            export const showsStatic = ${JSON.stringify(showsData)};
            export const hostsStatic = ${JSON.stringify(hostsData)};
            export const partnersStatic = ${JSON.stringify(partnersData)};
        `).code

        const githubToken = await getGitHubToken()
        const octokit = new Octokit({ auth: githubToken })

        const owner = '3rendan', repo = 'create2024', path = 'src/assets/static/data.js', branch = process.env.BRANCH
        const sha = await findFileSha(owner, repo, path, branch, octokit)
        await updateGitHubFile(owner, repo, path, branch, fileContent, sha, octokit)

        await codebuild.startBuild({ projectName: process.env.BUILD_PROJECT }).promise()
        return { statusCode: 200, body: JSON.stringify({ message: `File written successfully and ${process.env.BUILD_PROJECT} started.` }) }
    } catch (error) {
        console.error(`Error in Lambda function: ${error.message}`)
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Failed operation details: ${error.message}` })
        }
    }
}
