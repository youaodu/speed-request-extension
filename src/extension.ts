import * as vscode from 'vscode';
import { ApiCodeLensProvider } from './codeLensProvider';
import { ApiParser } from './parser/apiParser';
import { RequestInfoPanel } from './ui/requestInfoPanel';
import { HttpClient } from './http/httpClient';
import { RequestBuilder } from './http/requestBuilder';
import { InlineResultDecorator } from './ui/inlineResultDecorator';
import { VariableManager } from './utils/variableManager';
import { ApiCompletionProvider } from './language/completionProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('Speed Request extension is now active!');

    // 初始化内联结果装饰器
    InlineResultDecorator.initialize();

    // 注册原有命令
    const sendRequestCommand = vscode.commands.registerCommand('speedRequest.sendRequest', async () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor || !activeEditor.document.fileName.endsWith('.api')) {
            vscode.window.showErrorMessage('Please open an .api file');
            return;
        }

        const parser = new ApiParser();
        const parseResult = parser.parse(activeEditor.document.getText());

        if (!parseResult.success || !parseResult.data) {
            vscode.window.showErrorMessage('Failed to parse API file');
            return;
        }

        if (parseResult.data.requests.length === 0) {
            vscode.window.showErrorMessage('No API requests found in file');
            return;
        }

        // 如果有多个请求，让用户选择
        let selectedRequest = parseResult.data.requests[0];
        if (parseResult.data.requests.length > 1) {
            const items = parseResult.data.requests.map(req => ({
                label: req.name,
                description: `${req.method} ${req.url}`,
                request: req
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select an API request to send'
            });

            if (!selected) return;
            selectedRequest = selected.request;
        }

        await sendSingleRequest(selectedRequest, parseResult.data, activeEditor.document, selectedRequest.lineNumber - 1);
    });

    // 注册新的按行发送请求命令
    const sendRequestAtLineCommand = vscode.commands.registerCommand('speedRequest.sendRequestAtLine',
        async (uri: vscode.Uri, lineNumber: number) => {
            const document = await vscode.workspace.openTextDocument(uri);
            if (document) {
                const parser = new ApiParser();
                const parseResult = parser.parse(document.getText());

                console.log('Parse result:', parseResult);
                console.log('Line number:', lineNumber + 1);

                if (parseResult.success && parseResult.data) {
                    const request = parser.findRequestAtLine(parseResult.data.requests, lineNumber + 1);

                    if (request) {
                        // 发送HTTP请求
                        await sendSingleRequest(request, parseResult.data, document, lineNumber + 1);
                    } else {
                        vscode.window.showErrorMessage('No API request found at this line');
                    }
                } else {
                    const errors = parseResult.errors || [];
                    const errorMessage = errors.map(e => `Line ${e.lineNumber}: ${e.message}`).join('\n');
                    vscode.window.showErrorMessage(`Parse errors:\n${errorMessage}`);
                }
            }
        }
    );

    // 注册CodeLens提供器
    const codeLensProvider = new ApiCodeLensProvider();
    const codeLensDisposable = vscode.languages.registerCodeLensProvider(
        { scheme: 'file', language: 'api' },
        codeLensProvider
    );

    // 注册自动完成提供器
    const completionProvider = new ApiCompletionProvider();
    const completionDisposable = vscode.languages.registerCompletionItemProvider(
        { scheme: 'file', language: 'api' },
        completionProvider,
        ' ', ':', '{', '/', '#'  // 触发字符，添加 # 以触发API定义补全
    );

    // 注册显示请求信息命令
    const showRequestInfoCommand = vscode.commands.registerCommand('speedRequest.showRequestInfo',
        async (uri: vscode.Uri, lineNumber: number) => {
            const document = await vscode.workspace.openTextDocument(uri);
            if (document) {
                const parser = new ApiParser();
                const parseResult = parser.parse(document.getText());

                if (parseResult.success && parseResult.data) {
                    const request = parser.findRequestAtLine(parseResult.data.requests, lineNumber + 1);
                    if (request) {
                        // 查找该请求对应的响应内容
                        const responseContent = extractResponseContent(document, lineNumber);
                        RequestInfoPanel.createOrShow(request, parseResult.data.variables, responseContent);
                    } else {
                        vscode.window.showErrorMessage('No API request found at this line');
                    }
                } else {
                    const errors = parseResult.errors || [];
                    const errorMessage = errors.map(e => `Line ${e.lineNumber}: ${e.message}`).join('\n');
                    vscode.window.showErrorMessage(`Parse errors:\n${errorMessage}`);
                }
            }
        }
    );

    context.subscriptions.push(
        sendRequestCommand,
        sendRequestAtLineCommand,
        showRequestInfoCommand,
        codeLensDisposable,
        completionDisposable
    );

    // 提取响应内容的辅助函数
    function extractResponseContent(document: vscode.TextDocument, requestLineNumber: number): string | null {
        let startLine = -1;
        let endLine = -1;

        // 从请求行开始查找响应区域
        for (let i = requestLineNumber; i < document.lineCount; i++) {
            const line = document.lineAt(i).text.trim();

            if (line.startsWith('#### Response') && startLine === -1) {
                startLine = i;
            } else if (line === '####' && startLine !== -1) {
                endLine = i;
                break;
            } else if (line.startsWith('### ') && startLine !== -1) {
                // 遇到下一个请求，结束查找
                endLine = i;
                break;
            }
        }

        // 如果找到了开始但没找到结束，且已经到了文档末尾
        if (startLine !== -1 && endLine === -1) {
            endLine = document.lineCount - 1;
        }

        if (startLine !== -1 && endLine !== -1) {
            const range = new vscode.Range(
                new vscode.Position(startLine, 0),
                new vscode.Position(endLine, 0)
            );
            return document.getText(range);
        }

        return null;
    }

    // 发送单个请求的辅助函数
    async function sendSingleRequest(request: any, allData?: any, document?: vscode.TextDocument, lineNumber?: number) {
        try {
            // 只提取当前请求中的变量
            const parser = new ApiParser();
            const requestVariables = parser.extractRequestVariables(request);

            // 获取全局变量
            const globalVariables = allData?.globalVariables || {};

            // 提示用户输入变量值（考虑全局变量）
            const resolvedVariables = await VariableManager.promptForVariables(requestVariables, globalVariables);

            const requestBuilder = new RequestBuilder();
            const requestInfo = requestBuilder.buildRequestInfo(request, resolvedVariables);

            // 显示加载状态
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Sending ${request.method} request...`,
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 30, message: 'Preparing request...' });

                const httpClient = new HttpClient();
                progress.report({ increment: 30, message: 'Sending request...' });

                const result = await httpClient.sendRequest(request, resolvedVariables);
                progress.report({ increment: 40, message: 'Processing response...' });

                // 显示结果
                if (result.success && result.response) {
                    if (document && lineNumber !== undefined) {
                        InlineResultDecorator.showResult(document, lineNumber, requestInfo, result.response);
                    }
                    vscode.window.showInformationMessage(
                        `Request completed: ${result.response.status} ${result.response.statusText}`
                    );
                } else if (result.error) {
                    if (document && lineNumber !== undefined) {
                        InlineResultDecorator.showResult(document, lineNumber, requestInfo, undefined, result.error);
                    }
                    vscode.window.showErrorMessage(`Request failed: ${result.error.message}`);
                }
            });

        } catch (error) {
            if (error instanceof Error && error.message === 'Variable input cancelled') {
                vscode.window.showInformationMessage('Request cancelled');
            } else {
                vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    }
}

export function deactivate() {
    console.log('Speed Request extension is deactivated!');
    InlineResultDecorator.dispose();
}