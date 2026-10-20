import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MERMAID = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../node_modules/mermaid/dist/mermaid.min.js');
const BROWSERS = ['chromium-browser', 'chromium', 'google-chrome', 'google-chrome-stable', 'chrome'];

/** @returns {string|undefined} a Chrome or Chromium that can be started, the CHROME environment variable wins */
export function findBrowser() {
	const candidates = process.env.CHROME ? [process.env.CHROME] : BROWSERS;
	const directories = (process.env.PATH ?? '').split(path.delimiter);
	return candidates.find((candidate) => path.isAbsolute(candidate)
		? fs.existsSync(candidate)
		: directories.some((directory) => fs.existsSync(path.join(directory, candidate))));
}

/** @returns {string|undefined} why diagrams can not be checked with mermaid here, nothing if they can */
export function mermaidUnavailable() {
	if (!fs.existsSync(MERMAID)) {
		return 'mermaid is not installed, run `npm install` in the js directory';
	}
	if (typeof WebSocket === 'undefined') {
		return 'this needs Node.js 22 or later, for its WebSocket';
	}
	if (!findBrowser()) {
		return 'there is no Chrome or Chromium, put its path in the CHROME environment variable';
	}
	return undefined;
}

/**
 * Checks diagrams with the real mermaid in a headless Chrome, which starts and stops here.
 *
 * @param {Record<string,string>} diagrams the text of the diagrams, by an id of your choice
 * @param {'parse'|'render'} mode parse only checks the syntax, render also lays out and draws the diagram, which is slow
 * @returns {Promise<Record<string,string|null>>} for each diagram null if it is fine, else what mermaid complains about
 */
export async function checkWithMermaid(diagrams, mode = 'parse') {
	const page = '<!doctype html><meta charset="utf-8"><script src="/mermaid.min.js"></script>';
	const server = http.createServer((request, response) => {
		if (request.url === '/') {
			response.setHeader('content-type', 'text/html');
			response.end(page);
		} else if (request.url === '/mermaid.min.js') {
			response.setHeader('content-type', 'text/javascript');
			response.end(fs.readFileSync(MERMAID));
		} else if (request.url === '/diagrams.json') {
			response.setHeader('content-type', 'application/json');
			response.end(JSON.stringify(diagrams));
		} else {
			response.statusCode = 404;
			response.end();
		}
	});
	await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
	const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sparql-to-mermaid-chrome-'));
	const sandbox = process.getuid?.() === 0 ? ['--no-sandbox'] : []; // as root, in a container for example
	const browser = spawn(findBrowser(), ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
		'--no-first-run', ...sandbox, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
	try {
		const endpoint = await new Promise((resolve, reject) => {
			let output = '';
			const timer = setTimeout(() => reject(new Error('the browser did not start')), 30000);
			browser.stderr.on('data', (data) => {
				output += data;
				const found = /DevTools listening on (ws:\/\/\S+)/.exec(output);
				if (found) {
					clearTimeout(timer);
					resolve(found[1]);
				}
			});
			browser.once('exit', () => reject(new Error('the browser stopped:\n' + output.slice(-500))));
		});
		const socket = new WebSocket(endpoint);
		await new Promise((resolve) => (socket.onopen = resolve));
		let counter = 0;
		const pending = new Map();
		socket.onmessage = (message) => {
			const reply = JSON.parse(message.data);
			pending.get(reply.id)?.(reply);
			pending.delete(reply.id);
		};
		const send = (method, params = {}, sessionId) => new Promise((resolve) => {
			const id = ++counter;
			pending.set(id, resolve);
			socket.send(JSON.stringify({ id, method, params, sessionId }));
		});
		const { result: { targetId } } = await send('Target.createTarget', { url: `http://127.0.0.1:${server.address().port}/` });
		const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });
		await new Promise((resolve) => setTimeout(resolve, 1000));
		const script = `(async () => {
			mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', maxTextSize: 1e7, maxEdges: 1e5 });
			const diagrams = await (await fetch('/diagrams.json')).json();
			const results = {};
			for (const [id, text] of Object.entries(diagrams)) {
				try {
					if (${JSON.stringify(mode)} === 'render') {
						const { svg } = await mermaid.render('diagram' + id.replace(/\\W/g, '_'), text);
						if (/Syntax error in text/.test(svg)) throw new Error('mermaid drew its error diagram');
					} else {
						await mermaid.parse(text);
					}
					results[id] = null;
				} catch (error) {
					results[id] = String((error && (error.str || error.message)) || error).split('\\n').slice(0, 4).join(' | ').slice(0, 300);
				}
			}
			return JSON.stringify(results);
		})()`;
		const reply = await send('Runtime.evaluate', { expression: script, awaitPromise: true, returnByValue: true }, sessionId);
		if (reply.result.exceptionDetails) {
			throw new Error('mermaid could not be run: ' + JSON.stringify(reply.result.exceptionDetails).slice(0, 400));
		}
		socket.close();
		return JSON.parse(reply.result.result.value);
	} finally {
		server.close();
		if (browser.exitCode === null) {
			browser.kill();
			await new Promise((resolve) => browser.once('exit', resolve));
		}
		try {
			fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
		} catch { /* a temporary directory, not worth failing for */ }
	}
}
