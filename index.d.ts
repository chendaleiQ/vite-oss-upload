import type { Plugin } from 'vite'

export interface Options {
  dist: string
  /** Cloud provider type. Default aliyun. Alias: cos -> tencent, obs -> huawei, ctyun/tianyi -> tianyiyun */
  provider?: 'aliyun' | 'tencent' | 'huawei' | 'tianyiyun' | 'cos' | 'obs' | 'ctyun' | 'tianyi'
  /** Object storage region */
  region: string
  /** Access key ID */
  accessKeyId: string
  /** Access key secret */
  accessKeySecret: string
  /** Bucket name */
  bucket: string
  /** If the file already exists, whether to skip upload. Default false */
  overwrite?: boolean
  /** Ignore file rules. If you use empty string `''`, no files will be ignored. Default: upload all files including index.html */
  ignore?: string[] | string
  /** Request headers setting */
  headers?: any
  /** Only test path, no files upload. Default false */
  test?: boolean
  /** Enable vite-oss-upload plugin. Default true */
  enabled?: boolean
  /** Temporary Security Token Service (STS) token */
  stsToken?: string
  /** Endpoint for your object storage bucket. Required when provider is tianyiyun */
  endpoint?: string
  /** For non-Aliyun providers: whether to force path-style endpoint addressing. */
  forcePathStyle?: boolean
  /** Aliyun OSS option: use internal network endpoint */
  internal?: boolean
  /** Aliyun OSS option: access bucket via CNAME */
  cname?: boolean
  /** Aliyun OSS option: enable requester-pays */
  isRequestPay?: boolean
  /** Aliyun OSS option: use HTTPS endpoint */
  secure?: boolean
  /** Request timeout (ms). Default: 60000 */
  timeout?: string | number
}

declare function viteOssUpload(options: Options): Plugin | undefined

export default viteOssUpload
