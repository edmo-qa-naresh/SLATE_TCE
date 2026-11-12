import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const envStagePath = resolve(process.cwd(), '.env.stage');

/** Persist a process ID captured from the authenticated browser's own network response. */
export async function saveOcrProcessId(processId: string, transcriptName: string): Promise<void> {
    if (!/^[\w-]+$/.test(processId)) {
        throw new Error('The captured OCR process ID has an unexpected format.');
    }
    if (!transcriptName.trim() || /[\r\n]/.test(transcriptName)) {
        throw new Error('The selected transcript name is empty or contains an invalid line break.');
    }

    const contents = await readFile(envStagePath, 'utf8');
    const updatedContents = setEnvValue(
        setEnvValue(contents, 'OCR_PROCESS_ID', processId),
        'SLATE_TRANSCRIPT_NAME',
        transcriptName,
    );

    await writeFile(envStagePath, updatedContents, 'utf8');
    process.env.OCR_PROCESS_ID = processId;
    process.env.SLATE_TRANSCRIPT_NAME = transcriptName;
}

/** Read the latest value from disk so it works even if the env file changed during this run. */
export async function readOcrProcessId(): Promise<string | undefined> {
    const contents = await readFile(envStagePath, 'utf8');
    const processIdLine = contents.split(/\r?\n/).find((line) => /^[ \t]*(?:export[ \t]+)?OCR_PROCESS_ID[ \t]*=/.test(line));
    const match = processIdLine?.match(/^[ \t]*(?:export[ \t]+)?OCR_PROCESS_ID[ \t]*=[ \t]*(.*?)[ \t]*$/);
    const value = match?.[1]?.trim().replace(/^(["'])(.*)\1$/, '$2');

    return value || process.env.OCR_PROCESS_ID || undefined;
}

export async function readOcrTranscriptName(): Promise<string | undefined> {
    const contents = await readFile(envStagePath, 'utf8');
    const line = contents.split(/\r?\n/).find((entry) => /^[ \t]*(?:export[ \t]+)?SLATE_TRANSCRIPT_NAME[ \t]*=/.test(entry));
    const rawValue = line?.match(/^[ \t]*(?:export[ \t]+)?SLATE_TRANSCRIPT_NAME[ \t]*=[ \t]*(.*?)[ \t]*$/)?.[1];

    if (!rawValue) {
        return process.env.SLATE_TRANSCRIPT_NAME || undefined;
    }

    const value = rawValue.startsWith('"')
        ? JSON.parse(rawValue) as unknown
        : rawValue.replace(/^(["'])(.*)\1$/, '$2').trim();

    if (typeof value !== 'string') {
        throw new Error('SLATE_TRANSCRIPT_NAME in .env.stage must be a string.');
    }

    return value || process.env.SLATE_TRANSCRIPT_NAME || undefined;
}

function setEnvValue(contents: string, key: string, value: string): string {
    const pattern = new RegExp(`^([ \\t]*(?:export[ \\t]+)?${key}[ \\t]*=[ \\t]*)[^\\r\\n]*$`, 'm');
    if (pattern.test(contents)) {
        return contents.replace(pattern, (_line, prefix: string) => `${prefix}${JSON.stringify(value)}`);
    }

    const lineEnding = contents.includes('\r\n') ? '\r\n' : '\n';
    const separator = contents.endsWith('\n') ? '' : lineEnding;
    return `${contents}${separator}${key}=${JSON.stringify(value)}${lineEnding}`;
}
