import * as vscode from 'vscode';
import { ApiRequest } from '../parser/types';

export class RequestInfoPanel {
    private static currentPanel: RequestInfoPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];

    public static createOrShow(request: ApiRequest, variables: Record<string, string>, responseContent?: string | null) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (RequestInfoPanel.currentPanel) {
            RequestInfoPanel.currentPanel.panel.reveal(column);
            RequestInfoPanel.currentPanel.update(request, variables, responseContent);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'requestInfo',
            'API Request Info',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        RequestInfoPanel.currentPanel = new RequestInfoPanel(panel, request, variables, responseContent);
    }

    private constructor(panel: vscode.WebviewPanel, request: ApiRequest, variables: Record<string, string>, responseContent?: string | null) {
        this.panel = panel;
        this.update(request, variables, responseContent);

        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    }

    public update(request: ApiRequest, variables: Record<string, string>, responseContent?: string | null) {
        this.panel.title = `API Request: ${request.name}`;
        this.panel.webview.html = this.getWebviewContent(request, variables, responseContent);
    }

    private getWebviewContent(request: ApiRequest, variables: Record<string, string>, responseContent?: string | null): string {
        const formatJson = (jsonString: string | undefined) => {
            if (!jsonString) return '';
            try {
                return JSON.stringify(JSON.parse(jsonString), null, 2);
            } catch {
                return jsonString;
            }
        };

        const formatObject = (obj: Record<string, string> | undefined) => {
            if (!obj || Object.keys(obj).length === 0) return '<em>None</em>';
            return Object.entries(obj)
                .map(([key, value]) => `<div><strong>${key}:</strong> ${value}</div>`)
                .join('');
        };

        const formatVariables = (vars: Record<string, string>) => {
            if (Object.keys(vars).length === 0) return '<em>No variables found</em>';
            return Object.keys(vars)
                .map(varName => `<div><code>{{${varName}}}</code></div>`)
                .join('');
        };

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Request Info</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            line-height: 1.6;
        }
        .section {
            margin-bottom: 25px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 15px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
        }
        .section-title {
            font-size: 1.2em;
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
            margin-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 5px;
        }
        .method {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
            color: white;
            margin-right: 10px;
        }
        .method.GET { background-color: #28a745; }
        .method.POST { background-color: #007bff; }
        .method.PUT { background-color: #ffc107; color: black; }
        .method.DELETE { background-color: #dc3545; }
        .method.PATCH { background-color: #6f42c1; }
        .url {
            font-family: 'Courier New', monospace;
            background-color: var(--vscode-textCodeBlock-background);
            padding: 8px;
            border-radius: 4px;
            word-break: break-all;
        }
        .json-content {
            background-color: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            padding: 10px;
            font-family: 'Courier New', monospace;
            white-space: pre-wrap;
            overflow-x: auto;
        }
        .param-item {
            margin: 5px 0;
            padding: 5px;
            background-color: var(--vscode-input-background);
            border-radius: 3px;
        }
        code {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
        .empty {
            color: var(--vscode-descriptionForeground);
            font-style: italic;
        }
    </style>
</head>
<body>
    <h1>🚀 API Request Information</h1>

    <div class="section">
        <div class="section-title">📋 Basic Info</div>
        <div><strong>Name:</strong> ${request.name}</div>
        <div><strong>Line:</strong> ${request.lineNumber}</div>
        <div style="margin-top: 10px;">
            <span class="method ${request.method}">${request.method}</span>
            <div class="url">${request.url}</div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">📤 Headers</div>
        <div class="param-item">${formatObject(request.headers)}</div>
    </div>

    <div class="section">
        <div class="section-title">🔍 Query Parameters</div>
        <div class="param-item">${formatObject(request.params)}</div>
    </div>

    <div class="section">
        <div class="section-title">🛤️ Path Parameters</div>
        <div class="param-item">${formatObject(request.pathParams)}</div>
    </div>

    ${request.body ? `
    <div class="section">
        <div class="section-title">📦 Request Body</div>
        <div class="json-content">${formatJson(request.body)}</div>
    </div>
    ` : ''}

    ${request.form ? `
    <div class="section">
        <div class="section-title">📝 Form Data</div>
        <div class="json-content">${formatJson(request.form)}</div>
    </div>
    ` : ''}

    <div class="section">
        <div class="section-title">🔧 Variables Found</div>
        <div>${formatVariables(variables)}</div>
    </div>

    ${responseContent ? `
    <div class="section">
        <div class="section-title">📡 Response</div>
        <div class="json-content">${responseContent}</div>
    </div>
    ` : ''}
</body>
</html>`;
    }

    public dispose() {
        RequestInfoPanel.currentPanel = undefined;

        this.panel.dispose();

        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}