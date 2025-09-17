import {
    ApiRequest,
    HttpMethod,
    ParsedApiFile,
    ParseResult,
    ParseError,
    SectionType,
    RequestSection
} from './types';

export class ApiParser {

    public parse(content: string): ParseResult {
        try {
            const lines = content.split('\n');
            const requests: ApiRequest[] = [];
            const errors: ParseError[] = [];
            const globalVariables: Record<string, string> = {};

            let currentRequest: Partial<ApiRequest> | null = null;
            let currentSection: SectionType | null = null;
            let currentSectionContent: string[] = [];
            let inGlobalSection = false;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const trimmedLine = line.trim();

                // Skip empty lines and comments (but not ### API definitions)
                if (!trimmedLine || (trimmedLine.startsWith('#') && !trimmedLine.startsWith('###'))) {
                    continue;
                }

                // Skip response sections (#### Response ... ####)
                if (trimmedLine.startsWith('#### Response')) {
                    // 跳过整个响应区域
                    i++;
                    while (i < lines.length) {
                        const responseLine = lines[i].trim();
                        if (responseLine === '####') {
                            break; // 找到响应结束标识，跳出
                        }
                        i++;
                    }
                    continue;
                }

                // API定义行 (### API名称)
                if (trimmedLine.startsWith('###')) {
                    // 保存前一个请求
                    if (currentRequest) {
                        this.finalizeSections(currentRequest, currentSection, currentSectionContent);
                        const validatedRequest = this.validateRequest(currentRequest, i);
                        if (validatedRequest.success && validatedRequest.request) {
                            requests.push(validatedRequest.request);
                        } else if (validatedRequest.errors) {
                            errors.push(...validatedRequest.errors);
                        }
                    } else if (inGlobalSection && currentSection === SectionType.GLOBAL) {
                        // 处理在第一个API定义前的Global section
                        this.parseGlobalVariables(currentSectionContent, globalVariables);
                    }

                    // 开始新请求
                    currentRequest = {
                        name: trimmedLine.substring(3).trim(),
                        lineNumber: i + 1
                    };
                    currentSection = null;
                    currentSectionContent = [];
                    inGlobalSection = false;
                    continue;
                }

                // HTTP方法和URL行
                if (this.isHttpMethodLine(trimmedLine)) {
                    if (!currentRequest) {
                        errors.push({
                            message: 'HTTP method found without API definition',
                            lineNumber: i + 1
                        });
                        continue;
                    }

                    const methodMatch = trimmedLine.match(/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+(.+)$/);
                    if (methodMatch) {
                        currentRequest.method = methodMatch[1] as HttpMethod;
                        currentRequest.url = methodMatch[2].trim();
                    }
                    continue;
                }

                // 节标题行 (Header:, Params:, Global:, etc.)
                if (this.isSectionHeader(trimmedLine)) {
                    // 保存前一个section
                    if (currentRequest && currentSection && !inGlobalSection) {
                        console.log(`Finalizing section ${currentSection} with content:`, currentSectionContent);
                        this.finalizeSections(currentRequest, currentSection, currentSectionContent);
                    } else if (inGlobalSection && currentSection === SectionType.GLOBAL) {
                        // 处理Global section
                        this.parseGlobalVariables(currentSectionContent, globalVariables);
                    }

                    currentSection = this.getSectionType(trimmedLine);
                    inGlobalSection = (currentSection === SectionType.GLOBAL);
                    currentSectionContent = [];
                    console.log(`Starting new section: ${currentSection}`);
                    continue;
                }

                // JSON内容 (Body或Form节的花括号内容)
                if (currentSection && (currentSection === SectionType.BODY || currentSection === SectionType.FORM)) {
                    if (trimmedLine.startsWith('{') || trimmedLine.startsWith('}') ||
                        (currentSectionContent.length > 0 && !trimmedLine.startsWith('###'))) {
                        console.log(`Adding JSON line to ${currentSection}:`, line);
                        currentSectionContent.push(line);
                        continue;
                    }
                }

                // Global节或其他节的缩进内容行
                if (currentSection && (line.startsWith('  ') || inGlobalSection)) {
                    if (inGlobalSection) {
                        currentSectionContent.push(line.trim());
                    } else {
                        currentSectionContent.push(line.substring(2)); // 移除缩进
                    }
                    continue;
                }
            }

            // 处理最后一个请求或Global section
            if (currentRequest) {
                console.log(`Final section ${currentSection} with content:`, currentSectionContent);
                if (!inGlobalSection) {
                    this.finalizeSections(currentRequest, currentSection, currentSectionContent);
                    const validatedRequest = this.validateRequest(currentRequest, lines.length);
                    if (validatedRequest.success && validatedRequest.request) {
                        requests.push(validatedRequest.request);
                    } else if (validatedRequest.errors) {
                        errors.push(...validatedRequest.errors);
                    }
                }
            } else if (inGlobalSection && currentSection === SectionType.GLOBAL) {
                // 处理最后的Global section
                this.parseGlobalVariables(currentSectionContent, globalVariables);
            }

            if (errors.length > 0) {
                return { success: false, errors };
            }

            return {
                success: true,
                data: {
                    requests,
                    variables: this.extractVariables(content),
                    globalVariables
                }
            };

        } catch (error) {
            return {
                success: false,
                errors: [{
                    message: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    lineNumber: 0
                }]
            };
        }
    }

    private isHttpMethodLine(line: string): boolean {
        return /^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+/.test(line);
    }

    private isSectionHeader(line: string): boolean {
        return /^(Header|Params|Path|Body|Form|Global):$/.test(line);
    }

    private getSectionType(line: string): SectionType {
        const type = line.replace(':', '');
        console.log(`Getting section type for: "${type}"`);

        switch (type) {
            case 'Header':
                return SectionType.HEADER;
            case 'Params':
                return SectionType.PARAMS;
            case 'Path':
                return SectionType.PATH;
            case 'Body':
                return SectionType.BODY;
            case 'Form':
                return SectionType.FORM;
            case 'Global':
                return SectionType.GLOBAL;
            default:
                console.log(`Unknown section type: "${type}"`);
                return SectionType.HEADER; // 默认返回
        }
    }

    private finalizeSections(
        request: Partial<ApiRequest>,
        sectionType: SectionType | null,
        content: string[]
    ): void {
        console.log(`finalizeSections called with type: ${sectionType}, content length: ${content.length}`);
        console.log('Content:', content);

        if (!sectionType || content.length === 0) {
            console.log('Skipping section due to empty type or content');
            return;
        }

        const sectionContent = content.join('\n');
        console.log(`Processed section content for ${sectionType}:`, sectionContent);

        switch (sectionType) {
            case SectionType.HEADER:
                request.headers = this.parseHeaders(sectionContent);
                console.log('Set headers:', request.headers);
                break;
            case SectionType.PARAMS:
                request.params = this.parseParams(sectionContent);
                console.log('Set params:', request.params);
                break;
            case SectionType.PATH:
                request.pathParams = this.parseParams(sectionContent);
                console.log('Set pathParams:', request.pathParams);
                break;
            case SectionType.BODY:
                request.body = sectionContent;
                console.log('Set body:', request.body);
                break;
            case SectionType.FORM:
                request.form = sectionContent;
                console.log('Set form:', request.form);
                break;
        }
    }

    private parseHeaders(content: string): Record<string, string> {
        const headers: Record<string, string> = {};
        const lines = content.split('\n');

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            const colonIndex = trimmedLine.indexOf(':');
            if (colonIndex > 0) {
                const key = trimmedLine.substring(0, colonIndex).trim();
                const value = trimmedLine.substring(colonIndex + 1).trim();
                headers[key] = value;
            }
        }

        return headers;
    }

    private parseParams(content: string): Record<string, string> {
        const params: Record<string, string> = {};

        // 处理 key=value&key2=value2 格式
        if (content.includes('=')) {
            const pairs = content.split('&');
            for (const pair of pairs) {
                const [key, value] = pair.split('=', 2);
                if (key && value !== undefined) {
                    params[key.trim()] = value.trim();
                }
            }
        }

        return params;
    }

    private validateRequest(
        request: Partial<ApiRequest>,
        lineNumber: number
    ): { success: boolean; request?: ApiRequest; errors?: ParseError[] } {
        const errors: ParseError[] = [];

        if (!request.name) {
            errors.push({
                message: 'API name is required',
                lineNumber: lineNumber
            });
        }

        if (!request.method) {
            errors.push({
                message: 'HTTP method is required',
                lineNumber: lineNumber
            });
        }

        if (!request.url) {
            errors.push({
                message: 'URL is required',
                lineNumber: lineNumber
            });
        }

        if (errors.length > 0) {
            return { success: false, errors };
        }

        return {
            success: true,
            request: request as ApiRequest
        };
    }

    private extractVariables(content: string): Record<string, string> {
        const variables: Record<string, string> = {};
        const variableRegex = /\{\{([^}]+)\}\}/g;
        let match;

        while ((match = variableRegex.exec(content)) !== null) {
            const varName = match[1].trim();
            if (!variables[varName]) {
                variables[varName] = ''; // 空值，需要用户填充
            }
        }

        return variables;
    }

    public findRequestAtLine(requests: ApiRequest[], lineNumber: number): ApiRequest | null {
        // 找到包含指定行号的请求
        let targetRequest: ApiRequest | null = null;

        for (const request of requests) {
            if (request.lineNumber <= lineNumber) {
                if (!targetRequest || request.lineNumber > targetRequest.lineNumber) {
                    targetRequest = request;
                }
            }
        }

        return targetRequest;
    }

    public extractRequestVariables(request: ApiRequest): Record<string, string> {
        const variables: Record<string, string> = {};

        // 从URL中提取变量
        this.extractVariablesFromText(request.url, variables);

        // 从请求头中提取变量
        if (request.headers) {
            for (const value of Object.values(request.headers)) {
                this.extractVariablesFromText(value, variables);
            }
        }

        // 从请求体中提取变量
        if (request.body) {
            this.extractVariablesFromText(request.body, variables);
        }

        if (request.form) {
            this.extractVariablesFromText(request.form, variables);
        }

        // 从查询参数中提取变量
        if (request.params) {
            for (const value of Object.values(request.params)) {
                this.extractVariablesFromText(value, variables);
            }
        }

        // 从路径参数中提取变量
        if (request.pathParams) {
            for (const value of Object.values(request.pathParams)) {
                this.extractVariablesFromText(value, variables);
            }
        }

        return variables;
    }

    private extractVariablesFromText(text: string, variables: Record<string, string>): void {
        const variableRegex = /\{\{([^}]+)\}\}/g;
        let match;

        while ((match = variableRegex.exec(text)) !== null) {
            const varName = match[1].trim();
            if (!variables[varName]) {
                variables[varName] = ''; // 空值，需要用户填充
            }
        }
    }

    private parseGlobalVariables(content: string[], globalVariables: Record<string, string>): void {
        console.log('Parsing global variables from:', content);

        for (const line of content) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            // 解析 key=value 格式
            const equalIndex = trimmedLine.indexOf('=');
            if (equalIndex > 0) {
                const key = trimmedLine.substring(0, equalIndex).trim();
                const value = trimmedLine.substring(equalIndex + 1).trim();
                globalVariables[key] = value;
                console.log(`Parsed global variable: ${key} = ${value}`);
            }
        }
    }
}