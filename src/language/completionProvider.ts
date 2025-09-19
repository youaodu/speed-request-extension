import * as vscode from 'vscode';
import { ApiParser } from '../parser/apiParser';

export class ApiCompletionProvider implements vscode.CompletionItemProvider {

    private httpMethods = [
        { label: 'GET', detail: 'HTTP GET Method', documentation: 'Retrieves data from a specified resource' },
        { label: 'POST', detail: 'HTTP POST Method', documentation: 'Submits data to be processed to a specified resource' },
        { label: 'PUT', detail: 'HTTP PUT Method', documentation: 'Updates a resource or creates it if it doesn\'t exist' },
        { label: 'DELETE', detail: 'HTTP DELETE Method', documentation: 'Deletes a specified resource' },
        { label: 'PATCH', detail: 'HTTP PATCH Method', documentation: 'Applies partial modifications to a resource' },
        { label: 'HEAD', detail: 'HTTP HEAD Method', documentation: 'Same as GET but returns only headers' },
        { label: 'OPTIONS', detail: 'HTTP OPTIONS Method', documentation: 'Returns the HTTP methods that the server supports' }
    ];

    private commonHeaders = [
        { label: 'Authorization', detail: 'Authorization header', documentation: 'Contains credentials for authenticating the user' },
        { label: 'Content-Type', detail: 'Content-Type header', documentation: 'Indicates the media type of the request body' },
        { label: 'Accept', detail: 'Accept header', documentation: 'Tells the server what content types the client can process' },
        { label: 'User-Agent', detail: 'User-Agent header', documentation: 'Identifies the client software' },
        { label: 'Cache-Control', detail: 'Cache-Control header', documentation: 'Directives for caching mechanisms' },
        { label: 'Cookie', detail: 'Cookie header', documentation: 'Contains stored HTTP cookies' },
        { label: 'Referer', detail: 'Referer header', documentation: 'Address of the previous web page' },
        { label: 'X-API-Key', detail: 'API Key header', documentation: 'Custom header for API authentication' }
    ];

    private contentTypes = [
        'application/json',
        'application/xml',
        'application/x-www-form-urlencoded',
        'multipart/form-data',
        'text/plain',
        'text/html',
        'text/xml'
    ];

    private sectionHeaders = [
        { label: 'Global:', detail: 'Global variables section', documentation: 'Define global variables for use across all requests' },
        { label: 'Header:', detail: 'Headers section', documentation: 'Define HTTP headers for the request' },
        { label: 'Params:', detail: 'Query parameters section', documentation: 'Define URL query parameters' },
        { label: 'Path:', detail: 'Path parameters section', documentation: 'Define path variable substitutions' },
        { label: 'Body:', detail: 'Request body section', documentation: 'Define the request body content' },
        { label: 'Form:', detail: 'Form data section', documentation: 'Define form-encoded data for the request' }
    ];

    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {

        const line = document.lineAt(position);
        const lineText = line.text;
        const currentWord = document.getText(document.getWordRangeAtPosition(position));

        // Get current line context
        const linePrefix = lineText.substring(0, position.character);
        const trimmedLine = lineText.trim();

        // 1&2. 组合HTTP方法和区域标识符补全（解决冲突）
        if (this.isHttpMethodPosition(linePrefix, trimmedLine) || this.isSectionHeaderPosition(linePrefix, trimmedLine)) {
            const completions: vscode.CompletionItem[] = [];

            // 添加HTTP方法补全
            if (this.isHttpMethodPosition(linePrefix, trimmedLine)) {
                this.httpMethods.forEach(method => {
                    const item = new vscode.CompletionItem(method.label, vscode.CompletionItemKind.Method);
                    item.detail = method.detail;
                    item.documentation = new vscode.MarkdownString(method.documentation);
                    item.insertText = `${method.label} `;
                    item.sortText = `1_${method.label}`; // 优先显示HTTP方法
                    completions.push(item);
                });
            }

            // 添加区域标识符补全
            if (this.isSectionHeaderPosition(linePrefix, trimmedLine)) {
                this.sectionHeaders.forEach(section => {
                    const item = new vscode.CompletionItem(section.label, vscode.CompletionItemKind.Keyword);
                    item.detail = section.detail;
                    item.documentation = new vscode.MarkdownString(section.documentation);
                    item.sortText = `2_${section.label}`; // 次要显示区域标识符
                    completions.push(item);
                });
            }

            return completions;
        }

        // 3. Header names completion (under Header: section)
        if (this.isHeaderNamePosition(document, position)) {
            return this.commonHeaders.map(header => {
                const item = new vscode.CompletionItem(header.label, vscode.CompletionItemKind.Property);
                item.detail = header.detail;
                item.documentation = new vscode.MarkdownString(header.documentation);
                item.insertText = `${header.label}: `;
                return item;
            });
        }

        // 4. Content-Type values completion
        if (this.isContentTypeValuePosition(lineText)) {
            return this.contentTypes.map(type => {
                const item = new vscode.CompletionItem(type, vscode.CompletionItemKind.Value);
                item.detail = 'Content-Type value';
                return item;
            });
        }

        // 5. Variables completion
        const variables = this.getAvailableVariables(document);
        if (this.isVariablePosition(linePrefix)) {
            return variables.map(variable => {
                const item = new vscode.CompletionItem(variable, vscode.CompletionItemKind.Variable);
                item.detail = 'Available variable';
                item.insertText = `{{${variable}}}`;
                return item;
            });
        }

        // 6. API definition template - 单独检查，不与其他补全冲突
        if (this.isApiDefinitionPosition(linePrefix, trimmedLine)) {
            const completions: vscode.CompletionItem[] = [];

            const item = new vscode.CompletionItem('### API Request', vscode.CompletionItemKind.Snippet);
            item.detail = 'New API request template';
            item.insertText = new vscode.SnippetString('### ${1:API Name}\n${2|GET,POST,PUT,DELETE,PATCH,HEAD,OPTIONS|} ${3:https://api.example.com}\nHeader:\n  ${4:Authorization}: ${5:Bearer token}\n${0}');
            item.documentation = new vscode.MarkdownString('Create a new API request template');
            item.sortText = '0_api_template'; // 最高优先级
            completions.push(item);

            return completions;
        }

        return [];
    }

    private isHttpMethodPosition(linePrefix: string, trimmedLine: string): boolean {
        // 在API定义行下面，或者空行开始，准备输入HTTP方法
        const isLineStart = linePrefix.trim() === '';
        const isNotSectionHeader = !trimmedLine.includes(':');
        const isNotApiDefinition = !trimmedLine.startsWith('###');

        // 如果正在输入类似 "G" 的字符，也应该触发HTTP方法补全
        const startsWithHttpChar = /^[GPDHOP]/i.test(trimmedLine);

        return (isLineStart && isNotSectionHeader && isNotApiDefinition) ||
               (startsWithHttpChar && isNotSectionHeader && isNotApiDefinition);
    }

    private isSectionHeaderPosition(linePrefix: string, trimmedLine: string): boolean {
        // 在行开始，输入可能的区域标识符
        const isLineStart = linePrefix.trim() === '';
        const isNotApiDefinition = !trimmedLine.startsWith('###');
        const isNotCompleteHeader = !trimmedLine.includes(':') || trimmedLine.endsWith(':');

        // 如果正在输入类似 "H" 或 "B" 的字符，也应该触发区域标识符补全
        const startsWithSectionChar = /^[HBPGF]/i.test(trimmedLine);

        return (isLineStart && isNotApiDefinition && isNotCompleteHeader) ||
               (startsWithSectionChar && isNotApiDefinition && !trimmedLine.includes(' '));
    }

    private isHeaderNamePosition(document: vscode.TextDocument, position: vscode.Position): boolean {
        // Check if we're under a Header: section
        for (let i = position.line - 1; i >= 0; i--) {
            const line = document.lineAt(i).text.trim();
            if (line === 'Header:') {
                return true;
            }
            if (line.startsWith('###') || line.endsWith(':')) {
                break;
            }
        }
        return false;
    }

    private isContentTypeValuePosition(lineText: string): boolean {
        // 检查是否在Content-Type:后面需要补全值
        const contentTypeMatch = lineText.match(/Content-Type:\s*/i);
        if (contentTypeMatch) {
            const afterColon = lineText.substring(contentTypeMatch.index! + contentTypeMatch[0].length);
            return afterColon.trim() === '' || !afterColon.includes(' ');
        }
        return false;
    }

    private isVariablePosition(linePrefix: string): boolean {
        return linePrefix.includes('{{') && !linePrefix.includes('}}');
    }

    private isApiDefinitionPosition(linePrefix: string, trimmedLine: string): boolean {
        // API定义位置：正在输入 ### 或者空行

        // 检查是否正在输入API定义标记（允许行开始有空格）
        const isTypingApiDef = trimmedLine === '#' || trimmedLine === '##' || trimmedLine === '###';

        // 或者是空行（可以开始新的API定义）
        const isEmpty = trimmedLine === '';

        // 修复：只要在输入 ### 标记就触发，不需要严格检查行开始
        return isTypingApiDef || isEmpty;
    }

    private getAvailableVariables(document: vscode.TextDocument): string[] {
        const parser = new ApiParser();
        const parseResult = parser.parse(document.getText());

        if (parseResult.success && parseResult.data) {
            return Object.keys(parseResult.data.globalVariables || {});
        }

        return [];
    }
}