import * as vscode from 'vscode';

export class ApiCodeLensProvider implements vscode.CodeLensProvider {

    onDidChangeCodeLenses?: vscode.Event<void>;

    provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.CodeLens[] {
        const codeLenses: vscode.CodeLens[] = [];

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);

            // 检查是否是API定义行（以###开头，但排除响应标识）
            const trimmedText = line.text.trim();
            if (trimmedText.startsWith('###') && !trimmedText.startsWith('####')) {
                const range = new vscode.Range(i, 0, i, line.text.length);

                // 发送请求按钮
                const sendCommand: vscode.Command = {
                    title: "▶ Send Request",
                    command: "speedRequest.sendRequestAtLine",
                    arguments: [document.uri, i]
                };

                // 显示信息按钮
                const infoCommand: vscode.Command = {
                    title: "📋 Show Info",
                    command: "speedRequest.showRequestInfo",
                    arguments: [document.uri, i]
                };

                codeLenses.push(new vscode.CodeLens(range, sendCommand));
                codeLenses.push(new vscode.CodeLens(range, infoCommand));
            }
        }

        return codeLenses;
    }

    resolveCodeLens(codeLens: vscode.CodeLens, token: vscode.CancellationToken): vscode.CodeLens {
        return codeLens;
    }
}