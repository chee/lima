import eat from "mdast-util-from-markdown"
import type { Node } from "unist"
import type {Code} from "mdast"
import { createWriteStream, existsSync, promises as fs } from "fs"
import path from "path"
import MetaParser from "./lib/meta-parser"
import mkdir_p from "make-dir"
import home from "untildify"

class NotImplementedError extends Error { }

export function usage(error: Error) {
	if (process.env.DEBUG) {
		process.stdout.write(error.message + "\n")
	}
	process.stdout.write("lima tangle <file>\n")
}

export async function cli(args: string[]) {
	let [command, path] = args
	if (command != "tangle") {
		return usage(new Error("only tangling is supported"))
	}
	
	if (!existsSync(path)) {
		return usage(new Error("source file must exist"))
	}

	let file = await fs.readFile(path)
	let tree = eat(file)
	await walk(tree)
}


function parseMeta(meta: string) {
	let parser = new MetaParser(meta)
	return parser.parse()
}


let filesSeen: string[] = []

async function handleCode(code: Code) {
	if (!code.meta) {
		// i only tangle things with meta
		return
	}
	let meta = parseMeta(code.meta)
	if (meta.filename) {
		let fn = home(meta.filename)
		let isNew = !filesSeen.includes(fn)
		let flags = "a"
		
		if (isNew) {
			filesSeen.push(fn);
			flags = "w"
		}

		if (path.basename(fn) != fn) {
			await mkdir_p(path.dirname(fn))
		}
		
		let stream = createWriteStream(fn, { encoding: "utf-8", flags })
		
		// the shebang must be on the first codeblock for that file
		// FIXME maybe
		if (meta.shebang && isNew) {
			stream.write(meta.shebang + "\n")
		}

		stream.write(code.value + "\n")
		stream.close()

		// TODO get uid and gid for name
		if (meta.chown || meta.chgrp) {
			throw new NotImplementedError("chown and chgrp haven't been implemented");
		}

		if (meta.sudo) {
			throw new NotImplementedError("sudo has not been implemented");
		}

		if (meta.chmod) {
			// TODO support ls-like rwxr-xrwx string
			if (typeof meta.chmod == "string") {
				throw new NotImplementedError("sorry, please provide an octal number like 755 for now")
			} else if (typeof meta.chmod == "number") {
				// node takes strings to be octal, we take the number to be octal.
				fs.chmod(fn, "" + meta.chmod)
			} else {
				throw new TypeError(`chmod should be number or string, got ${meta.chmod}`)
			}
			
		} else if (meta.shebang) {
			fs.chmod(fn, 0o755)
		}
	}
}

async function walk(node: Node) {
	if (node.type == "code") {
		await handleCode(node as Code)
	} else if ("children" in node && Array.isArray(node.children)) {
		await Promise.all(node.children.map(n => walk(n)))
	}
}
