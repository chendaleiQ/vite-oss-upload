const colors = require('colors-console')
const {globSync} = require('glob')
const path = require('path')
const OSS = require('ali-oss')
const {normalizePath} = require('vite')


const handleIgnore = (ignore, ssrServer, ssrClient) => {
    // SSR server 模式忽略所有文件
    if (ssrServer) {
        return ['**']
    }

    // 将 ignore 统一转换为数组
    let ignoreList = []
    if (ignore === undefined) {
        ignoreList = ['**/*.html']  // 默认忽略 html 文件
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

module.exports = function vitePluginAliOss(options) {
    let baseConfig = '/'
    let buildConfig = {}
    let buildError = null
    baseConfig = options.dist

    if (options.enabled !== undefined && !options.enabled) {
        return
    }

    return {
        name: 'vite-plugin-ali-oss',
        enforce: 'post',
        apply: 'build',
        configResolved(config) {
            buildConfig = config.build
        },

        // 捕获构建错误，防止构建失败时仍然上传不完整的文件
        buildEnd(error) {
            if (error) {
                buildError = error
            }
        },

        closeBundle: {
            sequential: true,
            order: 'post',
            async handler() {
                // 如果构建过程中发生错误，跳过上传，避免上传不完整的文件到 OSS
                if (buildError) {
                    console.log('')
                    console.log(colors('red', 'Build failed, skip uploading to ali oss'))
                    console.log('')
                    return
                }

                const outDirPath = normalizePath(path.resolve(normalizePath(buildConfig.outDir)))

                const createOssOption = Object.assign({}, options)
                delete createOssOption.dist
                delete createOssOption.overwrite
                delete createOssOption.ignore
                delete createOssOption.headers
                delete createOssOption.test
                delete createOssOption.enabled

                const client = new OSS(createOssOption)
                const ssrClient = buildConfig.ssrManifest
                const ssrServer = buildConfig.ssr

                const files = globSync(`${outDirPath}/**/*`, {
                    nodir: true,
                    dot: true,
                    ignore: handleIgnore(options.ignore, ssrServer, ssrClient)
                })

                console.log('')
                console.log(
                    `ali oss upload start${ssrClient ? ' (ssr client)' : ssrServer ? ' (ssr server)' : ''}`
                )
                console.log('')

                const startTime = new Date().getTime()

                for (const fileFullPath of files) {
                    const filePath = normalizePath(fileFullPath).split(`${outDirPath}/`)[1]

                    const ossFilePath = baseConfig + filePath

                    const completePath = ossFilePath

                    const output = `${buildConfig.outDir + '/' + filePath} => ${colors('green', completePath)}`

                    if (options.test) {
                        console.log(`test upload path: ${output}`)
                        continue
                    }

                    if (options.overwrite) {
                        await client.put(ossFilePath, fileFullPath, {
                            headers: options.headers || {}
                        })
                        console.log(`upload complete: ${output}`)
                    } else {
                        try {
                            await client.head(ossFilePath)
                            console.log(`${colors('grey', 'files exists')}: ${output}`)
                        } catch (error) {
                            if (error.code === 'NoSuchKey') {
                                await client.put(ossFilePath, fileFullPath, {
                                    headers: Object.assign(options.headers || {}, {'x-oss-forbid-overwrite': true})
                                })
                                console.log(`upload complete: ${output}`)
                            } else {
                                throw new Error(error)
                            }
                        }
                    }
                }

                const duration = (new Date().getTime() - startTime) / 1000

                console.log('')
                console.log(colors('green', `ali oss upload complete ^_^, cost ${duration.toFixed(2)}s`))
                console.log('')
            }
        }
    }
}
