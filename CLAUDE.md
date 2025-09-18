# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Speed Request is a VSCode extension for HTTP request testing and API documentation management using `.api` files. It provides syntax highlighting, request execution, and response handling within VSCode.

## Development Commands

### Build and Compilation
- `npm run compile` - Compile TypeScript source code to JavaScript
- `npm run watch` - Watch for changes and auto-compile TypeScript
- `npm run vscode:prepublish` - Prepare for publishing (runs compile)

### Testing and Debugging
- Use F5 in VSCode to launch the extension in a new Extension Development Host window
- Create `.api` files to test the extension functionality
- `test.api` file exists as a sample for testing extension features

### Package Management
- Uses npm for dependency management
- Main dependencies: `axios` for HTTP requests, `@types/vscode` for VSCode API types

## Architecture Overview

### Core Components

1. **Extension Entry Point** (`src/extension.ts`)
   - Main activation/deactivation logic
   - Command registration for `speedRequest.sendRequest`, `speedRequest.sendRequestAtLine`, `speedRequest.showRequestInfo`
   - CodeLens provider registration for `.api` files

2. **API Parser** (`src/parser/`)
   - `apiParser.ts` - Parses `.api` file syntax into structured data
   - `types.ts` - TypeScript interfaces for API requests, responses, and parsing results
   - Supports Global variables, HTTP methods, headers, params, body, and form data

3. **HTTP Client** (`src/http/`)
   - `httpClient.ts` - Handles actual HTTP request execution using axios
   - `requestBuilder.ts` - Builds request configuration from parsed API data

4. **UI Components** (`src/ui/`)
   - `resultPanel.ts` - Displays request results in VSCode panels
   - `requestInfoPanel.ts` - Shows detailed request information
   - `inlineResultDecorator.ts` - Inline result display in editor

5. **Utilities** (`src/utils/`)
   - `variableManager.ts` - Manages variable substitution and user input prompts

6. **Language Support**
   - `codeLensProvider.ts` - Provides CodeLens for executable requests
   - `language-configuration.json` - Language configuration for `.api` files
   - `resources/syntax/api.tmLanguage.json` - Syntax highlighting grammar

### API File Format

The extension parses `.api` files with this syntax:
- `Global:` section for global variables (`key=value`)
- `### Request Name` for request definitions
- HTTP method and URL line (`GET https://example.com`)
- Sections: `Header:`, `Params:`, `Path:`, `Body:`, `Form:`
- Variable interpolation with `{{variableName}}` syntax
- Response recording with `#### Response` blocks

### Key Features

1. **Variable System**: Global variables and template variable substitution
2. **Multiple Request Types**: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
3. **Request Execution**: Direct execution from editor with progress indication
4. **Response Handling**: Automatic response insertion and formatting
5. **CodeLens Integration**: Click-to-execute buttons in editor
6. **Syntax Highlighting**: Custom grammar for `.api` files

### Extension Configuration

- **Activation**: Triggers on `.api` file language detection
- **Commands**: Available in Command Palette and context menus
- **File Association**: `.api` extension mapped to custom language
- **Icons**: Custom icon in `resources/icon.png`

## Development Notes

- TypeScript compilation target: ES2020
- Output directory: `out/`
- VSCode engine requirement: `^1.74.0`
- Extension main entry: `./out/extension.js`
- Uses strict TypeScript compilation with source maps

## Git Commit Rules

- Do NOT include the following lines in commit messages:
  - `🤖 Generated with [Claude Code](https://claude.ai/code)`
  - `Co-Authored-By: Claude <noreply@anthropic.com>`
- Keep commit messages concise and descriptive
- Use conventional commit format when appropriate (e.g., `fix:`, `feat:`, `refactor:`)