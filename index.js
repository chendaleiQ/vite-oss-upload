const colors = require('colors-console')
const { globSync } = require('glob')
const path = require('path')
const OSS = require('ali-oss')
const { normalizePath } = require('vite')


const handleIgnore = (ignore, ssrServer, ssrClient) => {
  if (ignore === undefined) return ''
  if (ignore) {
    if (ssrClient) {
      return ['**/ssr-manifest.json', '**/*.html', ...ignore]
    }
    if (ssrServer) {
      return ['**']
    }
  }
}

module.exports = function vitePluginAliOss(options) {
  let baseConfig = '/'
  let buildConfig = {}
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

    closeBundle: {
      sequential: true,
      order: 'post',
      async handler() {
        const outDirPath = normalizePath(path.resolve(normalizePath(buildConfig.outDir)))

        const createOssOption = Object.assign({}, options)
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

          const output = `${buildConfig.outDir + filePath} => ${colors('green', completePath)}`

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
                  headers: Object.assign(options.headers || {}, { 'x-oss-forbid-overwrite': true })
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
        console.log(color.green(`ali oss upload complete ^_^, cost ${duration.toFixed(2)}s`))
        console.log('')
      }
    }
  }
}
