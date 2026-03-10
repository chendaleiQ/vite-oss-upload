const colors = require('colors-console')
const {globSync} = require('glob')
const path = require('path')
const fs = require('fs')
const OSS = require('ali-oss')
const {S3Client, PutObjectCommand, HeadObjectCommand} = require('@aws-sdk/client-s3')
const {normalizePath} = require('vite')


const normalizeDistPrefix = (dist) => {
    const normalized = normalizePath(String(dist || ''))
    if (!normalized || normalized === '/') {
        return ''
    }
    const trimmed = normalized.replace(/^\/+|\/+$/g, '')
    return trimmed ? `${trimmed}/` : ''
}

const handleIgnore = (ignore, ssrServer, ssrClient) => {
    // SSR server 模式忽略所有文件
    if (ssrServer) {
        return ['**']
    }

    // 将 ignore 统一转换为数组
    let ignoreList = []
    if (ignore === undefined) {
        ignoreList = []  // 默认上传所有文件，包括 index.html
    } else if (ignore === '') {
        ignoreList = []  // 空字符串表示不忽略任何文件
    } else if (Array.isArray(ignore)) {
        ignoreList = ignore
    } else {
        ignoreList = [ignore]  // 字符串转数组
    }

    // SSR client 模式额外忽略 ssr-manifest.json 和 html
    if (ssrClient) {
        return ['**/ssr-manifest.json', '**/*.html', ...ignoreList]
    }

    return ignoreList
}

const normalizeProvider = (provider) => {
    if (!provider) {
        return 'aliyun'
    }
    const name = String(provider).toLowerCase()
    if (name === 'cos') {
        return 'tencent'
    }
    if (name === 'obs') {
        return 'huawei'
    }
    if (name === 'ctyun' || name === 'tianyi') {
        return 'tianyiyun'
    }
    return name
}

const resolveS3Endpoint = (provider, region, endpoint) => {
    if (endpoint) {
        return endpoint
    }
    if (provider === 'tencent') {
        return `https://cos.${region}.myqcloud.com`
    }
    if (provider === 'huawei') {
        return `https://obs.${region}.myhuaweicloud.com`
    }
    if (provider === 'tianyiyun') {
        return ''
    }
    return ''
}

const toS3PutObjectHeaders = (headers = {}) => {
    const putHeaders = {}
    const metadata = {}
    const unsupported = []

    for (const [key, value] of Object.entries(headers)) {
        const lowerKey = key.toLowerCase()
        if (lowerKey === 'cache-control') {
            putHeaders.CacheControl = value
        } else if (lowerKey === 'content-disposition') {
            putHeaders.ContentDisposition = value
        } else if (lowerKey === 'content-encoding') {
            putHeaders.ContentEncoding = value
        } else if (lowerKey === 'content-language') {
            putHeaders.ContentLanguage = value
        } else if (lowerKey === 'content-type') {
            putHeaders.ContentType = value
        } else if (lowerKey === 'expires') {
            putHeaders.Expires = value
        } else if (lowerKey === 'content-md5') {
            putHeaders.ContentMD5 = value
        } else if (lowerKey.startsWith('x-amz-meta-')) {
            metadata[lowerKey.slice('x-amz-meta-'.length)] = String(value)
        } else {
            unsupported.push(key)
        }
    }

    if (Object.keys(metadata).length > 0) {
        putHeaders.Metadata = metadata
    }

    return {putHeaders, unsupported}
}

const isS3NotFoundError = (error) => {
    const code = error && (error.Code || error.code || error.name)
    const statusCode = error && error.$metadata && error.$metadata.httpStatusCode
    return code === 'NoSuchKey' || code === 'NotFound' || statusCode === 404
}

const createUploader = (options) => {
    const provider = normalizeProvider(options.provider)
    const supportedProviders = ['aliyun', 'tencent', 'huawei', 'tianyiyun']
    if (!supportedProviders.includes(provider)) {
        throw new Error(
            `vite-oss-upload: unsupported provider "${provider}", supported providers: ${supportedProviders.join(', ')}`
        )
    }
    const commonIgnoreKeys = ['dist', 'overwrite', 'ignore', 'headers', 'test', 'enabled', 'provider', 'forcePathStyle']

    if (provider === 'aliyun') {
        const createOssOption = Object.assign({}, options)
        for (const key of commonIgnoreKeys) {
            delete createOssOption[key]
        }
        const client = new OSS(createOssOption)

        return {
            provider,
            async exists(objectKey) {
                try {
                    await client.head(objectKey)
                    return true
                } catch (error) {
                    if (error.code === 'NoSuchKey') {
                        return false
                    }
                    throw error
                }
            },
            async upload(objectKey, fileFullPath, headers, preventOverwrite) {
                const uploadHeaders = preventOverwrite
                    ? Object.assign({}, headers || {}, {'x-oss-forbid-overwrite': true})
                    : (headers || {})
                await client.put(objectKey, fileFullPath, {headers: uploadHeaders})
            }
        }
    }

    const endpoint = resolveS3Endpoint(provider, options.region, options.endpoint)
    if (!endpoint) {
        throw new Error(`vite-oss-upload: provider "${provider}" requires endpoint`)
    }

    const defaultForcePathStyle = true
    const forcePathStyle = options.forcePathStyle === undefined ? defaultForcePathStyle : !!options.forcePathStyle
    const credentials = {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.accessKeySecret
    }
    if (options.stsToken) {
        credentials.sessionToken = options.stsToken
    }

    const s3Client = new S3Client({
        region: options.region,
        endpoint,
        forcePathStyle,
        credentials
    })

    const {putHeaders, unsupported} = toS3PutObjectHeaders(options.headers || {})
    if (unsupported.length > 0) {
        console.log(
            colors(
                'yellow',
                `vite-oss-upload: ignore unsupported S3 headers -> ${unsupported.join(', ')}`
            )
        )
    }

    return {
        provider,
        async exists(objectKey) {
            try {
                await s3Client.send(new HeadObjectCommand({
                    Bucket: options.bucket,
                    Key: objectKey
                }))
                return true
            } catch (error) {
                if (isS3NotFoundError(error)) {
                    return false
                }
                throw error
            }
        },
        async upload(objectKey, fileFullPath, headers, preventOverwrite) {
            const resolvedHeaders = Object.assign({}, putHeaders, toS3PutObjectHeaders(headers || {}).putHeaders)
            if (preventOverwrite) {
                resolvedHeaders.IfNoneMatch = '*'
            }
            await s3Client.send(new PutObjectCommand(Object.assign({
                Bucket: options.bucket,
                Key: objectKey,
                Body: fs.createReadStream(fileFullPath)
            }, resolvedHeaders)))
        }
    }
}

module.exports = function viteOssUpload(options) {
    const distPrefix = normalizeDistPrefix(options.dist)
    let buildConfig = {}
    let buildError = null

    if (options.enabled !== undefined && !options.enabled) {
        return
    }

    return {
        name: 'vite-oss-upload',
        enforce: 'post',
        apply: 'build',
        configResolved(config) {
            buildConfig = config.build
        },

        // 捕获构建错误，防止构建失败时仍然上传不完整的文件到对象存储
        buildEnd(error) {
            buildError = error || null
        },

        closeBundle: {
            sequential: true,
            order: 'post',
            async handler() {
                // 如果构建过程中发生错误，跳过上传，避免上传不完整的文件到对象存储
                if (buildError) {
                    console.log('')
                    console.log(colors('red', 'vite-oss-upload: build failed, skip uploading to object storage'))
                    console.log('')
                    return
                }

                const outDirPath = normalizePath(path.resolve(normalizePath(buildConfig.outDir)))

                const uploader = createUploader(options)
                const ssrClient = buildConfig.ssrManifest
                const ssrServer = buildConfig.ssr

                const files = globSync(`${outDirPath}/**/*`, {
                    nodir: true,
                    dot: true,
                    ignore: handleIgnore(options.ignore, ssrServer, ssrClient)
                })

                console.log('')
                console.log(
                    `vite-oss-upload: upload start [${uploader.provider}]${ssrClient ? ' (ssr client)' : ssrServer ? ' (ssr server)' : ''}`
                )
                console.log('')

                const startTime = new Date().getTime()

                for (const fileFullPath of files) {
                    const filePath = normalizePath(fileFullPath).split(`${outDirPath}/`)[1]

                    const ossFilePath = `${distPrefix}${filePath}`

                    const completePath = ossFilePath

                    const output = `${buildConfig.outDir + '/' + filePath} => ${colors('green', completePath)}`

                    if (options.test) {
                        console.log(`test upload path: ${output}`)
                        continue
                    }

                    if (options.overwrite) {
                        await uploader.upload(ossFilePath, fileFullPath, options.headers || {}, false)
                        console.log(`upload complete: ${output}`)
                    } else {
                        const exists = await uploader.exists(ossFilePath)
                        if (exists) {
                            console.log(`${colors('grey', 'files exists')}: ${output}`)
                        } else {
                            await uploader.upload(ossFilePath, fileFullPath, options.headers || {}, true)
                            console.log(`upload complete: ${output}`)
                        }
                    }
                }

                const duration = (new Date().getTime() - startTime) / 1000

                console.log('')
                console.log(colors('green', `vite-oss-upload: upload complete ^_^, cost ${duration.toFixed(2)}s`))
                console.log('')
            }
        }
    }
}
