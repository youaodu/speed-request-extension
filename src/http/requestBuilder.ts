import { ApiRequest } from '../parser/types';

export interface RequestInfo {
    curl: string;
    rawRequest: string;
    summary: RequestSummary;
}

export interface RequestSummary {
    method: string;
    url: string;
    hasHeaders: boolean;
    hasParams: boolean;
    hasBody: boolean;
    bodyType: 'json' | 'form' | 'text' | 'none';
}

export class RequestBuilder {

    public buildRequestInfo(
        request: ApiRequest,
        variables: Record<string, string> = {}
    ): RequestInfo {
        const processedRequest = this.processVariables(request, variables);

        return {
            curl: this.generateCurl(processedRequest),
            rawRequest: this.generateRawRequest(processedRequest),
            summary: this.generateSummary(processedRequest)
        };
    }

    private processVariables(request: ApiRequest, variables: Record<string, string>): ApiRequest {
        const processed = { ...request };

        // 替换URL中的变量
        processed.url = this.replaceVariables(request.url, variables);

        // 替换请求头中的变量
        if (request.headers) {
            processed.headers = {};
            for (const [key, value] of Object.entries(request.headers)) {
                processed.headers[key] = this.replaceVariables(value, variables);
            }
        }

        // 替换请求体中的变量
        if (request.body) {
            processed.body = this.replaceVariables(request.body, variables);
        }

        if (request.form) {
            processed.form = this.replaceVariables(request.form, variables);
        }

        return processed;
    }

    private replaceVariables(text: string, variables: Record<string, string>): string {
        return text.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
            const trimmedVarName = varName.trim();
            return variables[trimmedVarName] || `[${trimmedVarName}]`; // 显示未设置的变量
        });
    }

    private generateCurl(request: ApiRequest): string {
        let curl = `curl -X ${request.method}`;

        // 添加URL
        curl += ` "${request.url}"`;

        // 添加查询参数
        if (request.params && Object.keys(request.params).length > 0) {
            const params = new URLSearchParams(request.params).toString();
            if (params) {
                const separator = request.url.includes('?') ? '&' : '?';
                curl = curl.replace(request.url, `${request.url}${separator}${params}`);
            }
        }

        // 添加请求头
        if (request.headers) {
            for (const [key, value] of Object.entries(request.headers)) {
                curl += ` \\\n  -H "${key}: ${value}"`;
            }
        }

        // 添加请求体
        if (request.body) {
            const escapedBody = request.body.replace(/"/g, '\\"').replace(/\n/g, '\\n');
            curl += ` \\\n  -d "${escapedBody}"`;
        } else if (request.form) {
            const escapedForm = request.form.replace(/"/g, '\\"').replace(/\n/g, '\\n');
            curl += ` \\\n  -d "${escapedForm}"`;
        }

        return curl;
    }

    private generateRawRequest(request: ApiRequest): string {
        let raw = `${request.method} ${request.url}`;

        // 添加查询参数到URL
        if (request.params && Object.keys(request.params).length > 0) {
            const params = new URLSearchParams(request.params).toString();
            if (params) {
                const separator = request.url.includes('?') ? '&' : '?';
                raw = `${request.method} ${request.url}${separator}${params}`;
            }
        }

        raw += ' HTTP/1.1\\n';

        // 添加Host头（从URL提取）
        try {
            const url = new URL(request.url);
            raw += `Host: ${url.host}\\n`;
        } catch {
            // URL解析失败时跳过Host头
        }

        // 添加请求头
        if (request.headers) {
            for (const [key, value] of Object.entries(request.headers)) {
                raw += `${key}: ${value}\\n`;
            }
        }

        // 如果有请求体，添加Content-Length
        const body = request.body || request.form;
        if (body) {
            if (!request.headers || !Object.keys(request.headers).some(k => k.toLowerCase() === 'content-type')) {
                if (request.body) {
                    raw += 'Content-Type: application/json\\n';
                } else if (request.form) {
                    raw += 'Content-Type: application/x-www-form-urlencoded\\n';
                }
            }
            raw += `Content-Length: ${body.length}\\n`;
        }

        raw += '\\n';

        // 添加请求体
        if (body) {
            raw += body;
        }

        return raw;
    }

    private generateSummary(request: ApiRequest): RequestSummary {
        const hasHeaders = !!(request.headers && Object.keys(request.headers).length > 0);
        const hasParams = !!(request.params && Object.keys(request.params).length > 0);
        const hasBody = !!(request.body || request.form);

        let bodyType: 'json' | 'form' | 'text' | 'none' = 'none';
        if (request.body) {
            try {
                JSON.parse(request.body);
                bodyType = 'json';
            } catch {
                bodyType = 'text';
            }
        } else if (request.form) {
            bodyType = 'form';
        }

        return {
            method: request.method,
            url: request.url,
            hasHeaders,
            hasParams,
            hasBody,
            bodyType
        };
    }

    public static formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    public static formatDuration(ms: number): string {
        if (ms < 1000) {
            return `${ms}ms`;
        } else if (ms < 60000) {
            return `${(ms / 1000).toFixed(2)}s`;
        } else {
            const minutes = Math.floor(ms / 60000);
            const seconds = ((ms % 60000) / 1000).toFixed(0);
            return `${minutes}m ${seconds}s`;
        }
    }
}