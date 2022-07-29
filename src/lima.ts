import eat from "mdast-util-from-markdown"
import type { Node } from "unist"
import type {Code} from "mdast"
import { existsSync, promises as fs } from "fs"
import CodeProcessor from "./lib/code-processor"

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

let code = new CodeProcessor;

async function walk(node: Node) {
	if (node.type == "code") {
		await code.process(node as Code)
	} else if ("children" in node && Array.isArray(node.children)) {
		for (let child of node.children) {
			await walk(child)
		}
	}
}
