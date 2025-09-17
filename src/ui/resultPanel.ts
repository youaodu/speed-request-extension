import * as vscode from 'vscode';
import { HttpResponse, HttpError } from '../http/httpClient';
import { RequestInfo, RequestBuilder } from '../http/requestBuilder';

export class ResultPanel {
    private static currentPanel: ResultPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];

    public static createOrShow(
        requestInfo: RequestInfo,
        response?: HttpResponse,
        error?: HttpError
    ) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (ResultPanel.currentPanel) {
            ResultPanel.currentPanel.panel.reveal(column);
            ResultPanel.currentPanel.update(requestInfo, response, error);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'apiResult',
            'API Response',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        ResultPanel.currentPanel = new ResultPanel(panel, requestInfo, response, error);
    }

    private constructor(
        panel: vscode.WebviewPanel,
        requestInfo: RequestInfo,
        response?: HttpResponse,
        error?: HttpError
    ) {
        this.panel = panel;
        this.update(requestInfo, response, error);

        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    }

    public update(requestInfo: RequestInfo, response?: HttpResponse, error?: HttpError) {
        this.panel.title = `API Response: ${requestInfo.summary.method}`;
        this.panel.webview.html = this.getWebviewContent(requestInfo, response, error);
    }

    private getWebviewContent(requestInfo: RequestInfo, response?: HttpResponse, error?: HttpError): string {
        const formatJson = (data: any) => {
            try {
                return JSON.stringify(data, null, 2);
            } catch {
                return String(data);
            }
        };

        const getStatusColor = (status?: number) => {
            if (!status) return '#dc3545';
            if (status >= 200 && status < 300) return '#28a745';
            if (status >= 300 && status < 400) return '#ffc107';
            if (status >= 400 && status < 500) return '#fd7e14';
            return '#dc3545';
        };

        const responseSection = response ? `
            <div class="section success">
                <div class="section-title">✅ Response</div>
                <div class="status-line">
                    <span class="status-badge" style="background-color: ${getStatusColor(response.status)}">
                        ${response.status} ${response.statusText}
                    </span>
                    <span class="timing">⏱️ ${RequestBuilder.formatDuration(response.duration)}</span>
                    <span class="size">📦 ${RequestBuilder.formatFileSize(response.size)}</span>
                </div>

                <div class="response-headers">
                    <h4>Response Headers</h4>
                    <div class="headers-content">
                        ${Object.entries(response.headers).map(([key, value]) =>
                            `<div><strong>${key}:</strong> ${value}</div>`
                        ).join('')}
                    </div>
                </div>

                <div class="response-body">
                    <h4>Response Body</h4>
                    <pre class="json-content">${formatJson(response.data)}</pre>
                </div>
            </div>
        ` : '';

        const errorSection = error ? `
            <div class="section error">
                <div class="section-title">❌ Error</div>
                <div class="error-message">${error.message}</div>
                ${error.status ? `
                    <div class="status-line">
                        <span class="status-badge" style="background-color: ${getStatusColor(error.status)}">
                            ${error.status} ${error.statusText || 'Error'}
                        </span>
                    </div>
                ` : ''}
                ${error.data ? `
                    <div class="error-body">
                        <h4>Error Details</h4>
                        <pre class="json-content">${formatJson(error.data)}</pre>
                    </div>
                ` : ''}
            </div>
        ` : '';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Response</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            line-height: 1.6;
            margin: 0;
        }

        .section {
            margin-bottom: 25px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 15px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
        }

        .section.success {
            border-left: 4px solid #28a745;
        }

        .section.error {
            border-left: 4px solid #dc3545;
        }

        .section-title {
            font-size: 1.3em;
            font-weight: bold;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .request-summary {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 15px;
        }

        .method-badge {
            padding: 4px 12px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 0.9em;
            color: white;
        }

        .method-GET { background-color: #28a745; }
        .method-POST { background-color: #007bff; }
        .method-PUT { background-color: #ffc107; color: black; }
        .method-DELETE { background-color: #dc3545; }
        .method-PATCH { background-color: #6f42c1; }

        .url-display {
            font-family: 'Courier New', monospace;
            background-color: var(--vscode-textCodeBlock-background);
            padding: 8px 12px;
            border-radius: 4px;
            word-break: break-all;
            flex: 1;
        }

        .status-line {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 15px;
        }

        .status-badge {
            padding: 6px 12px;
            border-radius: 4px;
            font-weight: bold;
            color: white;
        }

        .timing, .size {
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.9em;
        }

        .json-content {
            background-color: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            padding: 15px;
            font-family: 'Courier New', monospace;
            white-space: pre-wrap;
            overflow-x: auto;
            max-height: 400px;
            overflow-y: auto;
        }

        .headers-content {
            background-color: var(--vscode-input-background);
            border-radius: 4px;
            padding: 10px;
            margin-top: 8px;
        }

        .headers-content div {
            margin: 4px 0;
            padding: 2px 0;
        }

        .tabs {
            display: flex;
            border-bottom: 1px solid var(--vscode-panel-border);
            margin-bottom: 15px;
        }

        .tab {
            padding: 8px 16px;
            background: none;
            border: none;
            color: var(--vscode-foreground);
            cursor: pointer;
            border-bottom: 2px solid transparent;
        }

        .tab.active {
            border-bottom-color: var(--vscode-textLink-foreground);
            color: var(--vscode-textLink-foreground);
        }

        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
        }

        .error-message {
            color: #dc3545;
            font-weight: bold;
            margin-bottom: 10px;
            padding: 10px;
            background-color: rgba(220, 53, 69, 0.1);
            border-radius: 4px;
        }

        h4 {
            margin: 15px 0 8px 0;
            color: var(--vscode-textLink-foreground);
        }
    </style>
</head>
<body>
    <div class="section">
        <div class="section-title">🚀 Request Summary</div>
        <div class="request-summary">
            <span class="method-badge method-${requestInfo.summary.method}">${requestInfo.summary.method}</span>
            <div class="url-display">${requestInfo.summary.url}</div>
        </div>

        <div class="tabs">
            <button class="tab active" onclick="showTab('curl')">cURL</button>
            <button class="tab" onclick="showTab('raw')">Raw</button>
        </div>

        <div id="curl" class="tab-content active">
            <pre class="json-content">${requestInfo.curl}</pre>
        </div>

        <div id="raw" class="tab-content">
            <pre class="json-content">${requestInfo.rawRequest}</pre>
        </div>
    </div>

    ${responseSection}
    ${errorSection}

    <script>
        function showTab(tabName) {
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(el => {
                el.classList.remove('active');
            });

            // Remove active from all tabs
            document.querySelectorAll('.tab').forEach(el => {
                el.classList.remove('active');
            });

            // Show selected tab content
            document.getElementById(tabName).classList.add('active');

            // Mark selected tab as active
            event.target.classList.add('active');
        }
    </script>
</body>
</html>`;
    }

    public dispose() {
        ResultPanel.currentPanel = undefined;

        this.panel.dispose();

        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}