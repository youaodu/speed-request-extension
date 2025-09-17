export interface ApiRequest {
    name: string;
    method: HttpMethod;
    url: string;
    headers?: Record<string, string>;
    params?: Record<string, string>;
    pathParams?: Record<string, string>;
    body?: string;
    form?: string;
    lineNumber: number;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface ParsedApiFile {
    requests: ApiRequest[];
    variables: Record<string, string>;
    globalVariables: Record<string, string>;
}

export interface ParseError {
    message: string;
    lineNumber: number;
    column?: number;
}

export interface ParseResult {
    success: boolean;
    data?: ParsedApiFile;
    errors?: ParseError[];
}

export enum SectionType {
    HEADER = 'Header',
    PARAMS = 'Params',
    PATH = 'Path',
    BODY = 'Body',
    FORM = 'Form',
    GLOBAL = 'Global'
}

export interface RequestSection {
    type: SectionType;
    content: string;
    lineNumber: number;
}