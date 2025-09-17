import axios, { AxiosResponse, AxiosError } from 'axios';
import { ApiRequest } from '../parser/types';

export interface HttpResponse {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    data: any;
    duration: number;
    size: number;
}

export interface HttpError {
    message: string;
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
    data?: any;
}

export interface RequestResult {
    success: boolean;
    response?: HttpResponse;
    error?: HttpError;
}

export class HttpClient {
    private timeout: number = 30000; // 30秒超时

    public async sendRequest(
        request: ApiRequest,
        variables: Record<string, string> = {}
    ): Promise<RequestResult> {
        const startTime = Date.now();

        try {
            // 替换变量
            const processedRequest = this.processVariables(request, variables);

            // 构建axios配置
            const config = this.buildAxiosConfig(processedRequest);

            console.log('Sending request with config:', config);

            // 发送请求
            const response: AxiosResponse = await axios(config);
            const endTime = Date.now();

            // 处理响应
            const httpResponse: HttpResponse = {
                status: response.status,
                statusText: response.statusText,
                headers: this.normalizeHeaders(response.headers),
                data: response.data,
                duration: endTime - startTime,
                size: this.calculateResponseSize(response)
            };

            return {
                success: true,
                response: httpResponse
            };

        } catch (error) {
            const endTime = Date.now();
            console.error('Request failed:', error);

            if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError;
                return {
                    success: false,
                    error: {
                        message: axiosError.message,
                        status: axiosError.response?.status,
                        statusText: axiosError.response?.statusText,
                        headers: axiosError.response?.headers ? this.normalizeHeaders(axiosError.response.headers) : undefined,
                        data: axiosError.response?.data
                    }
                };
            } else {
                return {
                    success: false,
                    error: {
                        message: error instanceof Error ? error.message : 'Unknown error occurred'
                    }
                };
            }
        }
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
            return variables[trimmedVarName] || match; // 如果没找到变量值，保持原样
        });
    }

    private buildAxiosConfig(request: ApiRequest): any {
        const config: any = {
            method: request.method.toLowerCase(),
            url: request.url,
            timeout: this.timeout,
            headers: request.headers || {},
            validateStatus: () => true // 接受所有状态码
        };

        // 添加查询参数
        if (request.params && Object.keys(request.params).length > 0) {
            config.params = request.params;
        }

        // 处理请求体
        if (request.body) {
            try {
                console.log('Parsing request body:', request.body);
                // 移除JSON中的注释（支持 // 风格的注释）
                const cleanedBody = this.removeJsonComments(request.body);
                config.data = JSON.parse(cleanedBody);
                config.headers['Content-Type'] = config.headers['Content-Type'] || 'application/json';
                console.log('Body parsed as JSON successfully');
            } catch (error) {
                console.log('Body parsing failed, using as text:', error);
                config.data = request.body;
                config.headers['Content-Type'] = config.headers['Content-Type'] || 'text/plain';
            }
        } else if (request.form) {
            try {
                config.data = JSON.parse(request.form);
                config.headers['Content-Type'] = config.headers['Content-Type'] || 'application/x-www-form-urlencoded';
            } catch {
                config.data = request.form;
                config.headers['Content-Type'] = config.headers['Content-Type'] || 'application/x-www-form-urlencoded';
            }
        }

        return config;
    }

    private normalizeHeaders(headers: any): Record<string, string> {
        const normalized: Record<string, string> = {};
        for (const [key, value] of Object.entries(headers)) {
            normalized[key.toLowerCase()] = String(value);
        }
        return normalized;
    }

    private removeJsonComments(jsonString: string): string {
        // 移除 // 风格的注释
        return jsonString.replace(/\/\/.*$/gm, '').trim();
    }

    private calculateResponseSize(response: AxiosResponse): number {
        const dataSize = response.data ? JSON.stringify(response.data).length : 0;
        const headersSize = Object.entries(response.headers)
            .reduce((size, [key, value]) => size + key.length + String(value).length, 0);
        return dataSize + headersSize;
    }

    public setTimeout(timeout: number): void {
        this.timeout = timeout;
    }
}