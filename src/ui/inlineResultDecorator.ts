import * as vscode from 'vscode';
import { HttpResponse, HttpError } from '../http/httpClient';
import { RequestInfo } from '../http/requestBuilder';

export class InlineResultDecorator {
    private static decorationType: vscode.TextEditorDecorationType;
    private static resultCache = new Map<string, string>();

    public static initialize() {
        this.decorationType = vscode.window.createTextEditorDecorationType({
            after: {
                contentText: '',
                color: new vscode.ThemeColor('descriptionForeground'),
                margin: '0 0 0 20px'
            },
            isWholeLine: false
        });

        // 监听编辑器变化，自动更新装饰
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor && editor.document.fileName.endsWith('.api')) {
                this.updateDecorations(editor);
            }
        });

        vscode.workspace.onDidChangeTextDocument((event) => {
            const editor = vscode.window.activeTextEditor;
            if (editor && event.document === editor.document && editor.document.fileName.endsWith('.api')) {
                // 清除缓存的结果，因为文件已被修改
                this.clearResultsForDocument(editor.document.uri.toString());
                this.updateDecorations(editor);
            }
        });
    }

    public static showResult(
        document: vscode.TextDocument,
        lineNumber: number,
        requestInfo: RequestInfo,
        response?: HttpResponse,
        error?: HttpError
    ) {
        console.log(`showResult called with lineNumber: ${lineNumber}`);
        const key = `${document.uri.toString()}:${lineNumber}`;

        if (response) {
            const statusColor = this.getStatusColor(response.status);
            const resultText = `  📡 ${response.status} ${response.statusText} • ${this.formatDuration(response.duration)} • ${this.formatSize(response.size)}`;
            this.resultCache.set(key, resultText);
        } else if (error) {
            const resultText = `  ❌ ${error.message}${error.status ? ` (${error.status})` : ''}`;
            this.resultCache.set(key, resultText);
        }

        // 更新当前活动编辑器的装饰
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document === document) {
            this.updateDecorations(editor);
        }

        // 在文档中插入详细结果
        console.log(`Calling insertDetailedResult with lineNumber: ${lineNumber}`);
        this.insertDetailedResult(document, lineNumber, requestInfo, response, error);
    }

    private static async insertDetailedResult(
        document: vscode.TextDocument,
        requestLineNumber: number,
        requestInfo: RequestInfo,
        response?: HttpResponse,
        error?: HttpError
    ) {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document !== document) return;

        // 找到插入结果的位置（请求结束后）
        const insertPosition = this.findInsertPosition(document, requestLineNumber);
        console.log(`Insert position determined: line ${insertPosition.line + 1} (1-based)`);

        // 检查是否已存在结果，如果存在则替换
        const existingResultRange = this.findExistingResult(document, requestLineNumber);
        if (existingResultRange) {
            console.log(`Existing result range: start line ${existingResultRange.start.line + 1}, end line ${existingResultRange.end.line + 1} (1-based)`);
        } else {
            console.log(`No existing result range found`);
        }

        // 生成结果内容 - 检查插入位置前是否已有空行
        const needsLeadingNewline = this.needsLeadingNewline(document, insertPosition);
        let resultContent = existingResultRange ? '#### Response\n' :
                          needsLeadingNewline ? '\n#### Response\n' : '#### Response\n';

        if (response) {
            resultContent += `HTTP/1.1 ${response.status} ${response.statusText}\n`;

            // 添加重要的响应头
            if (response.headers['content-type']) {
                resultContent += `Content-Type: ${response.headers['content-type']}\n`;
            }
            if (response.headers['content-length']) {
                resultContent += `Content-Length: ${response.headers['content-length']}\n`;
            }

            resultContent += `Date: ${new Date().toISOString()}\n`;
            resultContent += `Duration: ${this.formatDuration(response.duration)}\n`;
            resultContent += `\n`;

            // 添加响应体
            if (response.data) {
                try {
                    let formattedData = typeof response.data === 'string'
                        ? response.data
                        : JSON.stringify(response.data, null, 2);

                    // 如果存在旧的响应，尝试保留其中的注释
                    if (existingResultRange) {
                        formattedData = this.preserveComments(document, existingResultRange, formattedData);
                    }

                    resultContent += formattedData;
                } catch {
                    resultContent += String(response.data);
                }
            }
        } else if (error) {
            resultContent += `ERROR: ${error.message}\n`;
            if (error.status) {
                resultContent += `Status: ${error.status} ${error.statusText || ''}\n`;
            }
            if (error.data) {
                resultContent += `\n${JSON.stringify(error.data, null, 2)}`;
            }
        }

        // 检查是否需要在结尾添加空行以与下一个API保持间距
        const needsTrailingNewline = this.needsTrailingNewline(document, insertPosition);
        resultContent += needsTrailingNewline ? '\n####\n\n' : '\n####\n';

        await editor.edit(editBuilder => {
            if (existingResultRange) {
                console.log(`Replacing existing result at range:`, existingResultRange);
                editBuilder.replace(existingResultRange, resultContent);
            } else {
                console.log(`Inserting new result at position: line ${insertPosition.line + 1} (1-based)`);
                editBuilder.insert(insertPosition, resultContent);
            }
        });
    }

    private static needsLeadingNewline(document: vscode.TextDocument, insertPosition: vscode.Position): boolean {
        // 检查插入位置前一行是否为空行
        if (insertPosition.line === 0) return false;

        const prevLine = document.lineAt(insertPosition.line - 1).text.trim();
        return prevLine !== ''; // 如果前一行不为空，需要添加前导换行
    }

    private static needsTrailingNewline(document: vscode.TextDocument, insertPosition: vscode.Position): boolean {
        // 检查插入位置是否是下一个API定义前
        return insertPosition.line < document.lineCount &&
               document.lineAt(insertPosition.line).text.trim().startsWith('### ');
    }

    private static findInsertPosition(document: vscode.TextDocument, requestLineNumber: number): vscode.Position {
        console.log(`Finding insert position for request at line ${requestLineNumber} (1-based)`);
        // 转换为0-based行号进行文档操作
        const zeroBasedRequestLine = requestLineNumber - 1;

        // 简单策略：从请求行开始向下查找，直到遇到下一个 ### 开头的行
        for (let i = zeroBasedRequestLine + 1; i < document.lineCount; i++) {
            const line = document.lineAt(i).text.trim();
            console.log(`Checking line ${i + 1}: "${line}"`);

            // 如果遇到下一个API定义，在这里插入
            if (line.startsWith('### ')) {
                console.log(`Found next API at line ${i + 1} (1-based), inserting before it`);
                return new vscode.Position(i, 0);
            }
        }

        // 如果没有找到下一个API，在文件末尾插入
        console.log(`No next API found, inserting at end of file`);
        return new vscode.Position(document.lineCount, 0);
    }

    private static findExistingResult(document: vscode.TextDocument, requestLineNumber: number): vscode.Range | null {
        let startLine = -1;
        let endLine = -1;
        // 转换为0-based行号进行文档操作
        const zeroBasedRequestLine = requestLineNumber - 1;

        // 从请求行开始查找，但只在当前请求范围内查找
        for (let i = zeroBasedRequestLine; i < document.lineCount; i++) {
            const line = document.lineAt(i).text.trim();
            console.log(`findExistingResult checking line ${i + 1}: "${line}"`);

            // 如果遇到下一个API定义，且还没找到响应开始，则停止搜索
            if (line.startsWith('### ') && i > zeroBasedRequestLine && startLine === -1) {
                console.log(`Found next API without finding response, stopping search at line ${i + 1}`);
                break;
            }

            if (line.startsWith('#### Response') && startLine === -1) {
                console.log(`Found response start at line ${i + 1}`);
                startLine = i;
            } else if (line === '####' && startLine !== -1) {
                console.log(`Found response end at line ${i + 1}`);
                endLine = i + 1;
                break;
            } else if (line.startsWith('### ') && startLine !== -1) {
                // 遇到下一个请求，结束查找
                console.log(`Found next API after response start, ending search at line ${i + 1}`);
                endLine = i;
                break;
            }
        }

        // 如果找到了开始但没找到结束，且已经到了文档末尾
        if (startLine !== -1 && endLine === -1) {
            endLine = document.lineCount;
        }

        if (startLine !== -1 && endLine !== -1) {
            return new vscode.Range(
                new vscode.Position(startLine, 0),
                new vscode.Position(endLine, 0)
            );
        }

        return null;
    }

    private static updateDecorations(editor: vscode.TextEditor) {
        const decorations: vscode.DecorationOptions[] = [];
        const documentKey = editor.document.uri.toString();

        // 为每个缓存的结果创建装饰
        for (const [key, resultText] of this.resultCache.entries()) {
            if (key.startsWith(documentKey + ':')) {
                const lineNumber = parseInt(key.split(':').pop() || '0');
                if (lineNumber < editor.document.lineCount) {
                    const range = new vscode.Range(lineNumber, 0, lineNumber, 0);
                    decorations.push({
                        range,
                        renderOptions: {
                            after: {
                                contentText: resultText,
                                color: new vscode.ThemeColor('descriptionForeground')
                            }
                        }
                    });
                }
            }
        }

        editor.setDecorations(this.decorationType, decorations);
    }

    private static clearResultsForDocument(documentUri: string) {
        for (const key of this.resultCache.keys()) {
            if (key.startsWith(documentUri + ':')) {
                this.resultCache.delete(key);
            }
        }
    }

    private static getStatusColor(status: number): string {
        if (status >= 200 && status < 300) return '#28a745';
        if (status >= 300 && status < 400) return '#ffc107';
        if (status >= 400 && status < 500) return '#fd7e14';
        return '#dc3545';
    }

    private static formatDuration(ms: number): string {
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    }

    private static formatSize(bytes: number): string {
        if (bytes < 1024) return `${bytes}B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    }

    private static preserveComments(
        document: vscode.TextDocument,
        existingRange: vscode.Range,
        newData: string
    ): string {
        try {
            // 获取现有响应体内容
            const existingContent = document.getText(existingRange);

            // 找到响应体开始的位置（在空行之后）
            const lines = existingContent.split('\n');
            let bodyStartIndex = -1;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line === '' && i > 0) {
                    // 找到空行，下一行开始就是响应体
                    bodyStartIndex = i + 1;
                    break;
                }
            }

            if (bodyStartIndex === -1) {
                return newData; // 没找到响应体，返回新数据
            }

            // 提取现有响应体
            const existingBody = lines.slice(bodyStartIndex, -1).join('\n'); // 排除最后的 ####

            // 解析新的和旧的JSON，合并注释
            return this.mergeJsonWithComments(existingBody, newData);

        } catch (error) {
            console.log('Error preserving comments:', error);
            return newData; // 出错时返回新数据
        }
    }

    private static mergeJsonWithComments(oldJson: string, newJson: string): string {
        try {
            // 简单的策略：如果旧JSON包含注释（//），则尝试保留结构
            if (!oldJson.includes('//')) {
                return newJson; // 旧的没有注释，直接使用新的
            }

            // 解析新的JSON数据（验证格式）
            JSON.parse(newJson);

            // 按行处理旧的JSON，保留注释
            const oldLines = oldJson.split('\n');
            const newLines = newJson.split('\n');
            const result: string[] = [];

            // 创建新数据的键值映射（备用）
            // const newJsonMap = this.flattenJson(newData);

            for (const oldLine of oldLines) {
                const trimmedLine = oldLine.trim();

                if (trimmedLine.includes('//')) {
                    // 这是注释行，保留它
                    result.push(oldLine);
                } else if (trimmedLine.match(/^\s*"[^"]+"\s*:/)) {
                    // 这是属性行，查找对应的新值
                    const keyMatch = trimmedLine.match(/^\s*"([^"]+)"\s*:/);
                    if (keyMatch) {
                        const key = keyMatch[1];
                        const newLine = newLines.find(line => line.includes(`"${key}"`));
                        result.push(newLine || oldLine);
                    } else {
                        result.push(oldLine);
                    }
                } else {
                    // 结构性行（括号、逗号等），从新JSON中查找对应行
                    const correspondingNewLine = newLines.find(line =>
                        line.trim() === trimmedLine ||
                        (trimmedLine.match(/^[\s\{\}\[\],]*$/) && line.trim().match(/^[\s\{\}\[\],]*$/))
                    );
                    result.push(correspondingNewLine || oldLine);
                }
            }

            return result.join('\n');

        } catch (error) {
            console.log('Error merging JSON with comments:', error);
            return newJson; // 出错时返回新JSON
        }
    }

    // private static flattenJson(obj: any, prefix: string = ''): Record<string, any> {
    //     const result: Record<string, any> = {};

    //     for (const key in obj) {
    //         if (obj.hasOwnProperty(key)) {
    //             const fullKey = prefix ? `${prefix}.${key}` : key;

    //             if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
    //                 Object.assign(result, this.flattenJson(obj[key], fullKey));
    //             } else {
    //                 result[fullKey] = obj[key];
    //             }
    //         }
    //     }

    //     return result;
    // }

    public static dispose() {
        if (this.decorationType) {
            this.decorationType.dispose();
        }
        this.resultCache.clear();
    }
}